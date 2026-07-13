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

const FREE_TRIAL_VERIFICATION_TTL_MS = 30 * 60 * 1000;
const FREE_TRIAL_IDENTITY_LOCK_NAMESPACE = 74_224_303;
const FREE_TRIAL_EMAIL_CODE_MIN_APP_BUILD = 40;

type FreeTrialIdentityLockClient = {
  $queryRaw?: <T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
};
type FreeTrialClaimTx = Pick<
  typeof db,
  | 'freeTrialClaim'
  | 'freeTrialIdentity'
  | 'freeTrialVerification'
  | 'tokenLedger'
>;

type FreeTrialEligibilityReasonCode =
  | 'free_access_ip_blocked'
  | 'free_access_unavailable'
  | 'free_trial_device_used'
  | 'free_trial_unavailable';

export class FreeTrialActivationError extends Error {
  constructor(
    readonly code: 'client_update_required' | 'free_trial_unavailable',
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
  const emailRiskReviewEnabled = runtimeConfig.current.emailRiskReviewEnabled;

  if (!runtimeConfig.current.enabled) {
    throw new FreeTrialActivationError(
      'free_trial_unavailable',
      403,
      'Free trial access is disabled.'
    );
  }

  assertFreeTrialDeliveryCompatible({
    appBuild: input.appBuild,
    deliveryMode: runtimeConfig.current.deliveryMode,
  });
  const deliveryMode = runtimeConfig.current.deliveryMode;

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
      await acquireFreeTrialIdentityLocks(tx, {
        deviceFingerprintHash,
        emailNormalized,
        installationId,
        ipAddress,
      });

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

      const existingVerification = await tx.freeTrialVerification.findFirst({
        where: {
          OR: [{ installationId }, { deviceFingerprintHash }],
        },
        select: {
          canceledAt: true,
          consumedAt: true,
          deviceFingerprintHash: true,
          deliveryMode: true,
          emailNormalized: true,
          expiresAt: true,
          id: true,
          installationId: true,
          licenseId: true,
          redeemCode: {
            select: {
              code: true,
              expiresAt: true,
              id: true,
              status: true,
            },
          },
          tokenAmount: true,
        },
      });

      if (existingVerification) {
        assertFreeTrialDeliveryCompatible({
          appBuild: input.appBuild,
          deliveryMode: existingVerification.deliveryMode,
        });

        if (
          existingVerification.consumedAt ||
          existingVerification.deviceFingerprintHash !== deviceFingerprintHash
        ) {
          throwFreeTrialIdentityUnavailable({
            ipAddress,
            now,
          });
        }

        const canReuseCurrentCode =
          !existingVerification.canceledAt &&
          existingVerification.emailNormalized === emailNormalized &&
          existingVerification.installationId === installationId &&
          existingVerification.expiresAt > now &&
          existingVerification.redeemCode.status === 'available' &&
          (!existingVerification.redeemCode.expiresAt ||
            existingVerification.redeemCode.expiresAt > now);

        if (canReuseCurrentCode) {
          return {
            claimId: null,
            deliveryMode: existingVerification.deliveryMode,
            emailRiskReviewEnabled,
            licenseId: existingVerification.licenseId,
            redeemCode: existingVerification.redeemCode.code,
            tokenAmount: existingVerification.tokenAmount,
          };
        }

        const expiresAt = getFreeTrialVerificationExpiry(now);
        await tx.redeemCode.updateMany({
          where: {
            id: existingVerification.redeemCode.id,
            status: 'available',
          },
          data: {
            status: 'canceled',
          },
        });
        const replacementCode = await tx.redeemCode.create({
          data: {
            code: generateRedeemCode(),
            expiresAt,
            licenseId: existingVerification.licenseId,
            metadata: buildFreeTrialRedeemMetadata({
              deviceFingerprintHash,
              email,
              emailNormalized,
              installationId,
              ipAddress,
              tokenAmount: existingVerification.tokenAmount,
            }),
          },
          select: {
            code: true,
            id: true,
          },
        });

        await tx.license.update({
          where: {
            id: existingVerification.licenseId,
          },
          data: {
            ownerEmail: email,
          },
          select: {
            id: true,
          },
        });
        await tx.freeTrialVerification.update({
          where: {
            id: existingVerification.id,
          },
          data: {
            canceledAt: null,
            deliveryMode: existingVerification.deliveryMode,
            email,
            emailNormalized,
            expiresAt,
            installationId,
            ipAddress,
            redeemCodeId: replacementCode.id,
            tokenAmount: existingVerification.tokenAmount,
          },
          select: {
            id: true,
          },
        });

        return {
          claimId: null,
          deliveryMode: existingVerification.deliveryMode,
          emailRiskReviewEnabled,
          licenseId: existingVerification.licenseId,
          redeemCode: replacementCode.code,
          tokenAmount: existingVerification.tokenAmount,
        };
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
          expiresAt: getFreeTrialVerificationExpiry(now),
          licenseId: license.id,
          metadata: buildFreeTrialRedeemMetadata({
            deviceFingerprintHash,
            email,
            emailNormalized,
            installationId,
            ipAddress,
            tokenAmount,
          }),
        },
        select: {
          id: true,
          code: true,
        },
      });

      await tx.freeTrialVerification.create({
        data: {
          deviceFingerprintHash,
          deliveryMode,
          email,
          emailNormalized,
          expiresAt: getFreeTrialVerificationExpiry(now),
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

      return {
        claimId: null,
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

export async function claimFreeTrialVerification(
  tx: FreeTrialClaimTx,
  input: {
    deviceFingerprintHash: string;
    installationId: string;
    ipAddress: string | null;
    licenseId: string;
    now: Date;
    redeemCodeId: string;
    verification: {
      canceledAt: Date | null;
      consumedAt: Date | null;
      deviceFingerprintHash: string;
      email: string;
      emailNormalized: string;
      expiresAt: Date;
      id: string;
      installationId: string;
      licenseId: string;
      redeemCodeId: string;
      tokenAmount: number;
    };
  }
) {
  const { verification } = input;

  assertFreeTrialVerificationRedeemable({
    deviceFingerprintHash: input.deviceFingerprintHash,
    installationId: input.installationId,
    ipAddress: input.ipAddress,
    licenseId: input.licenseId,
    now: input.now,
    redeemCodeId: input.redeemCodeId,
    verification,
  });

  const identitySignals = buildFreeTrialIdentitySignals({
    deviceFingerprintHash: input.deviceFingerprintHash,
    emailNormalized: verification.emailNormalized,
    installationId: input.installationId,
    ipAddress: input.ipAddress,
  });
  const claim = await tx.freeTrialClaim.create({
    data: {
      deviceFingerprintHash: input.deviceFingerprintHash,
      email: verification.email,
      emailNormalized: verification.emailNormalized,
      installationId: input.installationId,
      ipAddress: input.ipAddress,
      licenseId: verification.licenseId,
      redeemCodeId: input.redeemCodeId,
      tokenAmount: verification.tokenAmount,
    },
    select: {
      deviceFingerprintHash: true,
      id: true,
      installationId: true,
      ipAddress: true,
    },
  });

  await createFreeTrialIdentitySignals(tx, {
    claimId: claim.id,
    signals: identitySignals,
  });
  await tx.tokenLedger.create({
    data: {
      deltaTokens: verification.tokenAmount,
      description: 'Free trial credit',
      idempotencyKey: `free-trial-verification:${verification.id}`,
      licenseId: verification.licenseId,
      metadata: {
        deviceFingerprintHash: input.deviceFingerprintHash,
        email: verification.email,
        emailNormalized: verification.emailNormalized,
        grantedAt: input.now.toISOString(),
        installationId: input.installationId,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        source: 'free_trial',
        verificationId: verification.id,
      } satisfies Prisma.InputJsonObject,
      redeemCodeId: input.redeemCodeId,
      status: 'posted',
      type: 'redeem_credit',
    },
  });
  const consumedVerification = await tx.freeTrialVerification.updateMany({
    where: {
      canceledAt: null,
      consumedAt: null,
      id: verification.id,
      redeemCodeId: input.redeemCodeId,
    },
    data: {
      consumedAt: input.now,
    },
  });

  if (consumedVerification.count !== 1) {
    throwFreeTrialIdentityUnavailable({
      ipAddress: input.ipAddress,
      now: input.now,
    });
  }

  return claim;
}

export function assertFreeTrialVerificationRedeemable(input: {
  deviceFingerprintHash?: string | null;
  installationId: string;
  ipAddress: string | null;
  licenseId: string;
  now: Date;
  redeemCodeId: string;
  verification: {
    canceledAt: Date | null;
    consumedAt: Date | null;
    deviceFingerprintHash: string;
    expiresAt: Date;
    installationId: string;
    licenseId: string;
    redeemCodeId: string;
  };
}) {
  const { verification } = input;

  if (
    !input.deviceFingerprintHash ||
    verification.canceledAt ||
    verification.consumedAt ||
    verification.expiresAt <= input.now ||
    verification.installationId !== input.installationId ||
    verification.deviceFingerprintHash !== input.deviceFingerprintHash ||
    verification.licenseId !== input.licenseId ||
    verification.redeemCodeId !== input.redeemCodeId
  ) {
    throwFreeTrialIdentityUnavailable({
      ipAddress: input.ipAddress,
      now: input.now,
    });
  }
}

export function assertFreeTrialDeliveryCompatible(input: {
  appBuild?: string | null;
  deliveryMode: string;
}) {
  if (
    input.deliveryMode === 'email_code' &&
    !supportsFreeTrialEmailCodeDelivery(input.appBuild)
  ) {
    throw new FreeTrialActivationError(
      'client_update_required',
      426,
      'Update the app to continue email verification.'
    );
  }
}

function supportsFreeTrialEmailCodeDelivery(appBuild?: string | null) {
  const normalized = appBuild?.trim();

  if (!normalized || !/^\d+$/.test(normalized)) {
    return false;
  }

  return Number(normalized) >= FREE_TRIAL_EMAIL_CODE_MIN_APP_BUILD;
}

export async function acquireFreeTrialIdentityLocks(
  tx: FreeTrialIdentityLockClient,
  input: {
    deviceFingerprintHash?: string | null;
    emailNormalized?: string | null;
    installationId?: string | null;
    ipAddress?: string | null;
  }
) {
  if (!tx.$queryRaw) {
    return;
  }

  const lockKeys = [
    input.deviceFingerprintHash
      ? `device:${input.deviceFingerprintHash.trim().toLowerCase()}`
      : null,
    input.emailNormalized
      ? `email:${input.emailNormalized.trim().toLowerCase()}`
      : null,
    input.installationId ? `installation:${input.installationId.trim()}` : null,
    input.ipAddress ? `ip:${input.ipAddress}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .sort();

  for (const lockKey of lockKeys) {
    await tx.$queryRaw`
      WITH lock AS (
        SELECT pg_advisory_xact_lock(
          ${FREE_TRIAL_IDENTITY_LOCK_NAMESPACE}::integer,
          hashtext(${lockKey})::integer
        )
      )
      SELECT true AS "locked"
      FROM lock
    `;
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

function getFreeTrialVerificationExpiry(now: Date) {
  return new Date(now.getTime() + FREE_TRIAL_VERIFICATION_TTL_MS);
}

function buildFreeTrialRedeemMetadata(input: {
  deviceFingerprintHash: string;
  email: string;
  emailNormalized: string;
  installationId: string;
  ipAddress: string | null;
  tokenAmount: number;
}) {
  return {
    deviceFingerprintHash: input.deviceFingerprintHash,
    email: input.email,
    emailNormalized: input.emailNormalized,
    installationId: input.installationId,
    ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    source: 'free_trial',
    tokenAmount: input.tokenAmount,
    verification: 'pending',
  } satisfies Prisma.InputJsonObject;
}
