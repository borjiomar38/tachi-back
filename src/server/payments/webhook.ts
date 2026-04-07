import { DEFAULT_LANGUAGE_KEY } from '@/lib/i18n/constants';

import TemplatePurchaseReceipt from '@/emails/templates/purchase-receipt';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { sendEmail } from '@/server/email';
import { UNLIMITED_DEVICE_LIMIT } from '@/server/licenses/device-limit';
import { generateRedeemCode } from '@/server/licenses/utils';
import { logger } from '@/server/logger';

const orderSelect = {
  billingPeriodEnd: true,
  billingPeriodStart: true,
  id: true,
  licenseId: true,
  payerEmail: true,
  status: true,
  lsOrderId: true,
  lsSubscriptionId: true,
  tokenPackId: true,
} as const;

const redeemCodeSelect = {
  code: true,
  id: true,
} as const;

const tokenPackSelect = {
  bonusTokenAmount: true,
  currency: true,
  description: true,
  id: true,
  key: true,
  name: true,
  priceAmountCents: true,
  tokenAmount: true,
} as const;

type WebhookEventRecord = {
  id: string;
  orderId: string | null;
  status: 'failed' | 'ignored' | 'processed' | 'received';
};

type PaymentTx = {
  license: {
    create: (args: {
      data: {
        deviceLimit: number;
        notes: string;
        ownerEmail: string | null;
      };
      select: {
        id: true;
      };
    }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: {
        notes?: string | null;
        revokedAt?: Date | null;
        status?: 'active' | 'expired' | 'pending' | 'revoked' | 'suspended';
      };
      select: {
        id: true;
        status: true;
      };
    }) => Promise<{
      id: string;
      status: 'active' | 'expired' | 'pending' | 'revoked' | 'suspended';
    }>;
  };
  order: {
    create: (args: {
      data: {
        amountDiscountCents: number;
        amountSubtotalCents: number;
        amountTotalCents: number;
        billingPeriodEnd?: Date | null;
        billingPeriodStart?: Date | null;
        billingReason?: string | null;
        currency: string;
        paidAt?: Date;
        payerEmail: string | null;
        rawPayload: Prisma.InputJsonValue;
        status: 'failed' | 'paid';
        lsOrderId?: string | null;
        lsSubscriptionId?: string | null;
        lsCustomerId?: string | null;
        tokenPackId?: string | null;
        licenseId?: string | null;
      };
      select: typeof orderSelect;
    }) => Promise<{
      billingPeriodEnd: Date | null;
      billingPeriodStart: Date | null;
      id: string;
      licenseId: string | null;
      payerEmail: string | null;
      status: string;
      lsOrderId: string | null;
      lsSubscriptionId: string | null;
      tokenPackId: string | null;
    }>;
    findUnique: (args: {
      where: { lsOrderId?: string };
      select: typeof orderSelect;
    }) => Promise<{
      billingPeriodEnd: Date | null;
      billingPeriodStart: Date | null;
      id: string;
      licenseId: string | null;
      payerEmail: string | null;
      status: string;
      lsOrderId: string | null;
      lsSubscriptionId: string | null;
      tokenPackId: string | null;
    } | null>;
    findFirst: (args: {
      where: {
        licenseId?: {
          not?: null;
        };
        lsSubscriptionId?: string;
      };
      orderBy: { paidAt: 'desc' } | { createdAt: 'desc' };
      select: typeof orderSelect;
    }) => Promise<{
      billingPeriodEnd: Date | null;
      billingPeriodStart: Date | null;
      id: string;
      licenseId: string | null;
      payerEmail: string | null;
      status: string;
      lsOrderId: string | null;
      lsSubscriptionId: string | null;
      tokenPackId: string | null;
    } | null>;
    update: (args: {
      where: { id: string };
      data: {
        amountDiscountCents?: number;
        amountSubtotalCents?: number;
        amountTotalCents?: number;
        billingPeriodEnd?: Date | null;
        billingPeriodStart?: Date | null;
        billingReason?: string | null;
        currency?: string;
        licenseId?: string;
        paidAt?: Date;
        payerEmail?: string | null;
        rawPayload?: Prisma.InputJsonValue;
        status?: 'failed' | 'paid';
        lsOrderId?: string | null;
        lsSubscriptionId?: string | null;
        lsCustomerId?: string | null;
        tokenPackId?: string | null;
      };
      select: typeof orderSelect;
    }) => Promise<{
      billingPeriodEnd: Date | null;
      billingPeriodStart: Date | null;
      id: string;
      licenseId: string | null;
      payerEmail: string | null;
      status: string;
      lsOrderId: string | null;
      lsSubscriptionId: string | null;
      tokenPackId: string | null;
    }>;
  };
  mobileSession: {
    updateMany: (args: {
      data: {
        revokeReason?: string | null;
        revokedAt?: Date | null;
      };
      where: {
        licenseId: string;
        revokedAt?: null;
      };
    }) => Promise<unknown>;
  };
  redeemCode: {
    findUnique: (args: {
      where: { fulfillmentKey: string };
      select: typeof redeemCodeSelect;
    }) => Promise<{ code: string; id: string } | null>;
    upsert: (args: {
      where: { fulfillmentKey: string };
      create: {
        code: string;
        fulfillmentKey: string;
        licenseId: string;
        metadata: Prisma.InputJsonValue;
        orderId: string;
      };
      update: {
        licenseId: string;
        metadata: Prisma.InputJsonValue;
        orderId: string;
        status: 'available';
      };
      select: typeof redeemCodeSelect;
    }) => Promise<{ code: string; id: string }>;
  };
  webhookEvent: {
    update: (args: {
      where: { id: string };
      data: {
        failureMessage?: string | null;
        orderId?: string;
        payload?: Prisma.InputJsonValue;
        processedAt?: Date;
        status: 'failed' | 'ignored' | 'processed';
        type?: string;
      };
    }) => Promise<unknown>;
  };
  tokenLedger: {
    findUnique: (args: {
      where: { idempotencyKey: string };
      select: {
        id: true;
      };
    }) => Promise<{ id: string } | null>;
    upsert: (args: {
      where: { idempotencyKey: string };
      create: {
        deltaTokens: number;
        description: string;
        idempotencyKey: string;
        licenseId: string;
        metadata: Prisma.InputJsonValue;
        orderId: string;
        redeemCodeId: string;
        status: 'posted';
        type: 'purchase_credit';
      };
      update: {
        description: string;
        deltaTokens: number;
        metadata: Prisma.InputJsonValue;
        orderId: string;
        redeemCodeId: string;
        status: 'posted';
      };
      select: {
        id: true;
      };
    }) => Promise<{ id: string }>;
  };
  tokenPack: {
    findUnique: (args: {
      where: { id?: string; key?: string; lsVariantId?: string };
      select: typeof tokenPackSelect;
    }) => Promise<{
      bonusTokenAmount: number;
      currency: string;
      description: string | null;
      id: string;
      key: string;
      name: string;
      priceAmountCents: number;
      tokenAmount: number;
    } | null>;
  };
};

