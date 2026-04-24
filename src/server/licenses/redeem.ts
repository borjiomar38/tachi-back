import { db } from '@/server/db';
import {
  zRedeemActivationInput,
  zRedeemActivationResponse,
} from '@/server/licenses/schema';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
import { mergeJsonObject, normalizeRedeemCode } from '@/server/licenses/utils';
import { logger } from '@/server/logger';

export class RedeemActivationError extends Error {
  constructor(
    readonly code:
      | 'device_revoked'
      | 'installation_conflict'
      | 'invalid_redeem_code'
      | 'license_unavailable'
      | 'redeem_code_unavailable',
    readonly statusCode: number,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'RedeemActivationError';
  }
}

export async function redeemLicenseToDevice(
  rawInput: unknown,
  deps: {
    clientIp?: string | null;
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info' | 'warn'>;
    now?: Date;
  } = {}
) {
  const input = zRedeemActivationInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();
  const normalizedCode = normalizeRedeemCode(input.redeemCode);

  const result = await dbClient.$transaction(async (tx) => {
    const redeemCode = await tx.redeemCode.findUnique({
      where: { code: normalizedCode },
      select: {
        code: true,
        createdAt: true,
        expiresAt: true,
        id: true,
        metadata: true,
        redeemedAt: true,
        redeemedByDevice: {
          select: {
            id: true,
            installationId: true,
            status: true,
          },
        },
        redeemedByDeviceId: true,
        status: true,
        license: {
          select: {
            activatedAt: true,
            deviceLimit: true,
            id: true,
            key: true,
            status: true,
          },
        },
      },
    });

    if (!redeemCode) {
      throw new RedeemActivationError('invalid_redeem_code', 404);
    }

    if (
      redeemCode.status === 'expired' ||
      redeemCode.status === 'canceled' ||
      (redeemCode.expiresAt && redeemCode.expiresAt <= now)
    ) {
      throw new RedeemActivationError('redeem_code_unavailable', 409);
    }

    if (
      redeemCode.license.status === 'revoked' ||
      redeemCode.license.status === 'expired' ||
      redeemCode.license.status === 'suspended'
    ) {
      throw new RedeemActivationError('license_unavailable', 409);
    }

    const existingDevice = await tx.device.findUnique({
      where: { installationId: input.installationId },
      select: {
        appBuild: true,
        appVersion: true,
        id: true,
        installationId: true,
        lastSeenAt: true,
        locale: true,
        metadata: true,
        platform: true,
        status: true,
      },
    });

    if (
      existingDevice &&
      (existingDevice.status === 'blocked' ||
        existingDevice.status === 'revoked')
    ) {
      throw new RedeemActivationError('device_revoked', 409);
    }

    if (existingDevice) {
      const otherActiveBinding = await tx.licenseDevice.findFirst({
        where: {
          deviceId: existingDevice.id,
          licenseId: {
            not: redeemCode.license.id,
          },
          status: 'active',
        },
        select: {
          id: true,
        },
      });

      if (otherActiveBinding) {
        throw new RedeemActivationError('installation_conflict', 409);
      }
    }

    const device = existingDevice
      ? await tx.device.update({
          where: { id: existingDevice.id },
          data: {
            appBuild: input.appBuild,
            appVersion: input.appVersion,
            lastIpAddress: deps.clientIp ?? undefined,
            lastSeenAt: now,
            locale: input.locale,
            metadata: mergeJsonObject(existingDevice.metadata, {
              buildChannel: input.buildChannel,
              integrityVerdict: input.integrityVerdict,
              lastRedeemedAt: now.toISOString(),
            }),
            platform: input.platform,
            status: 'active',
          },
          select: {
            appBuild: true,
            appVersion: true,
            id: true,
            installationId: true,
            lastSeenAt: true,
            locale: true,
            platform: true,
            status: true,
          },
        })
      : await tx.device.create({
          data: {
            appBuild: input.appBuild,
            appVersion: input.appVersion,
            installationId: input.installationId,
            lastIpAddress: deps.clientIp ?? undefined,
            lastSeenAt: now,
            locale: input.locale,
            metadata: mergeJsonObject(null, {
              buildChannel: input.buildChannel,
              integrityVerdict: input.integrityVerdict,
              lastRedeemedAt: now.toISOString(),
            }),
            platform: input.platform,
            status: 'active',
          },
          select: {
            appBuild: true,
            appVersion: true,
            id: true,
            installationId: true,
            lastSeenAt: true,
            locale: true,
            platform: true,
            status: true,
          },
        });

    const existingBinding = await tx.licenseDevice.findUnique({
      where: {
        licenseId_deviceId: {
          deviceId: device.id,
          licenseId: redeemCode.license.id,
        },
      },
      select: {
        boundAt: true,
        id: true,
        status: true,
      },
    });

    const isExistingActiveBinding = existingBinding?.status === 'active';

    const binding = existingBinding
      ? await tx.licenseDevice.update({
          where: { id: existingBinding.id },
          data: {
            status: 'active',
            unboundAt: null,
          },
          select: {
            boundAt: true,
            id: true,
          },
        })
      : await tx.licenseDevice.create({
          data: {
            deviceId: device.id,
            licenseId: redeemCode.license.id,
            status: 'active',
          },
          select: {
            boundAt: true,
            id: true,
          },
        });

    const updatedRedeemCode = await tx.redeemCode.update({
      where: { id: redeemCode.id },
      data: {
        metadata: mergeJsonObject(redeemCode.metadata, {
          buildChannel: input.buildChannel,
          installationId: input.installationId,
          integrityVerdict: input.integrityVerdict,
          redeemedAt: now.toISOString(),
        }),
        redeemedAt: redeemCode.redeemedAt ?? now,
        redeemedByDeviceId: device.id,
        status: 'redeemed',
      },
      select: {
        code: true,
        redeemedAt: true,
        status: true,
      },
    });

    const updatedLicense = await tx.license.update({
      where: { id: redeemCode.license.id },
      data: {
        activatedAt: redeemCode.license.activatedAt ?? now,
        status: 'active',
      },
      select: {
        activatedAt: true,
        deviceLimit: true,
        id: true,
        key: true,
        status: true,
      },
    });

    const [activeDeviceCount, tokenBalance] = await Promise.all([
      tx.licenseDevice.count({
        where: {
          licenseId: redeemCode.license.id,
          status: 'active',
        },
      }),
      getAvailableLicenseTokenBalance(
        {
          licenseId: redeemCode.license.id,
        },
        {
          dbClient: tx as typeof db,
        }
      ),
    ]);

    return {
      activationStatus: isExistingActiveBinding
        ? ('already_activated' as const)
        : ('activated' as const),
      device: {
        ...device,
        boundAt: binding.boundAt,
      },
      license: {
        ...updatedLicense,
        activeDeviceCount,
        availableTokens: tokenBalance,
      },
      redeemCode: updatedRedeemCode,
    };
  });

  log.info({
    activationStatus: result.activationStatus,
    installationId: input.installationId,
    licenseId: result.license.id,
    redeemCode: normalizedCode,
    scope: 'activation',
  });

  return zRedeemActivationResponse.parse(result);
}

export function isRedeemActivationError(
  error: unknown
): error is RedeemActivationError {
  return error instanceof RedeemActivationError;
}
