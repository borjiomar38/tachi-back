import {
  cancelSubscription,
  updateSubscription,
} from '@lemonsqueezy/lemonsqueezy.js';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { logger } from '@/server/logger';
import { initLemonSqueezy } from '@/server/payments/lemonsqueezy';

export const DEFAULT_MOBILE_UPGRADE_TOKEN_PACK_KEY = 'pro';

const subscriptionOrderSelect = {
  billingPeriodEnd: true,
  billingPeriodStart: true,
  id: true,
  licenseId: true,
  lsSubscriptionId: true,
  payerEmail: true,
  rawPayload: true,
  status: true,
  tokenPack: {
    select: {
      bonusTokenAmount: true,
      id: true,
      key: true,
      lsVariantId: true,
      name: true,
      priceAmountCents: true,
      tokenAmount: true,
    },
  },
  tokenPackId: true,
} as const;

const subscriptionTokenPackSelect = {
  active: true,
  bonusTokenAmount: true,
  currency: true,
  id: true,
  key: true,
  lsVariantId: true,
  name: true,
  priceAmountCents: true,
  tokenAmount: true,
} as const;

export class MobileSubscriptionError extends Error {
  constructor(
    readonly code:
      | 'ls_disabled'
      | 'no_active_subscription'
      | 'subscription_cancel_failed'
      | 'subscription_upgrade_failed'
      | 'subscription_upgrade_unavailable'
      | 'token_pack_not_found'
      | 'token_pack_unavailable',
    readonly statusCode: number,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'MobileSubscriptionError';
  }
}