type PaymentDbClient = {
  $transaction: <T>(fn: (tx: PaymentTx) => Promise<T>) => Promise<T>;
  webhookEvent: {
    create: (args: {
      data: {
        payload: Prisma.InputJsonValue;
        lsEventId: string;
        type: string;
      };
      select: {
        id: true;
        orderId: true;
        status: true;
      };
    }) => Promise<WebhookEventRecord>;
    findUnique: (args: {
      where: { lsEventId: string };
      select: {
        id: true;
        orderId: true;
        status: true;
      };
    }) => Promise<WebhookEventRecord | null>;
    update: PaymentTx['webhookEvent']['update'];
  };
};

type SendEmailFn = typeof sendEmail;

export type ProcessWebhookResult =
  | {
      orderId?: undefined;
      status: 'already_processed' | 'ignored';
      lsEventId: string;
    }
  | {
      orderId?: string;
      status: 'processed';
      lsEventId: string;
    };

type WebhookEmailPayload = {
  packName: string;
  redeemCode: string;
  to: string;
  totalTokens: number;
};

type WebhookFulfillment = {
  email: WebhookEmailPayload | null;
  orderId?: string;
};

// Lemon Squeezy webhook event shape
export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: Record<string, string>;
  };
  data: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
    relationships?: Record<string, unknown>;
  };
}

