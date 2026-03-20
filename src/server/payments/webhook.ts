import type Stripe from 'stripe';

import { DEFAULT_LANGUAGE_KEY } from '@/lib/i18n/constants';

import TemplatePurchaseReceipt from '@/emails/templates/purchase-receipt';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { sendEmail } from '@/server/email';
import { generateRedeemCode } from '@/server/licenses/utils';
import { logger } from '@/server/logger';

const orderSelect = {
  id: true,
  licenseId: true,
  payerEmail: true,
  status: true,
  stripeCheckoutSessionId: true,
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

type StripeEventRecord = {
  id: string;
  orderId: string | null;
  status: 'failed' | 'ignored' | 'processed' | 'received';
};

type PaymentTx = {
  license: {
    create: (args: {
      data: {
        notes: string;
        ownerEmail: string | null;
      };
      select: {
        id: true;
      };
    }) => Promise<{ id: string }>;
  };
  order: {
    create: (args: {
      data: {
        amountDiscountCents: number;
        amountSubtotalCents: number;
        amountTotalCents: number;
        currency: string;
        paidAt: Date;
        payerEmail: string | null;
        rawPayload: Prisma.InputJsonValue;
        status: 'paid';
        stripeCheckoutSessionId: string;
        stripeCustomerId: string | null;
        stripePaymentIntentId: string | null;
        tokenPackId: string;
      };
      select: typeof orderSelect;
    }) => Promise<{
      id: string;
      licenseId: string | null;
      payerEmail: string | null;
      status: string;
      stripeCheckoutSessionId: string | null;
    }>;
    findUnique: (args: {
      where: { stripeCheckoutSessionId: string };
      select: typeof orderSelect;
    }) => Promise<{
      id: string;
      licenseId: string | null;
      payerEmail: string | null;
      status: string;
      stripeCheckoutSessionId: string | null;
    } | null>;
    update: (args: {
      where: { id: string };
      data: {
        amountDiscountCents?: number;
        amountSubtotalCents?: number;
        amountTotalCents?: number;
        currency?: string;
        licenseId?: string;
        paidAt?: Date;
        payerEmail?: string | null;
        rawPayload?: Prisma.InputJsonValue;
        status?: 'paid';
        stripeCustomerId?: string | null;
        stripePaymentIntentId?: string | null;
        tokenPackId?: string;
      };
      select: typeof orderSelect;
    }) => Promise<{
      id: string;
      licenseId: string | null;
      payerEmail: string | null;
      status: string;
      stripeCheckoutSessionId: string | null;
    }>;
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
  stripeEvent: {
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
      where: { id?: string; key?: string };
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
  stripeEvent: {
    create: (args: {
      data: {
        payload: Prisma.InputJsonValue;
        stripeEventId: string;
        type: string;
      };
      select: {
        id: true;
        orderId: true;
        status: true;
      };
    }) => Promise<StripeEventRecord>;
    findUnique: (args: {
      where: { stripeEventId: string };
      select: {
        id: true;
        orderId: true;
        status: true;
      };
    }) => Promise<StripeEventRecord | null>;
    update: PaymentTx['stripeEvent']['update'];
  };
};

type SendEmailFn = typeof sendEmail;

export type ProcessStripeWebhookResult =
  | {
      orderId?: undefined;
      status: 'already_processed' | 'ignored';
      stripeEventId: string;
    }
  | {
      orderId: string;
      status: 'processed';
      stripeEventId: string;
    };

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  deps: {
    dbClient?: PaymentDbClient;
    log?: Pick<typeof logger, 'error' | 'info' | 'warn'>;
    sendEmailFn?: SendEmailFn;
  } = {}
): Promise<ProcessStripeWebhookResult> {
  const dbClient = deps.dbClient ?? (db as unknown as PaymentDbClient);
  const log = deps.log ?? logger;
  const sendEmailFn = deps.sendEmailFn ?? sendEmail;
  const eventRecord = await getOrCreateStripeEventRecord(dbClient, event);

  if (eventRecord.status === 'processed') {
    return {
      status: 'already_processed',
      stripeEventId: event.id,
    };
  }

  if (!isPaidCheckoutSessionCompletedEvent(event)) {
    await dbClient.stripeEvent.update({
      where: { id: eventRecord.id },
      data: {
        failureMessage: null,
        payload: event as unknown as Prisma.InputJsonValue,
        processedAt: new Date(),
        status: 'ignored',
        type: event.type,
      },
    });

    return {
      status: 'ignored',
      stripeEventId: event.id,
    };
  }

  try {
    const fulfillment = await dbClient.$transaction((tx) =>
      fulfillPaidCheckoutSession({
        event,
        eventRecordId: eventRecord.id,
        tx,
      })
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
          stripeEventId: event.id,
        });
      }
    }

    return {
      orderId: fulfillment.orderId,
      status: 'processed',
      stripeEventId: event.id,
    };
  } catch (error) {
    await dbClient.stripeEvent.update({
      where: { id: eventRecord.id },
      data: {
        failureMessage: getErrorMessage(error),
        payload: event as unknown as Prisma.InputJsonValue,
        status: 'failed',
        type: event.type,
      },
    });

    log.error({
      scope: 'payments',
      message: 'Stripe webhook processing failed',
      errorMessage: getErrorMessage(error),
      stripeEventId: event.id,
      type: event.type,
    });

    throw error;
  }
}

