import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import {
  FreeAccessIpBlockedError,
  normalizeFreeAccessIpAddress,
} from '@/server/licenses/free-access-ip-block';
import {
  buildFreeTrialIdentitySignals,
  createFreeTrialIdentitySignals,
  ensureFreeTrialClaimDeviceFingerprint,
  ensureFreeTrialIdentitySignals,
  findFreeTrialIdentityConflict,
  throwFreeTrialIdentityUnavailable,
} from '@/server/licenses/free-trial-identity';
import { getFreeTrialRuntimeConfig } from '@/server/licenses/free-trial-settings';
import { generateRedeemCode } from '@/server/licenses/utils';
import {
  zCheckFreeTrialEligibilityInput,
  zCreateFreeTrialMobileSessionInput,
} from '@/server/mobile-auth/schema';

type FreeTrialEligibilityReasonCode =
  | 'free_access_ip_blocked'
  | 'free_access_unavailable'
  | 'free_trial_device_used'
  | 'free_trial_unavailable';

export class FreeTrialActivationError extends Error {
  constructor(
    readonly code: 'free_trial_unavailable',
    readonly statusCode: number,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'FreeTrialActivationError';
  }
}

export async function createFreeTrialRedeemCode(
  rawInput: unknown,
  deps: {
    clientIp?: string | null;
    dbClient?: typeof db;
    now?: Date;
  } = {}
) {
  const input = zCreateFreeTrialMobileSessionInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const now = deps.now ?? new Date();
  const email = input.email.trim();
  const emailNormalized = email.toLowerCase();
  const deviceFingerprintHash = input.deviceFingerprintHash?.trim();
  const installationId = input.installationId.trim();
  const ipAddress = normalizeFreeAccessIpAddress(deps.clientIp);
  const runtimeConfig = await getFreeTrialRuntimeConfig({ dbClient });
  const tokenAmount = runtimeConfig.current.tokenAmount;
  const deliveryMode = runtimeConfig.current.deliveryMode;
  const emailRiskReviewEnabled = runtimeConfig.current.emailRiskReviewEnabled;

  if (!runtimeConfig.current.enabled) {
    throw new FreeTrialActivationError(
      'free_trial_unavailable',
      403,
      'Free trial access is disabled.'
    );
  }

  if (!deviceFingerprintHash) {
    throwFreeTrialIdentityUnavailable({
      ipAddress,
      now,
    });
  }

  const identitySignals = buildFreeTrialIdentitySignals({
    deviceFingerprintHash,
    emailNormalized,
    installationId,
    ipAddress,
  });

  try {
    return await dbClient.$transaction(async (tx) => {
      const existingClaim = await tx.freeTrialClaim.findFirst({
        where: {
          OR: [
            { emailNormalized },
            { installationId },
            ...(ipAddress ? [{ ipAddress }] : []),
            ...(deviceFingerprintHash ? [{ deviceFingerprintHash }] : []),
          ],
        },
        select: {
          deviceFingerprintHash: true,
          emailNormalized: true,
          id: true,
          installationId: true,
          ipAddress: true,
          licenseId: true,
          redeemCode: {
            select: {
              code: true,
            },
          },
          tokenAmount: true,
        },
      });

      if (existingClaim) {
        if (
          existingClaim.emailNormalized === emailNormalized &&
          existingClaim.installationId === installationId
        ) {
          await ensureFreeTrialClaimDeviceFingerprint(tx, {
            claimId: existingClaim.id,
            currentDeviceFingerprintHash: existingClaim.deviceFingerprintHash,
            deviceFingerprintHash,
            ipAddress,
            now,
          });
          await ensureFreeTrialIdentitySignals(tx, {
            claimId: existingClaim.id,
            ipAddress,
            now,
            signals: identitySignals,
          });

          return {
            claimId: existingClaim.id,
            deliveryMode,
            emailRiskReviewEnabled,
            licenseId: existingClaim.licenseId,
            redeemCode: existingClaim.redeemCode.code,
            tokenAmount: existingClaim.tokenAmount,
          };
        }

        throwFreeTrialIdentityUnavailable({
          ipAddress,
          now,
        });
      }

      const identityConflict = await findFreeTrialIdentityConflict(
        tx,
        identitySignals
      );

      if (identityConflict) {
        throwFreeTrialIdentityUnavailable({
          ipAddress,
          now,
        });
      }

      const license = await tx.license.create({
        data: {
          deviceLimit: 1,
          notes: 'Automatically created free trial',
          ownerEmail: email,
          status: 'pending',
        },
        select: {
          id: true,
        },
      });

      const redeemCode = await tx.redeemCode.create({
        data: {
          code: generateRedeemCode(),
          licenseId: license.id,
          metadata: {
            email,
            emailNormalized,
            ...(deviceFingerprintHash ? { deviceFingerprintHash } : {}),
            installationId,
            ...(ipAddress ? { ipAddress } : {}),
            source: 'free_trial',
            tokenAmount,
          } satisfies Prisma.InputJsonObject,
        },
        select: {
          id: true,
          code: true,
        },
      });

      await tx.tokenLedger.create({
        data: {
          deltaTokens: tokenAmount,
          description: 'Free trial credit',
          idempotencyKey: `free-trial:${installationId}:${emailNormalized}`,
          licenseId: license.id,
          metadata: {
            email,
            emailNormalized,
            ...(deviceFingerprintHash ? { deviceFingerprintHash } : {}),
            grantedAt: now.toISOString(),
            installationId,
            ...(ipAddress ? { ipAddress } : {}),
            source: 'free_trial',
          } satisfies Prisma.InputJsonObject,
          redeemCodeId: redeemCode.id,
          status: 'posted',
          type: 'redeem_credit',
        },
      });

      const freeTrialClaim = await tx.freeTrialClaim.create({
        data: {
          email,
          emailNormalized,
          deviceFingerprintHash,
          installationId,
          ipAddress,
          licenseId: license.id,
          redeemCodeId: redeemCode.id,
          tokenAmount,
        },
        select: {
          id: true,
        },
      });

      await createFreeTrialIdentitySignals(tx, {
        claimId: freeTrialClaim.id,
        signals: identitySignals,
      });

      return {
        claimId: freeTrialClaim.id,
        deliveryMode,
        emailRiskReviewEnabled,
        licenseId: license.id,
        redeemCode: redeemCode.code,
        tokenAmount,
      };
    });
  } catch (error) {
    if (error instanceof FreeTrialActivationError) {
      throw error;
    }

    if (error instanceof FreeAccessIpBlockedError) {
      throw error;
    }

    if (isPrismaUniqueConstraintError(error)) {
      throwFreeTrialIdentityUnavailable({
        ipAddress,
        now,
      });
    }

    throw error;
  }
}