export async function processWebhookEvent(
  event: LemonSqueezyWebhookEvent,
  deps: {
    dbClient?: PaymentDbClient;
    log?: Pick<typeof logger, 'error' | 'info' | 'warn'>;
    sendEmailFn?: SendEmailFn;
  } = {}
): Promise<ProcessWebhookResult> {
  const dbClient = deps.dbClient ?? (db as unknown as PaymentDbClient);
  const log = deps.log ?? logger;
  const sendEmailFn = deps.sendEmailFn ?? sendEmail;
  const eventName = event.meta.event_name;
  const lsEventId = `${eventName}:${event.data.id}`;
  const eventRecord = await getOrCreateEventRecord(
    dbClient,
    lsEventId,
    eventName,
    event
  );

  if (eventRecord.status === 'processed') {
    return {
      status: 'already_processed',
      lsEventId,
    };
  }

  const isOrderCreated = eventName === 'order_created';
  const isSubscriptionPaymentSuccess =
    eventName === 'subscription_payment_success';
  const isSubscriptionPaymentFailed =
    eventName === 'subscription_payment_failed';
  const isSubscriptionUpdated = eventName === 'subscription_updated';
  const isSubscriptionCancelled = eventName === 'subscription_cancelled';
  const isSubscriptionExpired = eventName === 'subscription_expired';

  if (
    !isOrderCreated &&
    !isSubscriptionPaymentSuccess &&
    !isSubscriptionPaymentFailed &&
    !isSubscriptionUpdated &&
    !isSubscriptionCancelled &&
    !isSubscriptionExpired
  ) {
    await dbClient.webhookEvent.update({
      where: { id: eventRecord.id },
      data: {
        failureMessage: null,
        payload: event as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
        status: 'ignored',
        type: eventName,
      },
    });

    return {
      status: 'ignored',
      lsEventId,
    };
  }

  try {
    const fulfillment = await dbClient.$transaction<WebhookFulfillment>(
      (tx) => {
        if (isOrderCreated) {
          return fulfillPaidOrder({ event, eventRecordId: eventRecord.id, tx });
        }
        if (isSubscriptionPaymentSuccess) {
          return fulfillSubscriptionPayment({
            event,
            eventRecordId: eventRecord.id,
            tx,
          });
        }
        if (isSubscriptionPaymentFailed) {
          return recordFailedPayment({
            event,
            eventRecordId: eventRecord.id,
            tx,
          });
        }
        return handleSubscriptionLifecycleEvent({
          event,
          eventRecordId: eventRecord.id,
          tx,
        });
      }
    );

    if (fulfillment.email) {
      try {
        await sendEmailFn({
          subject: `Your Tachiyomi Back redeem code for ${fulfillment.email.packName}`,
          template: TemplatePurchaseReceipt({
            language: DEFAULT_LANGUAGE_KEY,
            packName: fulfillment.email.packName,
            redeemCode: fulfillment.email.redeemCode,
            totalTokens: fulfillment.email.totalTokens,
          }),
          to: fulfillment.email.to,
        });
      } catch (error) {
        log.warn({
          scope: 'payments',
          message: 'Purchase email failed after durable fulfillment',
          orderId: fulfillment.orderId,
          errorMessage: getErrorMessage(error),
          lsEventId,
        });
      }
    }

    return {
      orderId: fulfillment.orderId,
      status: 'processed',
      lsEventId,
    };
  } catch (error) {
    await dbClient.webhookEvent.update({
      where: { id: eventRecord.id },
      data: {
        failureMessage: getErrorMessage(error),
        payload: event as unknown as Prisma.InputJsonValue,
        status: 'failed',
        type: eventName,
      },
    });

    log.error({
      scope: 'payments',
      message: 'Webhook processing failed',
      errorMessage: getErrorMessage(error),
      lsEventId,
      type: eventName,
    });

    throw error;
  }
}

