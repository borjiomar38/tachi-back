import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import {
  FreeAccessIpBlockedError,
  getFreeAccessIpBlock,
  normalizeFreeAccessIpAddress,
} from '@/server/licenses/free-access-ip-block';
import {
  acquireFreeTrialIdentityLocks,
  assertFreeTrialVerificationRedeemable,
  claimFreeTrialVerification,
} from '@/server/licenses/free-trial';
import {
  buildFreeTrialIdentitySignals,
  ensureFreeTrialClaimDeviceFingerprint,
  ensureFreeTrialIdentitySignals,
  findFreeTrialIdentityConflict,
  throwFreeTrialIdentityUnavailable,
} from '@/server/licenses/free-trial-identity';
import {
  zRedeemActivationInput,
  zRedeemActivationResponse,
} from '@/server/licenses/schema';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
import { mergeJsonObject, normalizeRedeemCode } from '@/server/licenses/utils';
import { logger } from '@/server/logger';

const redeemCodeActivationSelect = {
  code: true,
  createdAt: true,
  expiresAt: true,
  freeTrialClaim: {
    select: {
      deviceFingerprintHash: true,
      id: true,
      installationId: true,
      ipAddress: true,
    },
  },
  freeTrialVerification: {
    select: {
      canceledAt: true,
      consumedAt: true,
      deviceFingerprintHash: true,
      email: true,
      emailNormalized: true,
      expiresAt: true,
      id: true,
      installationId: true,
      licenseId: true,
      redeemCodeId: true,
      tokenAmount: true,
    },
  },
  id: true,
  license: {
    select: {
      activatedAt: true,
      deviceLimit: true,
      id: true,
      key: true,
      status: true,
    },
  },
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
} satisfies Prisma.RedeemCodeSelect;

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

type RedeemLicenseToDeviceDeps = {
  clientIp?: string | null;
  dbClient?: typeof db;
  log?: Pick<typeof logger, 'info' | 'warn'>;
  now?: Date;
  userAgent?: string | null;
};

export async function redeemLicenseToDevice(
  rawInput: unknown,
  deps: RedeemLicenseToDeviceDeps = {}
) {
  const result = await redeemLicenseToDeviceWithContext(rawInput, deps);
  return result.activation;
}