export async function checkFreeTrialEligibility(
  rawInput: unknown,
  deps: {
    clientIp?: string | null;
    dbClient?: typeof db;
  } = {}
) {
  const input = zCheckFreeTrialEligibilityInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const installationId = input.installationId.trim();
  const deviceFingerprintHash = input.deviceFingerprintHash?.trim();
  const ipAddress = normalizeFreeAccessIpAddress(deps.clientIp);
  const runtimeConfig = await getFreeTrialRuntimeConfig({ dbClient });

  if (!runtimeConfig.current.enabled) {
    return {
      eligible: false,
      reasonCode:
        'free_trial_unavailable' satisfies FreeTrialEligibilityReasonCode,
    };
  }

  if (!deviceFingerprintHash) {
    return {
      eligible: false,
      reasonCode:
        'free_trial_unavailable' satisfies FreeTrialEligibilityReasonCode,
    };
  }

  const identitySignals = buildFreeTrialIdentitySignals({
    deviceFingerprintHash,
    installationId,
    ipAddress,
  });

  const existingClaim = await dbClient.freeTrialClaim.findFirst({
    where: {
      OR: [
        { installationId },
        ...(ipAddress ? [{ ipAddress }] : []),
        { deviceFingerprintHash },
      ],
    },
    select: {
      deviceFingerprintHash: true,
      id: true,
      installationId: true,
      ipAddress: true,
    },
  });

  if (existingClaim) {
    return {
      eligible: false,
      reasonCode: freeTrialEligibilityReasonFromClaim({
        claim: existingClaim,
        deviceFingerprintHash,
        installationId,
        ipAddress,
      }),
    };
  }

  const identityConflict = await findFreeTrialIdentityConflict(
    dbClient,
    identitySignals
  );

  return {
    eligible: !identityConflict,
    ...(identityConflict
      ? {
          reasonCode:
            freeTrialEligibilityReasonFromIdentityConflict(identityConflict),
        }
      : {}),
  };
}

function freeTrialEligibilityReasonFromClaim(input: {
  claim: {
    deviceFingerprintHash: string | null;
    installationId: string;
    ipAddress: string | null;
  };
  deviceFingerprintHash: string;
  installationId: string;
  ipAddress: string | null;
}): FreeTrialEligibilityReasonCode {
  if (
    input.claim.installationId === input.installationId ||
    input.claim.deviceFingerprintHash === input.deviceFingerprintHash
  ) {
    return 'free_trial_device_used';
  }

  if (input.ipAddress && input.claim.ipAddress === input.ipAddress) {
    return 'free_access_ip_blocked';
  }

  return 'free_access_unavailable';
}

function freeTrialEligibilityReasonFromIdentityConflict(input: {
  kind: string;
}): FreeTrialEligibilityReasonCode {
  switch (input.kind) {
    case 'installation':
    case 'device_fingerprint':
      return 'free_trial_device_used';
    case 'ip_address':
      return 'free_access_ip_blocked';
    default:
      return 'free_access_unavailable';
  }
}

export function isFreeTrialActivationError(
  error: unknown
): error is FreeTrialActivationError {
  return error instanceof FreeTrialActivationError;
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