async function fulfillPaidOrder(input: {
  event: LemonSqueezyWebhookEvent;
  eventRecordId: string;
  tx: PaymentTx;
}): Promise<WebhookFulfillment> {
  const attrs = input.event.data.attributes;
  const customData = input.event.meta.custom_data ?? {};
  const lsOrderId = String(input.event.data.id);
  const lsSubscriptionId = attrs.first_order_item
    ? String(
        (attrs.first_order_item as Record<string, unknown>).subscription_id ??
          ''
      )
    : null;
  const lsCustomerId = String(attrs.customer_id ?? '');
  const payerEmail = String(attrs.user_email ?? '') || null;
  const totalCents = Number(attrs.total ?? 0);
  const subtotalCents = Number(attrs.subtotal ?? totalCents);
  const discountCents = Number(attrs.discount_total ?? 0);
  const currency = String(attrs.currency ?? 'USD').toLowerCase();
  const orderPayload = input.event as unknown as Prisma.InputJsonValue;
  const orderPaidAt = new Date();

  const tokenPack = await resolveTokenPack(input.tx, customData);

  const existingOrder = await input.tx.order.findUnique({
    where: { lsOrderId },
    select: orderSelect,
  });

  let order = existingOrder
    ? await input.tx.order.update({
        where: { id: existingOrder.id },
        data: {
          amountDiscountCents: discountCents,
          amountSubtotalCents: subtotalCents,
          amountTotalCents: totalCents,
          currency,
          paidAt: orderPaidAt,
          payerEmail,
          rawPayload: orderPayload,
          status: 'paid',
          lsCustomerId,
          lsSubscriptionId: lsSubscriptionId || undefined,
          tokenPackId: tokenPack.id,
        },
        select: orderSelect,
      })
    : await input.tx.order.create({
        data: {
          amountDiscountCents: discountCents,
          amountSubtotalCents: subtotalCents,
          amountTotalCents: totalCents,
          currency,
          paidAt: orderPaidAt,
          payerEmail,
          rawPayload: orderPayload,
          status: 'paid',
          lsOrderId,
          lsCustomerId,
          lsSubscriptionId: lsSubscriptionId || undefined,
          tokenPackId: tokenPack.id,
        },
        select: orderSelect,
      });

  let licenseId = order.licenseId;

  if (!licenseId) {
    const license = await input.tx.license.create({
      data: {
        deviceLimit: UNLIMITED_DEVICE_LIMIT,
        notes: `Created from Lemon Squeezy order ${lsOrderId}`,
        ownerEmail: payerEmail,
      },
      select: { id: true },
    });

    order = await input.tx.order.update({
      where: { id: order.id },
      data: { licenseId: license.id },
      select: orderSelect,
    });
    licenseId = license.id;
  }

  const redeemFulfillmentKey = `ls:order:${lsOrderId}:redeem`;
  const existingRedeemCode = await input.tx.redeemCode.findUnique({
    where: { fulfillmentKey: redeemFulfillmentKey },
    select: redeemCodeSelect,
  });

  const redeemCode = await input.tx.redeemCode.upsert({
    where: { fulfillmentKey: redeemFulfillmentKey },
    create: {
      code: generateRedeemCode(),
      fulfillmentKey: redeemFulfillmentKey,
      licenseId,
      metadata: {
        lsOrderId,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
    },
    update: {
      licenseId,
      metadata: {
        lsOrderId,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      status: 'available',
    },
    select: redeemCodeSelect,
  });

  const purchaseCreditKey = `ls:order:${lsOrderId}:purchase-credit`;
  const existingLedgerEntry = await input.tx.tokenLedger.findUnique({
    where: { idempotencyKey: purchaseCreditKey },
    select: { id: true },
  });

  const totalTokens = tokenPack.tokenAmount + tokenPack.bonusTokenAmount;
  await input.tx.tokenLedger.upsert({
    where: { idempotencyKey: purchaseCreditKey },
    create: {
      deltaTokens: totalTokens,
      description: `${tokenPack.name} Lemon Squeezy purchase credit`,
      idempotencyKey: purchaseCreditKey,
      licenseId,
      metadata: {
        lsOrderId,
        lsEventId: `order_created:${input.event.data.id}`,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      redeemCodeId: redeemCode.id,
      status: 'posted',
      type: 'purchase_credit',
    },
    update: {
      description: `${tokenPack.name} Lemon Squeezy purchase credit`,
      deltaTokens: totalTokens,
      metadata: {
        lsOrderId,
        lsEventId: `order_created:${input.event.data.id}`,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      redeemCodeId: redeemCode.id,
      status: 'posted',
    },
    select: { id: true },
  });

  await input.tx.webhookEvent.update({
    where: { id: input.eventRecordId },
    data: {
      failureMessage: null,
      orderId: order.id,
      payload: input.event as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
      status: 'processed',
      type: input.event.meta.event_name,
    },
  });

  return {
    email:
      payerEmail && (!existingRedeemCode || !existingLedgerEntry)
        ? {
            packName: tokenPack.name,
            redeemCode: redeemCode.code,
            to: payerEmail,
            totalTokens,
          }
        : null,
    orderId: order.id,
  };
}

async function fulfillSubscriptionPayment(input: {
  event: LemonSqueezyWebhookEvent;
  eventRecordId: string;
  tx: PaymentTx;
}): Promise<WebhookFulfillment> {
  const attrs = input.event.data.attributes;
  const customData = input.event.meta.custom_data ?? {};
  const lsSubscriptionId = String(attrs.subscription_id ?? input.event.data.id);
  const lsOrderId = `sub_payment:${input.event.data.id}`;
  const lsCustomerId = String(attrs.customer_id ?? '');
  const payerEmail = String(attrs.user_email ?? '') || null;
  const totalCents = Number(attrs.total ?? 0);
  const subtotalCents = Number(attrs.subtotal ?? totalCents);
  const discountCents = Number(attrs.discount_total ?? 0);
  const currency = String(attrs.currency ?? 'USD').toLowerCase();
  const orderPayload = input.event as unknown as Prisma.InputJsonValue;
  const orderPaidAt = new Date();

  const tokenPack = await resolveTokenPack(input.tx, customData);

  const previousSubscriptionOrder = await input.tx.order.findFirst({
    where: {
      licenseId: { not: null },
      lsSubscriptionId,
    },
    orderBy: { paidAt: 'desc' },
    select: orderSelect,
  });

  const existingOrder = await input.tx.order.findUnique({
    where: { lsOrderId },
    select: orderSelect,
  });

  let order = existingOrder
    ? await input.tx.order.update({
        where: { id: existingOrder.id },
        data: {
          amountDiscountCents: discountCents,
          amountSubtotalCents: subtotalCents,
          amountTotalCents: totalCents,
          currency,
          paidAt: orderPaidAt,
          payerEmail: payerEmail ?? existingOrder.payerEmail,
          rawPayload: orderPayload,
          status: 'paid',
          lsCustomerId,
          lsSubscriptionId,
          tokenPackId: tokenPack.id,
        },
        select: orderSelect,
      })
    : await input.tx.order.create({
        data: {
          amountDiscountCents: discountCents,
          amountSubtotalCents: subtotalCents,
          amountTotalCents: totalCents,
          currency,
          paidAt: orderPaidAt,
          payerEmail:
            payerEmail ?? previousSubscriptionOrder?.payerEmail ?? null,
          rawPayload: orderPayload,
          status: 'paid',
          lsOrderId,
          lsCustomerId,
          lsSubscriptionId,
          tokenPackId: tokenPack.id,
          licenseId: previousSubscriptionOrder?.licenseId ?? null,
        },
        select: orderSelect,
      });

  let licenseId =
    order.licenseId ?? previousSubscriptionOrder?.licenseId ?? null;

  if (!licenseId) {
    const license = await input.tx.license.create({
      data: {
        deviceLimit: UNLIMITED_DEVICE_LIMIT,
        notes: `Created from Lemon Squeezy subscription ${lsSubscriptionId}`,
        ownerEmail: payerEmail,
      },
      select: { id: true },
    });

    order = await input.tx.order.update({
      where: { id: order.id },
      data: { licenseId: license.id },
      select: orderSelect,
    });
    licenseId = license.id;
  }

  const redeemFulfillmentKey = `ls:subscription:${lsSubscriptionId}:redeem`;
  const existingRedeemCode = await input.tx.redeemCode.findUnique({
    where: { fulfillmentKey: redeemFulfillmentKey },
    select: redeemCodeSelect,
  });

  const redeemCode = await input.tx.redeemCode.upsert({
    where: { fulfillmentKey: redeemFulfillmentKey },
    create: {
      code: generateRedeemCode(),
      fulfillmentKey: redeemFulfillmentKey,
      licenseId,
      metadata: {
        lsSubscriptionId,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
    },
    update: {
      licenseId,
      metadata: {
        lsSubscriptionId,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      status: 'available',
    },
    select: redeemCodeSelect,
  });

  const creditIdempotencyKey = `ls:sub_payment:${input.event.data.id}:purchase-credit`;
  const existingLedgerEntry = await input.tx.tokenLedger.findUnique({
    where: { idempotencyKey: creditIdempotencyKey },
    select: { id: true },
  });

  const totalTokens = tokenPack.tokenAmount + tokenPack.bonusTokenAmount;
  await input.tx.tokenLedger.upsert({
    where: { idempotencyKey: creditIdempotencyKey },
    create: {
      deltaTokens: totalTokens,
      description: `${tokenPack.name} monthly subscription credit`,
      idempotencyKey: creditIdempotencyKey,
      licenseId,
      metadata: {
        lsEventId: `subscription_payment_success:${input.event.data.id}`,
        lsSubscriptionId,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      redeemCodeId: redeemCode.id,
      status: 'posted',
      type: 'purchase_credit',
    },
    update: {
      description: `${tokenPack.name} monthly subscription credit`,
      deltaTokens: totalTokens,
      metadata: {
        lsEventId: `subscription_payment_success:${input.event.data.id}`,
        lsSubscriptionId,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      redeemCodeId: redeemCode.id,
      status: 'posted',
    },
    select: { id: true },
  });

  await input.tx.webhookEvent.update({
    where: { id: input.eventRecordId },
    data: {
      failureMessage: null,
      orderId: order.id,
      payload: input.event as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
      status: 'processed',
      type: input.event.meta.event_name,
    },
  });

  return {
    email:
      payerEmail && (!existingRedeemCode || !existingLedgerEntry)
        ? {
            packName: tokenPack.name,
            redeemCode: redeemCode.code,
            to: payerEmail,
            totalTokens,
          }
        : null,
    orderId: order.id,
  };
}

async function recordFailedPayment(input: {
  event: LemonSqueezyWebhookEvent;
  eventRecordId: string;
  tx: PaymentTx;
}): Promise<WebhookFulfillment> {
  const attrs = input.event.data.attributes;
  const customData = input.event.meta.custom_data ?? {};
  const lsOrderId = `sub_payment_failed:${input.event.data.id}`;
  const lsSubscriptionId = String(attrs.subscription_id ?? input.event.data.id);
  const lsCustomerId = String(attrs.customer_id ?? '');
  const payerEmail = String(attrs.user_email ?? '') || null;
  const totalCents = Number(attrs.total ?? 0);
  const subtotalCents = Number(attrs.subtotal ?? totalCents);
  const discountCents = Number(attrs.discount_total ?? 0);
  const currency = String(attrs.currency ?? 'USD').toLowerCase();
  const orderPayload = input.event as unknown as Prisma.InputJsonValue;

  const tokenPack = await resolveTokenPack(input.tx, customData);

  const previousSubscriptionOrder = await input.tx.order.findFirst({
    where: {
      licenseId: { not: null },
      lsSubscriptionId,
    },
    orderBy: { paidAt: 'desc' },
    select: orderSelect,
  });

  await input.tx.order.create({
    data: {
      amountDiscountCents: discountCents,
      amountSubtotalCents: subtotalCents,
      amountTotalCents: totalCents,
      currency,
      payerEmail: payerEmail ?? previousSubscriptionOrder?.payerEmail ?? null,
      rawPayload: orderPayload,
      status: 'failed',
      lsOrderId,
      lsCustomerId,
      lsSubscriptionId,
      tokenPackId: tokenPack.id,
      licenseId: previousSubscriptionOrder?.licenseId ?? null,
    },
    select: orderSelect,
  });

  await input.tx.webhookEvent.update({
    where: { id: input.eventRecordId },
    data: {
      failureMessage: null,
      payload: input.event as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
      status: 'processed',
      type: input.event.meta.event_name,
    },
  });

  return { email: null };
}

async function handleSubscriptionLifecycleEvent(input: {
  event: LemonSqueezyWebhookEvent;
  eventRecordId: string;
  tx: PaymentTx;
}): Promise<WebhookFulfillment> {
  const attrs = input.event.data.attributes;
  const lsSubscriptionId = String(input.event.data.id);
  const lsStatus = String(attrs.status ?? '');
  const eventName = input.event.meta.event_name;

  const latestOrder = await input.tx.order.findFirst({
    where: {
      licenseId: { not: null },
      lsSubscriptionId,
    },
    orderBy: { paidAt: 'desc' },
    select: orderSelect,
  });

  const nextLicenseStatus = mapLsStatusToLicenseStatus(eventName, lsStatus);
  const lifecycleTimestamp = new Date();

  if (latestOrder?.licenseId) {
    await input.tx.license.update({
      where: { id: latestOrder.licenseId },
      data: {
        notes: `Lemon Squeezy subscription ${lsSubscriptionId}: ${eventName} (status: ${lsStatus})`,
        revokedAt: nextLicenseStatus === 'expired' ? lifecycleTimestamp : null,
        status: nextLicenseStatus,
      },
      select: { id: true, status: true },
    });

    if (nextLicenseStatus === 'expired') {
      await input.tx.mobileSession.updateMany({
        data: {
          revokeReason: 'subscription_ended',
          revokedAt: lifecycleTimestamp,
        },
        where: {
          licenseId: latestOrder.licenseId,
          revokedAt: null,
        },
      });
    }
  }

  await input.tx.webhookEvent.update({
    where: { id: input.eventRecordId },
    data: {
      failureMessage: null,
      orderId: latestOrder?.id,
      payload: input.event as unknown as Prisma.InputJsonValue,
      processedAt: lifecycleTimestamp,
      status: 'processed',
      type: eventName,
    },
  });

  return {
    email: null,
    orderId: latestOrder?.id,
  };
}

function mapLsStatusToLicenseStatus(
  eventName: string,
  lsStatus: string
): 'active' | 'expired' | 'pending' | 'revoked' | 'suspended' {
  if (
    eventName === 'subscription_cancelled' ||
    eventName === 'subscription_expired'
  ) {
    return 'expired';
  }

  switch (lsStatus) {
    case 'active':
    case 'on_trial':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'suspended';
    case 'cancelled':
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
}

async function resolveTokenPack(
  tx: PaymentTx,
  customData: Record<string, string>
) {
  if (customData.token_pack_id) {
    const pack = await tx.tokenPack.findUnique({
      where: { id: customData.token_pack_id },
      select: tokenPackSelect,
    });
    if (pack) return pack;
  }

  if (customData.token_pack_key) {
    const pack = await tx.tokenPack.findUnique({
      where: { key: customData.token_pack_key },
      select: tokenPackSelect,
    });
    if (pack) return pack;
  }

  throw new Error(
    `Could not resolve token pack from webhook custom data: ${JSON.stringify(customData)}`
  );
}

async function getOrCreateEventRecord(
  dbClient: PaymentDbClient,
  lsEventId: string,
  eventType: string,
  event: LemonSqueezyWebhookEvent
) {
  const existing = await dbClient.webhookEvent.findUnique({
    where: { lsEventId },
    select: { id: true, orderId: true, status: true },
  });

  if (existing) return existing;

  try {
    return await dbClient.webhookEvent.create({
      data: {
        payload: event as unknown as Prisma.InputJsonValue,
        lsEventId,
        type: eventType,
      },
      select: { id: true, orderId: true, status: true },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentExisting = await dbClient.webhookEvent.findUnique({
        where: { lsEventId },
        select: { id: true, orderId: true, status: true },
      });
      if (concurrentExisting) return concurrentExisting;
    }
    throw error;
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}