async function fulfillPaidCheckoutSession(input: {
  event: Stripe.Event & {
    data: {
      object: Stripe.Checkout.Session;
    };
    type: 'checkout.session.completed';
  };
  eventRecordId: string;
  tx: PaymentTx;
}) {
  const session = input.event.data.object;
  const tokenPack = await getTokenPackForSession(input.tx, session);
  const orderPayload = session as unknown as Prisma.InputJsonValue;
  const payerEmail = getPayerEmail(session);
  const orderPaidAt = new Date(input.event.created * 1000);
  const existingOrder = await input.tx.order.findUnique({
    where: {
      stripeCheckoutSessionId: session.id,
    },
    select: orderSelect,
  });

  let order = existingOrder
    ? await input.tx.order.update({
        where: { id: existingOrder.id },
        data: {
          amountDiscountCents: 0,
          amountSubtotalCents:
            session.amount_subtotal ?? tokenPack.priceAmountCents,
          amountTotalCents: session.amount_total ?? tokenPack.priceAmountCents,
          currency: session.currency ?? tokenPack.currency,
          paidAt: orderPaidAt,
          payerEmail,
          rawPayload: orderPayload,
          status: 'paid',
          stripeCustomerId: getExpandableId(session.customer),
          stripePaymentIntentId: getExpandableId(session.payment_intent),
          tokenPackId: tokenPack.id,
        },
        select: orderSelect,
      })
    : await input.tx.order.create({
        data: {
          amountDiscountCents: 0,
          amountSubtotalCents:
            session.amount_subtotal ?? tokenPack.priceAmountCents,
          amountTotalCents: session.amount_total ?? tokenPack.priceAmountCents,
          currency: session.currency ?? tokenPack.currency,
          paidAt: orderPaidAt,
          payerEmail,
          rawPayload: orderPayload,
          status: 'paid',
          stripeCheckoutSessionId: session.id,
          stripeCustomerId: getExpandableId(session.customer),
          stripePaymentIntentId: getExpandableId(session.payment_intent),
          tokenPackId: tokenPack.id,
        },
        select: orderSelect,
      });

  let licenseId = order.licenseId;

  if (!licenseId) {
    const license = await input.tx.license.create({
      data: {
        notes: `Created from Stripe checkout session ${session.id}`,
        ownerEmail: payerEmail,
      },
      select: {
        id: true,
      },
    });

    order = await input.tx.order.update({
      where: { id: order.id },
      data: {
        licenseId: license.id,
      },
      select: orderSelect,
    });
    licenseId = license.id;
  }

  const redeemFulfillmentKey = buildRedeemFulfillmentKey(session.id);
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
        stripeCheckoutSessionId: session.id,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
    },
    update: {
      licenseId,
      metadata: {
        stripeCheckoutSessionId: session.id,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      status: 'available',
    },
    select: redeemCodeSelect,
  });

  const purchaseCreditKey = buildPurchaseCreditIdempotencyKey(session.id);
  const existingLedgerEntry = await input.tx.tokenLedger.findUnique({
    where: { idempotencyKey: purchaseCreditKey },
    select: {
      id: true,
    },
  });

  const totalTokens = tokenPack.tokenAmount + tokenPack.bonusTokenAmount;
  await input.tx.tokenLedger.upsert({
    where: { idempotencyKey: purchaseCreditKey },
    create: {
      deltaTokens: totalTokens,
      description: `${tokenPack.name} Stripe purchase credit`,
      idempotencyKey: purchaseCreditKey,
      licenseId,
      metadata: {
        stripeCheckoutSessionId: session.id,
        stripeEventId: input.event.id,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      redeemCodeId: redeemCode.id,
      status: 'posted',
      type: 'purchase_credit',
    },
    update: {
      description: `${tokenPack.name} Stripe purchase credit`,
      deltaTokens: totalTokens,
      metadata: {
        stripeCheckoutSessionId: session.id,
        stripeEventId: input.event.id,
        tokenPackKey: tokenPack.key,
      } satisfies Prisma.InputJsonObject,
      orderId: order.id,
      redeemCodeId: redeemCode.id,
      status: 'posted',
    },
    select: {
      id: true,
    },
  });

  await input.tx.stripeEvent.update({
    where: { id: input.eventRecordId },
    data: {
      failureMessage: null,
      orderId: order.id,
      payload: input.event as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
      status: 'processed',
      type: input.event.type,
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

async function getOrCreateStripeEventRecord(
  dbClient: PaymentDbClient,
  event: Stripe.Event
) {
  const existing = await dbClient.stripeEvent.findUnique({
    where: {
      stripeEventId: event.id,
    },
    select: {
      id: true,
      orderId: true,
      status: true,
    },
  });

  if (existing) {
    return existing;
  }

  try {
    return await dbClient.stripeEvent.create({
      data: {
        payload: event as unknown as Prisma.InputJsonValue,
        stripeEventId: event.id,
        type: event.type,
      },
      select: {
        id: true,
        orderId: true,
        status: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentExisting = await dbClient.stripeEvent.findUnique({
        where: {
          stripeEventId: event.id,
        },
        select: {
          id: true,
          orderId: true,
          status: true,
        },
      });

      if (concurrentExisting) {
        return concurrentExisting;
      }
    }

    throw error;
  }
}

function isPaidCheckoutSessionCompletedEvent(
  event: Stripe.Event
): event is Stripe.Event & {
  data: {
    object: Stripe.Checkout.Session;
  };
  type: 'checkout.session.completed';
} {
  if (event.type !== 'checkout.session.completed') {
    return false;
  }

  const session = event.data.object as Stripe.Checkout.Session;

  return session.mode === 'payment' && session.payment_status === 'paid';
}

async function getTokenPackForSession(
  tx: PaymentTx,
  session: Stripe.Checkout.Session
) {
  const tokenPackId = session.metadata?.token_pack_id;
  const tokenPackKey = session.metadata?.token_pack_key;

  const tokenPack = tokenPackId
    ? await tx.tokenPack.findUnique({
        where: { id: tokenPackId },
        select: tokenPackSelect,
      })
    : tokenPackKey
      ? await tx.tokenPack.findUnique({
          where: { key: tokenPackKey },
          select: tokenPackSelect,
        })
      : null;

  if (!tokenPack) {
    throw new Error(
      'Stripe checkout session does not resolve to a token pack.'
    );
  }

  return tokenPack;
}

function getPayerEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email ?? session.customer_email ?? null;
}

function buildRedeemFulfillmentKey(checkoutSessionId: string) {
  return `stripe:checkout:${checkoutSessionId}:redeem`;
}

function buildPurchaseCreditIdempotencyKey(checkoutSessionId: string) {
  return `stripe:checkout:${checkoutSessionId}:purchase-credit`;
}

function getExpandableId(
  value:
    | { id: string }
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | Stripe.PaymentIntent
    | null
) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.id;
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
