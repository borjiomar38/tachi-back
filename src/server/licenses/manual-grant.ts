import { db } from '@/server/db';
import {
  zCreateManualLicenseGrantInput,
  zCreateManualLicenseGrantResponse,
} from '@/server/licenses/schema';
import { generateRedeemCode } from '@/server/licenses/utils';
import { logger } from '@/server/logger';

export async function createManualLicenseGrant(
  rawInput: unknown,
  deps: {
    createdByUserId: string;
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info'>;
    now?: Date;
  }
) {
  const input = zCreateManualLicenseGrantInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();

  const result = await dbClient.$transaction(async (tx) => {
    const license = await tx.license.create({
      data: {
        deviceLimit: input.deviceLimit,
        notes: input.notes,
        ownerEmail: input.ownerEmail,
        status: 'pending',
      },
      select: {
        createdAt: true,
        deviceLimit: true,
        id: true,
        key: true,
      },
    });

    const redeemCode = await tx.redeemCode.create({
      data: {
        code: generateRedeemCode(),
        createdByUserId: deps.createdByUserId,
        expiresAt: input.redeemCodeExpiresAt,
        licenseId: license.id,
        metadata: {
          createdByUserId: deps.createdByUserId,
          source: 'manual_grant',
        },
      },
      select: {
        code: true,
      },
    });

    await tx.tokenLedger.create({
      data: {
        deltaTokens: input.tokenAmount,
        description: 'Manual support credit',
        licenseId: license.id,
        metadata: {
          createdByUserId: deps.createdByUserId,
          grantedAt: now.toISOString(),
          source: 'manual_grant',
        },
        redeemCodeId: null,
        status: 'posted',
        type: 'manual_credit',
      },
    });

    return {
      createdAt: license.createdAt,
      deviceLimit: license.deviceLimit,
      licenseId: license.id,
      licenseKey: license.key,
      redeemCode: redeemCode.code,
      tokenAmount: input.tokenAmount,
    };
  });

  log.info({
    createdByUserId: deps.createdByUserId,
    licenseId: result.licenseId,
    scope: 'license',
    tokenAmount: result.tokenAmount,
  });

  return zCreateManualLicenseGrantResponse.parse(result);
}