export async function redeemLicenseToDeviceWithContext(
  rawInput: unknown,
  deps: RedeemLicenseToDeviceDeps = {}
) {
  const input = zRedeemActivationInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();
  const deviceFingerprintHash = input.deviceFingerprintHash?.trim();
  const normalizedCode = normalizeRedeemCode(input.redeemCode);
  const clientIp = normalizeFreeAccessIpAddress(deps.clientIp);
  const result = await dbClient.$transaction(
    async (tx) => {
      let redeemCode = await tx.redeemCode.findUnique({
        where: { code: normalizedCode },
        select: redeemCodeActivationSelect,
      });

      if (!redeemCode) {
        throw new RedeemActivationError('invalid_redeem_code', 404);
      }

      assertRedeemCodeAvailableForActivation(redeemCode, now);

      const isFreeTrialCode = isFreeTrialRedeemCode(redeemCode.metadata);
      let freeTrialClaim = redeemCode.freeTrialClaim;

      if (isFreeTrialCode) {
        const initialVerification = redeemCode.freeTrialVerification;

        if (!freeTrialClaim && !initialVerification) {
          throw new RedeemActivationError('redeem_code_unavailable', 409);
        }

        await acquireFreeTrialIdentityLocks(tx, {
          deviceFingerprintHash,
          emailNormalized: initialVerification?.emailNormalized,
          installationId: input.installationId,
          ipAddress: clientIp,
        });

        const refreshedRedeemCode = await tx.redeemCode.findUnique({
          where: { id: redeemCode.id },
          select: redeemCodeActivationSelect,
        });

        if (!refreshedRedeemCode) {
          throw new RedeemActivationError('invalid_redeem_code', 404);
        }

        redeemCode = refreshedRedeemCode;
        freeTrialClaim = redeemCode.freeTrialClaim;
        const verification = redeemCode.freeTrialVerification;

        assertRedeemCodeAvailableForActivation(redeemCode, now);

        if (!isFreeTrialRedeemCode(redeemCode.metadata)) {
          throw new RedeemActivationError('redeem_code_unavailable', 409);
        }

        if (!freeTrialClaim && !verification) {
          throw new RedeemActivationError('redeem_code_unavailable', 409);
        }

        if (!freeTrialClaim && verification) {
          assertFreeTrialVerificationRedeemable({
            deviceFingerprintHash,
            installationId: input.installationId,
            ipAddress: clientIp,
            licenseId: redeemCode.license.id,
            now,
            redeemCodeId: redeemCode.id,
            verification,
          });
        }

        const freeAccessIpBlock = await getFreeAccessIpBlock(clientIp, {
          dbClient: tx as unknown as typeof db,
        });

        if (freeAccessIpBlock) {
          throw new FreeAccessIpBlockedError(freeAccessIpBlock);
        }

        if (!deviceFingerprintHash) {
          throwFreeTrialIdentityUnavailable({
            ipAddress: clientIp,
            now,
          });
        }

        if (
          freeTrialClaim &&
          freeTrialClaim.installationId !== input.installationId
        ) {
          throwFreeTrialIdentityUnavailable({
            ipAddress: clientIp,
            now,
          });
        }

        const freeTrialIdentitySignals = buildFreeTrialIdentitySignals({
          deviceFingerprintHash,
          emailNormalized: verification?.emailNormalized,
          installationId: input.installationId,
          ipAddress: clientIp,
        });

        const persistedIdentityConflict = freeTrialClaim
          ? await findFreeTrialIdentityConflict(tx, freeTrialIdentitySignals, {
              excludeClaimId: freeTrialClaim.id,
            })
          : await findFreeTrialIdentityConflict(tx, freeTrialIdentitySignals);

        if (persistedIdentityConflict) {
          throwFreeTrialIdentityUnavailable({
            ipAddress: clientIp,
            now,
          });
        }

        const freeTrialIdentityConflict = await tx.freeTrialClaim.findFirst({
          where: {
            OR: [
              ...(verification
                ? [{ emailNormalized: verification.emailNormalized }]
                : []),
              { installationId: input.installationId },
              ...(clientIp ? [{ ipAddress: clientIp }] : []),
              ...(deviceFingerprintHash ? [{ deviceFingerprintHash }] : []),
            ],
            redeemCodeId: {
              not: redeemCode.id,
            },
          },
          select: {
            id: true,
          },
        });

        if (freeTrialIdentityConflict) {
          throwFreeTrialIdentityUnavailable({
            ipAddress: clientIp,
            now,
          });
        }

        if (freeTrialClaim) {
          await ensureFreeTrialClaimDeviceFingerprint(tx, {
            claimId: freeTrialClaim.id,
            currentDeviceFingerprintHash: freeTrialClaim.deviceFingerprintHash,
            deviceFingerprintHash,
            ipAddress: clientIp,
            now,
          });
          await ensureFreeTrialIdentitySignals(tx, {
            claimId: freeTrialClaim.id,
            ipAddress: clientIp,
            now,
            signals: freeTrialIdentitySignals,
          });
        } else if (verification && deviceFingerprintHash) {
          freeTrialClaim = await claimFreeTrialVerification(tx, {
            deviceFingerprintHash,
            installationId: input.installationId,
            ipAddress: clientIp,
            licenseId: redeemCode.license.id,
            now,
            redeemCodeId: redeemCode.id,
            verification,
          });
        }
      }

      if (
        isFreeTrialCode &&
        redeemCode.redeemedByDevice &&
        redeemCode.redeemedByDevice.installationId !== input.installationId
      ) {
        throwFreeTrialIdentityUnavailable({
          ipAddress: clientIp,
          now,
        });
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

      if (existingDevice) {
        await tx.licenseDevice.updateMany({
          where: {
            deviceId: existingDevice.id,
            licenseId: {
              not: redeemCode.license.id,
            },
            status: 'active',
          },
          data: {
            status: 'released',
            unboundAt: now,
          },
        });

        await tx.mobileSession.updateMany({
          where: {
            deviceId: existingDevice.id,
            licenseId: {
              not: redeemCode.license.id,
            },
            revokedAt: null,
          },
          data: {
            revokedAt: now,
            revokeReason: 'redeem_replaced',
          },
        });
      }

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
          expiresAt: isFreeTrialCode ? null : undefined,
          metadata: mergeJsonObject(redeemCode.metadata, {
            buildChannel: input.buildChannel,
            integrityVerdict: input.integrityVerdict,
            firstRedeemedInstallationId:
              redeemCode.redeemedByDeviceId === null
                ? input.installationId
                : undefined,
            lastRedeemedAt: now.toISOString(),
            lastRedeemedDeviceId: device.id,
            lastRedeemedInstallationId: input.installationId,
          }),
          redeemedAt: redeemCode.redeemedAt ?? now,
          redeemedByDeviceId: redeemCode.redeemedByDeviceId ?? device.id,
          status: 'redeemed',
        },
        select: {
          code: true,
          redeemedAt: true,
          status: true,
        },
      });

      await tx.redeemActivation.upsert({
        where: {
          redeemCodeId_deviceId: {
            deviceId: device.id,
            redeemCodeId: redeemCode.id,
          },
        },
        create: {
          appBuild: input.appBuild,
          appVersion: input.appVersion,
          buildChannel: input.buildChannel,
          deviceId: device.id,
          firstActivatedAt: now,
          installationId: input.installationId,
          lastActivatedAt: now,
          lastIpAddress: deps.clientIp ?? undefined,
          licenseId: redeemCode.license.id,
          locale: input.locale,
          metadata: mergeJsonObject(null, {
            integrityVerdict: input.integrityVerdict,
          }),
          redeemCodeId: redeemCode.id,
          userAgent: deps.userAgent ?? undefined,
        },
        update: {
          activationCount: {
            increment: 1,
          },
          appBuild: input.appBuild,
          appVersion: input.appVersion,
          buildChannel: input.buildChannel,
          installationId: input.installationId,
          lastActivatedAt: now,
          lastIpAddress: deps.clientIp ?? undefined,
          locale: input.locale,
          ...(input.integrityVerdict
            ? {
                metadata: mergeJsonObject(null, {
                  integrityVerdict: input.integrityVerdict,
                }),
              }
            : {}),
          userAgent: deps.userAgent ?? undefined,
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
        freeTrialClaimId: freeTrialClaim?.id ?? null,
      };
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
    }
  );

  log.info({
    activationStatus: result.activationStatus,
    installationId: input.installationId,
    licenseId: result.license.id,
    redeemCode: maskRedeemCodeForLog(normalizedCode),
    scope: 'activation',
  });

  return {
    activation: zRedeemActivationResponse.parse(result),
    freeTrialClaimId: result.freeTrialClaimId,
  };
}

export function isRedeemActivationError(
  error: unknown
): error is RedeemActivationError {
  return error instanceof RedeemActivationError;
}

function isFreeTrialRedeemCode(metadata: unknown) {
  return (
    metadata !== null &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    'source' in metadata &&
    metadata.source === 'free_trial'
  );
}

function assertRedeemCodeAvailableForActivation(
  redeemCode: {
    expiresAt: Date | null;
    license: {
      status: string;
    };
    status: string;
  },
  now: Date
) {
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
}

function maskRedeemCodeForLog(code: string) {
  const normalized = code.trim();

  if (normalized.length <= 8) {
    return '***';
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}
