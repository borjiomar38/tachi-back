import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockLogger, mockSendEmail } = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    stripeEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  mockSendEmail: vi.fn(),
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/email', () => ({
  sendEmail: mockSendEmail,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

import type Stripe from 'stripe';

import { processStripeWebhookEvent } from '@/server/payments/webhook';

const checkoutSessionEvent = {
  api_version: '2026-02-25.clover',
  created: 1_742_347_200,
  data: {
    object: {
      amount_subtotal: 3999,
      amount_total: 3999,
      currency: 'usd',
      customer: 'cus_123',
      customer_details: {
        email: 'reader@example.com',
      },
      customer_email: 'reader@example.com',
      id: 'cs_test_123',
      metadata: {
        token_pack_id: 'pack-pro',
        token_pack_key: 'pro',
      },
      mode: 'payment',
      object: 'checkout.session',
      payment_intent: 'pi_123',
      payment_status: 'paid',
    },
  },
  id: 'evt_checkout_paid_123',
  livemode: false,
  object: 'event',
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null,
  },
  type: 'checkout.session.completed',
} as unknown as Stripe.Event;

const invoicePaidEvent = {
  api_version: '2026-02-25.clover',
  created: 1_742_347_200,
  data: {
    object: {
      currency: 'usd',
      customer: 'cus_123',
      customer_email: 'reader@example.com',
      id: 'in_test_123',
      lines: {
        data: [
          {
            period: {
              end: 1_742_606_400,
              start: 1_739_928_000,
            },
            price: {
              id: 'price_pro_monthly_123',
            },
          },
        ],
      },
      object: 'invoice',
      payment_intent: 'pi_123',
      subscription: 'sub_test_123',
      subtotal: 3999,
      total: 3999,
    },
  },
  id: 'evt_invoice_paid_123',
  livemode: false,
  object: 'event',
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null,
  },
  type: 'invoice.paid',
} as unknown as Stripe.Event;

const invoicePaymentFailedEvent = {
  ...invoicePaidEvent,
  id: 'evt_invoice_failed_123',
  type: 'invoice.payment_failed',
} as unknown as Stripe.Event;

const subscriptionUpdatedEvent = {
  api_version: '2026-02-25.clover',
  created: 1_742_347_200,
  data: {
    object: {
      cancel_at_period_end: false,
      id: 'sub_test_123',
      object: 'subscription',
      status: 'past_due',
    },
  },
  id: 'evt_subscription_updated_123',
  livemode: false,
  object: 'event',
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null,
  },
  type: 'customer.subscription.updated',
} as unknown as Stripe.Event;

const subscriptionDeletedEvent = {
  ...subscriptionUpdatedEvent,
  data: {
    object: {
      id: 'sub_test_123',
      object: 'subscription',
      status: 'canceled',
    },
  },
  id: 'evt_subscription_deleted_123',
  type: 'customer.subscription.deleted',
} as unknown as Stripe.Event;