export async function getMobileLicenseSubscriptionSummary(
  licenseId: string,
  deps: {
    dbClient?: typeof db;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const order = await findLatestSubscriptionOrder(licenseId, { dbClient });

  if (!order?.lsSubscriptionId) {
    return null;
  }

  const attributes = readSubscriptionAttributes(order.rawPayload);
  const status = attributes.status ?? order.status;
  const endsAt = parseNullableDate(attributes.ends_at) ?? null;
  const renewsAt =
    parseNullableDate(attributes.renews_at) ?? order.billingPeriodEnd ?? null;
  const terminalOrCancelled =
    order.status === 'canceled' ||
    status === 'cancelled' ||
    status === 'expired';

  return {
    canCancel: !terminalOrCancelled,
    endsAt,
    planName: order.tokenPack?.name ?? null,
    renewsAt,
    status,
    tokenPackKey: order.tokenPack?.key ?? null,
  };
}

export async function upgradeMobileLicenseSubscription(
  auth: {
    license: {
      id: string;
    };
  },
  input: {
    tokenPackKey?: string;
  } = {},
  deps: {
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info' | 'warn'>;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const targetTokenPackKey =
    input.tokenPackKey?.trim() || DEFAULT_MOBILE_UPGRADE_TOKEN_PACK_KEY;
  const order = await findLatestSubscriptionOrder(auth.license.id, {
    dbClient,
  });

  if (!order?.lsSubscriptionId || !order.tokenPack) {
    throw new MobileSubscriptionError(
      'no_active_subscription',
      404,
      'No active Lemon Squeezy subscription is linked to this license.'
    );
  }

  const attributes = readSubscriptionAttributes(order.rawPayload);
  const currentStatus = attributes.status ?? order.status;
  const terminalOrCancelled =
    order.status === 'canceled' ||
    currentStatus === 'cancelled' ||
    currentStatus === 'expired';

  if (terminalOrCancelled) {
    throw new MobileSubscriptionError(
      'subscription_upgrade_unavailable',
      409,
      'This subscription cannot be upgraded because it is not active.'
    );
  }

  const targetTokenPack = await dbClient.tokenPack.findUnique({
    where: { key: targetTokenPackKey },
    select: subscriptionTokenPackSelect,
  });

  if (!targetTokenPack?.active) {
    throw new MobileSubscriptionError(
      'token_pack_not_found',
      404,
      'The selected upgrade plan is not available.'
    );
  }

  if (!targetTokenPack.lsVariantId) {
    throw new MobileSubscriptionError(
      'token_pack_unavailable',
      409,
      'The selected upgrade plan is not connected to Lemon Squeezy.'
    );
  }

  const targetVariantId = Number(targetTokenPack.lsVariantId);

  if (!Number.isSafeInteger(targetVariantId) || targetVariantId <= 0) {
    throw new MobileSubscriptionError(
      'token_pack_unavailable',
      409,
      'The selected upgrade plan has an invalid Lemon Squeezy variant.'
    );
  }

  const currentTotalTokens = totalTokensForPack(order.tokenPack);
  const targetTotalTokens = totalTokensForPack(targetTokenPack);

  if (
    targetTokenPack.id === order.tokenPack.id ||
    targetTokenPack.priceAmountCents <= order.tokenPack.priceAmountCents ||
    targetTotalTokens <= currentTotalTokens
  ) {
    throw new MobileSubscriptionError(
      'subscription_upgrade_unavailable',
      409,
      'This subscription is already on this plan or a higher plan.'
    );
  }

  try {
    initLemonSqueezy();
  } catch {
    throw new MobileSubscriptionError(
      'ls_disabled',
      503,
      'Lemon Squeezy is not configured for this environment.'
    );
  }

  const { data, error, statusCode } = await updateSubscription(
    order.lsSubscriptionId,
    {
      disableProrations: false,
      invoiceImmediately: true,
      variantId: targetVariantId,
    }
  );

  if (error || !data) {
    log.warn({
      error,
      licenseId: auth.license.id,
      lsStatusCode: statusCode,
      lsSubscriptionId: order.lsSubscriptionId,
      message: 'Failed to upgrade Lemon Squeezy subscription from mobile app',
      scope: 'mobile_subscription',
      targetTokenPackKey,
    });

    throw new MobileSubscriptionError(
      'subscription_upgrade_failed',
      502,
      'Lemon Squeezy did not accept the subscription upgrade.'
    );
  }

  const upgradedAttributes = data.data.attributes;
  const upgradedStatus = String(upgradedAttributes.status ?? '').toLowerCase();

  if (upgradedStatus && !['active', 'on_trial'].includes(upgradedStatus)) {
    log.warn({
      licenseId: auth.license.id,
      lsStatus: upgradedStatus,
      lsSubscriptionId: order.lsSubscriptionId,
      message:
        'Lemon Squeezy subscription upgrade did not return an active subscription',
      scope: 'mobile_subscription',
      targetTokenPackKey,
    });

    throw new MobileSubscriptionError(
      'subscription_upgrade_failed',
      502,
      'Lemon Squeezy did not confirm the subscription upgrade payment.'
    );
  }

  const renewsAt =
    parseNullableDate(upgradedAttributes.renews_at) ?? order.billingPeriodEnd;
  const upgradeCreditKey = buildMobileSubscriptionUpgradeCreditKey({
    currentOrderId: order.id,
    currentPeriodStart: order.billingPeriodStart,
    lsSubscriptionId: order.lsSubscriptionId,
    targetTokenPackKey: targetTokenPack.key,
  });
  const expirationKey = `${upgradeCreditKey}:unused-balance-expiration`;

  const creditResult = await dbClient.$transaction(async (tx) => {
    const existingCreditEntry = await tx.tokenLedger.findUnique({
      where: { idempotencyKey: upgradeCreditKey },
      select: { id: true },
    });

    const currentBalance = await getAvailableLicenseTokenBalanceForDbClient(
      tx,
      auth.license.id
    );
    const protectedCommittedTokens =
      await getActiveCommittedJobTokensForDbClient(tx, {
        licenseId: auth.license.id,
        resetAt: order.billingPeriodStart ?? new Date(),
      });
    const consumedCurrentPlanTokens = Math.min(
      currentTotalTokens,
      Math.max(0, currentTotalTokens - currentBalance)
    );
    const expiredTokens = Math.max(
      0,
      currentBalance - protectedCommittedTokens
    );
    const creditedTokens = Math.max(
      0,
      targetTotalTokens - consumedCurrentPlanTokens
    );
    const redeemCode = await tx.redeemCode.findFirst({
      where: {
        licenseId: auth.license.id,
        status: {
          in: ['available', 'redeemed'],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
      },
    });
    const ledgerMetadata = {
      consumedCurrentPlanTokens,
      currentBalanceBeforeUpgrade: currentBalance,
      currentTokenPackKey: order.tokenPack!.key,
      lsSubscriptionId: order.lsSubscriptionId,
      protectedCommittedTokens,
      source: 'mobile_subscription_upgrade',
      targetTokenPackKey: targetTokenPack.key,
      targetTotalTokens,
    } satisfies Prisma.InputJsonObject;

    if (!existingCreditEntry && expiredTokens > 0) {
      await tx.tokenLedger.upsert({
        where: { idempotencyKey: expirationKey },
        create: {
          deltaTokens: -expiredTokens,
          description: `Expired unused tokens before ${targetTokenPack.name} upgrade`,
          idempotencyKey: expirationKey,
          licenseId: auth.license.id,
          metadata: {
            ...ledgerMetadata,
            expiredTokens,
          } satisfies Prisma.InputJsonObject,
          orderId: order.id,
          redeemCodeId: redeemCode?.id,
          status: 'posted',
          type: 'expiration_debit',
        },
        update: {
          description: `Expired unused tokens before ${targetTokenPack.name} upgrade`,
          deltaTokens: -expiredTokens,
          metadata: {
            ...ledgerMetadata,
            expiredTokens,
          } satisfies Prisma.InputJsonObject,
          orderId: order.id,
          redeemCodeId: redeemCode?.id,
          status: 'posted',
        },
        select: { id: true },
      });
    }

    await tx.tokenLedger.upsert({
      where: { idempotencyKey: upgradeCreditKey },
      create: {
        deltaTokens: creditedTokens,
        description: `${targetTokenPack.name} subscription upgrade credit`,
        idempotencyKey: upgradeCreditKey,
        licenseId: auth.license.id,
        metadata: {
          ...ledgerMetadata,
          creditedTokens,
          expiredTokens: existingCreditEntry ? 0 : expiredTokens,
        } satisfies Prisma.InputJsonObject,
        orderId: order.id,
        redeemCodeId: redeemCode?.id,
        status: 'posted',
        type: 'purchase_credit',
      },
      update: {
        description: `${targetTokenPack.name} subscription upgrade credit`,
        deltaTokens: creditedTokens,
        metadata: {
          ...ledgerMetadata,
          creditedTokens,
          expiredTokens: existingCreditEntry ? 0 : expiredTokens,
        } satisfies Prisma.InputJsonObject,
        orderId: order.id,
        redeemCodeId: redeemCode?.id,
        status: 'posted',
      },
      select: { id: true },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        billingPeriodEnd: renewsAt,
        rawPayload: data as unknown as Prisma.InputJsonValue,
        status: 'paid',
        tokenPackId: targetTokenPack.id,
      },
      select: {
        id: true,
      },
    });

    return {
      creditedTokens,
      expiredTokens: existingCreditEntry ? 0 : expiredTokens,
    };
  });

  log.info({
    creditedTokens: creditResult.creditedTokens,
    expiredTokens: creditResult.expiredTokens,
    licenseId: auth.license.id,
    lsSubscriptionId: order.lsSubscriptionId,
    message: 'Upgraded Lemon Squeezy subscription from mobile app',
    scope: 'mobile_subscription',
    targetTokenPackKey: targetTokenPack.key,
  });

  return {
    creditedTokens: creditResult.creditedTokens,
    currentPlanName: order.tokenPack.name,
    currentTokenPackKey: order.tokenPack.key,
    expiresUnusedTokens: creditResult.expiredTokens,
    planName: targetTokenPack.name,
    renewsAt,
    status: upgradedAttributes.status,
    tokenPackKey: targetTokenPack.key,
  };
}

export async function cancelMobileLicenseSubscription(
  auth: {
    license: {
      id: string;
    };
  },
  deps: {
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info' | 'warn'>;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const order = await findLatestSubscriptionOrder(auth.license.id, {
    dbClient,
  });

  if (!order?.lsSubscriptionId) {
    throw new MobileSubscriptionError(
      'no_active_subscription',
      404,
      'No active Lemon Squeezy subscription is linked to this license.'
    );
  }

  if (order.status === 'canceled') {
    return {
      endsAt: order.billingPeriodEnd,
      status: 'cancelled',
    };
  }

  try {
    initLemonSqueezy();
  } catch {
    throw new MobileSubscriptionError(
      'ls_disabled',
      503,
      'Lemon Squeezy is not configured for this environment.'
    );
  }

  const { data, error, statusCode } = await cancelSubscription(
    order.lsSubscriptionId
  );

  if (error || !data) {
    log.warn({
      error,
      licenseId: auth.license.id,
      lsStatusCode: statusCode,
      lsSubscriptionId: order.lsSubscriptionId,
      message: 'Failed to cancel Lemon Squeezy subscription from mobile app',
      scope: 'mobile_subscription',
    });

    throw new MobileSubscriptionError(
      'subscription_cancel_failed',
      502,
      'Lemon Squeezy did not accept the cancellation request.'
    );
  }

  const attributes = data.data.attributes;
  const endsAt =
    parseNullableDate(attributes.ends_at) ?? order.billingPeriodEnd;

  await dbClient.order.updateMany({
    where: {
      licenseId: auth.license.id,
      lsSubscriptionId: order.lsSubscriptionId,
    },
    data: {
      billingPeriodEnd: endsAt,
      rawPayload: data as unknown as Prisma.InputJsonValue,
      status: 'canceled',
    },
  });

  log.info({
    licenseId: auth.license.id,
    lsSubscriptionId: order.lsSubscriptionId,
    message: 'Cancelled Lemon Squeezy subscription from mobile app',
    scope: 'mobile_subscription',
  });

  return {
    endsAt,
    status: attributes.status,
  };
}

async function findLatestSubscriptionOrder(
  licenseId: string,
  deps: {
    dbClient: typeof db;
  }
) {
  return deps.dbClient.order.findFirst({
    where: {
      licenseId,
      lsSubscriptionId: { not: null },
    },
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
    select: subscriptionOrderSelect,
  });
}

function readSubscriptionAttributes(rawPayload: unknown) {
  if (
    rawPayload &&
    typeof rawPayload === 'object' &&
    'data' in rawPayload &&
    rawPayload.data &&
    typeof rawPayload.data === 'object' &&
    'attributes' in rawPayload.data &&
    rawPayload.data.attributes &&
    typeof rawPayload.data.attributes === 'object'
  ) {
    return rawPayload.data.attributes as {
      ends_at?: string | null;
      renews_at?: string | null;
      status?: string | null;
    };
  }

  return {};
}

export function buildMobileSubscriptionUpgradeCreditKey(input: {
  currentOrderId: string;
  currentPeriodStart: Date | null;
  lsSubscriptionId: string;
  targetTokenPackKey: string;
}) {
  const periodKey =
    input.currentPeriodStart?.toISOString() ?? input.currentOrderId;

  return `mobile:subscription:${input.lsSubscriptionId}:upgrade:${input.targetTokenPackKey}:${periodKey}:purchase-credit`;
}

function totalTokensForPack(input: {
  bonusTokenAmount: number;
  tokenAmount: number;
}) {
  return input.tokenAmount + input.bonusTokenAmount;
}

async function getAvailableLicenseTokenBalanceForDbClient(
  dbClient: Pick<typeof db, 'tokenLedger'>,
  licenseId: string
) {
  const tokenBalance = await dbClient.tokenLedger.aggregate({
    where: {
      licenseId,
      OR: [
        {
          status: 'posted',
        },
        {
          status: 'pending',
          type: {
            not: 'job_reserve',
          },
        },
      ],
    },
    _sum: {
      deltaTokens: true,
    },
  });

  return tokenBalance._sum.deltaTokens ?? 0;
}

async function getActiveCommittedJobTokensForDbClient(
  dbClient: Pick<typeof db, 'translationJob'>,
  input: {
    licenseId: string;
    resetAt: Date;
  }
) {
  const activeJobCount = await dbClient.translationJob.count({
    where: {
      createdAt: {
        lt: input.resetAt,
      },
      licenseId: input.licenseId,
      status: {
        in: ['created', 'awaiting_upload', 'queued', 'processing'],
      },
    },
  });

  return activeJobCount * envServer.JOB_TOKENS_PER_CHAPTER;
}

function parseNullableDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildMobileSubscriptionErrorResponse(
  error: unknown,
  requestId: string
) {
  if (error instanceof MobileSubscriptionError) {
    return Response.json(
      {
        error: {
          code: error.code,
        },
        ok: false,
      },
      {
        headers: {
          'X-Request-ID': requestId,
        },
        status: error.statusCode,
      }
    );
  }

  throw error;
}
