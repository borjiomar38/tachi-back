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
  api_version: '2025-09-30',
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

  it('processes a paid checkout session into fulfillment records', async () => {
    const tx = {
      license: {
        create: vi.fn().mockResolvedValue({ id: 'license-1' }),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: 'order-1',
          licenseId: null,
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: 'cs_test_123',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({
          id: 'order-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: 'cs_test_123',
        }),
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
          description: 'Pro pack',
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

    const result = await processStripeWebhookEvent(checkoutSessionEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      orderId: 'order-1',
      status: 'processed',
      stripeEventId: 'evt_checkout_paid_123',
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

    const result = await processStripeWebhookEvent(checkoutSessionEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result).toEqual({
      status: 'already_processed',
      stripeEventId: 'evt_checkout_paid_123',
    });
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('keeps fulfillment durable when email sending fails', async () => {
    const tx = {
      license: {
        create: vi.fn().mockResolvedValue({ id: 'license-1' }),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: 'order-1',
          licenseId: null,
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: 'cs_test_123',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({
          id: 'order-1',
          licenseId: 'license-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          stripeCheckoutSessionId: 'cs_test_123',
        }),
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
          description: 'Pro pack',
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

    const result = await processStripeWebhookEvent(checkoutSessionEvent, {
      dbClient: mockDb,
      log: mockLogger,
      sendEmailFn: mockSendEmail,
    });

    expect(result.status).toBe('processed');
    expect(mockLogger.warn).toHaveBeenCalledOnce();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
