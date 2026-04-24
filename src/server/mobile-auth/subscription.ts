import { cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { logger } from '@/server/logger';
import { initLemonSqueezy } from '@/server/payments/lemonsqueezy';

const subscriptionOrderSelect = {
  billingPeriodEnd: true,
  id: true,
  licenseId: true,
  lsSubscriptionId: true,
  rawPayload: true,
  status: true,
  tokenPack: {
    select: {
      key: true,
      name: true,
    },
  },
  tokenPackId: true,
} as const;

export class MobileSubscriptionError extends Error {
  constructor(
    readonly code:
      | 'ls_disabled'
      | 'no_active_subscription'
      | 'subscription_cancel_failed',
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
