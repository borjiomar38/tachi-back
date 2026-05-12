import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import {
  FreeAccessIpBlockedError,
  normalizeFreeAccessIpAddress,
} from '@/server/licenses/free-access-ip-block';
import {
  buildFreeTrialIdentitySignals,
  createFreeTrialIdentitySignals,
  findFreeTrialIdentityConflict,
  throwFreeTrialIdentityUnavailable,
} from '@/server/licenses/free-trial-identity';
import { generateRedeemCode } from '@/server/licenses/utils';
import { zCreateFreeTrialMobileSessionInput } from '@/server/mobile-auth/schema';

const FREE_TRIAL_TOKEN_AMOUNT = 100;

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
          installationId: true,
          ipAddress: true,
          redeemCode: {
            select: {
              code: true,
            },
          },
        },
      });

      if (existingClaim) {
        if (
          existingClaim.emailNormalized === emailNormalized &&
          existingClaim.installationId === installationId
        ) {
          return {
            redeemCode: existingClaim.redeemCode.code,
            tokenAmount: FREE_TRIAL_TOKEN_AMOUNT,
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
            tokenAmount: FREE_TRIAL_TOKEN_AMOUNT,
          } satisfies Prisma.InputJsonObject,
        },
        select: {
          id: true,
          code: true,
        },
      });

      await tx.tokenLedger.create({
        data: {
          deltaTokens: FREE_TRIAL_TOKEN_AMOUNT,
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
          tokenAmount: FREE_TRIAL_TOKEN_AMOUNT,
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
        redeemCode: redeemCode.code,
        tokenAmount: FREE_TRIAL_TOKEN_AMOUNT,
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
