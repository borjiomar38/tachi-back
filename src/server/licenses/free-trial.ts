import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { generateRedeemCode } from '@/server/licenses/utils';
import { zCreateFreeTrialMobileSessionInput } from '@/server/mobile-auth/schema';

const FREE_TRIAL_TOKEN_AMOUNT = 100;

export class FreeTrialActivationError extends Error {
  constructor(
    readonly code:
      | 'free_trial_device_used'
      | 'free_trial_email_used'
      | 'free_trial_unavailable',
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
    dbClient?: typeof db;
    now?: Date;
  } = {}
) {
  const input = zCreateFreeTrialMobileSessionInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const now = deps.now ?? new Date();
  const email = input.email.trim();
  const emailNormalized = email.toLowerCase();
  const installationId = input.installationId.trim();

  try {
    return await dbClient.$transaction(async (tx) => {
      const existingClaim = await tx.freeTrialClaim.findFirst({
        where: {
          OR: [{ emailNormalized }, { installationId }],
        },
        select: {
          emailNormalized: true,
          installationId: true,
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

        if (existingClaim.emailNormalized === emailNormalized) {
          throw new FreeTrialActivationError('free_trial_email_used', 409);
        }

        throw new FreeTrialActivationError('free_trial_device_used', 409);
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
            installationId,
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
            grantedAt: now.toISOString(),
            installationId,
            source: 'free_trial',
          } satisfies Prisma.InputJsonObject,
          redeemCodeId: redeemCode.id,
          status: 'posted',
          type: 'redeem_credit',
        },
      });

      await tx.freeTrialClaim.create({
        data: {
          email,
          emailNormalized,
          installationId,
          licenseId: license.id,
          redeemCodeId: redeemCode.id,
          tokenAmount: FREE_TRIAL_TOKEN_AMOUNT,
        },
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

    if (isPrismaUniqueConstraintError(error)) {
      throw new FreeTrialActivationError('free_trial_unavailable', 409);
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