describe('stripe webhook fulfillment', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
    mockDb.stripeEvent.create.mockReset();
    mockDb.stripeEvent.findUnique.mockReset();
    mockDb.stripeEvent.update.mockReset();
    mockLogger.error.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockSendEmail.mockReset();
  });

  it('ignores unsupported event types', async () => {
    mockDb.stripeEvent.findUnique.mockResolvedValue(null);
    mockDb.stripeEvent.create.mockResolvedValue({
      id: 'stripe-event-row-1',
      orderId: null,
      status: 'received',
    });

    const ignoredEvent = {
      ...checkoutSessionEvent,
      data: {
        object: {
          id: 'pi_123',
        },
      },
      id: 'evt_payment_intent_123',
      type: 'payment_intent.succeeded',
    } as unknown as Stripe.Event;

    const result = await processStripeWebhookEvent(ignoredEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      status: 'ignored',
      stripeEventId: 'evt_payment_intent_123',
    });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('processes a paid invoice into recurring fulfillment records', async () => {
    const tx = {
      license: {
        create: vi.fn().mockResolvedValue({ id: 'license-1' }),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          id: 'order-1',
          licenseId: null,
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_test_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          id: 'order-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_test_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
      },
      mobileSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          id: 'redeem-1',
        }),
      },
      stripeEvent: {
        update: vi.fn().mockResolvedValue({}),
      },
      tokenLedger: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'ledger-1' }),
      },
      tokenPack: {
        findUnique: vi.fn().mockResolvedValue({
          bonusTokenAmount: 250,
          currency: 'usd',
          description: 'Pro monthly plan',
          id: 'pack-pro',
          key: 'pro',
          name: 'Pro 2500',
          priceAmountCents: 3999,
          tokenAmount: 2500,
        }),
      },
    };

    mockDb.stripeEvent.findUnique.mockResolvedValue(null);
    mockDb.stripeEvent.create.mockResolvedValue({
      id: 'stripe-event-row-1',
      orderId: null,
      status: 'received',
    });
    mockDb.$transaction.mockImplementation((callback) => callback(tx));
    mockSendEmail.mockResolvedValue(undefined);

    const result = await processStripeWebhookEvent(invoicePaidEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      orderId: 'order-1',
      status: 'processed',
      stripeEventId: 'evt_invoice_paid_123',
    });
    expect(tx.order.create).toHaveBeenCalledOnce();
    expect(tx.license.create).toHaveBeenCalledOnce();
    expect(tx.redeemCode.upsert).toHaveBeenCalledOnce();
    expect(tx.tokenLedger.upsert).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it('does not reprocess an already processed Stripe event', async () => {
    mockDb.stripeEvent.findUnique.mockResolvedValue({
      id: 'stripe-event-row-1',
      orderId: 'order-1',
      status: 'processed',
    });

    const result = await processStripeWebhookEvent(invoicePaidEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      status: 'already_processed',
      stripeEventId: 'evt_invoice_paid_123',
    });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('keeps fulfillment durable when activation-code email sending fails', async () => {
    const tx = {
      license: {
        create: vi.fn().mockResolvedValue({ id: 'license-1' }),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          id: 'order-1',
          licenseId: null,
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_test_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          id: 'order-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_test_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
      },
      mobileSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          id: 'redeem-1',
        }),
      },
      stripeEvent: {
        update: vi.fn().mockResolvedValue({}),
      },
      tokenLedger: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'ledger-1' }),
      },
      tokenPack: {
        findUnique: vi.fn().mockResolvedValue({
          bonusTokenAmount: 250,
          currency: 'usd',
          description: 'Pro monthly plan',
          id: 'pack-pro',
          key: 'pro',
          name: 'Pro 2500',
          priceAmountCents: 3999,
          tokenAmount: 2500,
        }),
      },
    };

    mockDb.stripeEvent.findUnique.mockResolvedValue(null);
    mockDb.stripeEvent.create.mockResolvedValue({
      id: 'stripe-event-row-1',
      orderId: null,
      status: 'received',
    });
    mockDb.$transaction.mockImplementation((callback) => callback(tx));
    mockSendEmail.mockRejectedValue(new Error('SMTP offline'));

    const result = await processStripeWebhookEvent(invoicePaidEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result.status).toBe('processed');
    expect(mockLogger.warn).toHaveBeenCalledOnce();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('records invoice.payment_failed without crediting monthly tokens', async () => {
    const tx = {
      license: {
        create: vi.fn(),
        update: vi.fn(),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          id: 'order-failed-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'failed',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_test_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
        findFirst: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
          id: 'order-prev-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_prev_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      mobileSession: {
        updateMany: vi.fn(),
      },
      redeemCode: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      stripeEvent: {
        update: vi.fn().mockResolvedValue({}),
      },
      tokenLedger: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      tokenPack: {
        findUnique: vi.fn().mockResolvedValue({
          bonusTokenAmount: 250,
          currency: 'usd',
          description: 'Pro monthly plan',
          id: 'pack-pro',
          key: 'pro',
          name: 'Pro 2500',
          priceAmountCents: 3999,
          tokenAmount: 2500,
        }),
      },
    };

    mockDb.stripeEvent.findUnique.mockResolvedValue(null);
    mockDb.stripeEvent.create.mockResolvedValue({
      id: 'stripe-event-row-1',
      orderId: null,
      status: 'received',
    });
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processStripeWebhookEvent(invoicePaymentFailedEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      orderId: 'order-failed-1',
      status: 'processed',
      stripeEventId: 'evt_invoice_failed_123',
    });
    expect(tx.order.create).toHaveBeenCalledOnce();
    expect(tx.redeemCode.upsert).not.toHaveBeenCalled();
    expect(tx.tokenLedger.upsert).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('suspends the license when Stripe marks the subscription as past_due', async () => {
    const tx = {
      license: {
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: 'license-1',
          status: 'suspended',
        }),
      },
      order: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          id: 'order-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_test_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      mobileSession: {
        updateMany: vi.fn(),
      },
      redeemCode: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      stripeEvent: {
        update: vi.fn().mockResolvedValue({}),
      },
      tokenLedger: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      tokenPack: {
        findUnique: vi.fn(),
      },
    };

    mockDb.stripeEvent.findUnique.mockResolvedValue(null);
    mockDb.stripeEvent.create.mockResolvedValue({
      id: 'stripe-event-row-1',
      orderId: null,
      status: 'received',
    });
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processStripeWebhookEvent(subscriptionUpdatedEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      orderId: 'order-1',
      status: 'processed',
      stripeEventId: 'evt_subscription_updated_123',
    });
    expect(tx.license.update).toHaveBeenCalledOnce();
    expect(tx.mobileSession.updateMany).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('expires the license and revokes mobile sessions when the subscription ends', async () => {
    const tx = {
      license: {
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: 'license-1',
          status: 'expired',
        }),
      },
      order: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-04-01T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-03-01T00:00:00.000Z'),
          id: 'order-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: null,
          stripeInvoiceId: 'in_test_123',
          stripeSubscriptionId: 'sub_test_123',
          tokenPackId: 'pack-pro',
        }),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      mobileSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      redeemCode: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      stripeEvent: {
        update: vi.fn().mockResolvedValue({}),
      },
      tokenLedger: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      tokenPack: {
        findUnique: vi.fn(),
      },
    };

    mockDb.stripeEvent.findUnique.mockResolvedValue(null);
    mockDb.stripeEvent.create.mockResolvedValue({
      id: 'stripe-event-row-1',
      orderId: null,
      status: 'received',
    });
    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await processStripeWebhookEvent(subscriptionDeletedEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      orderId: 'order-1',
      status: 'processed',
      stripeEventId: 'evt_subscription_deleted_123',
    });
    expect(tx.license.update).toHaveBeenCalledOnce();
    expect(tx.mobileSession.updateMany).toHaveBeenCalledOnce();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
