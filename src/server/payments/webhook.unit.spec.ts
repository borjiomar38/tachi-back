import { describe, expect, it, vi } from 'vitest';

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

vi.mock('@/server/db', () => ({
  db: {},
}));

vi.mock('@/env/server', () => ({
  envServer: {
    JOB_TOKENS_PER_CHAPTER: 10,
  },
}));

vi.mock('@/server/email', () => ({
  sendEmail: mockSendEmail,
}));

import {
  LemonSqueezyWebhookEvent,
  processWebhookEvent,
} from '@/server/payments/webhook';

describe('payment webhook fulfillment', () => {
  it('resets only unused subscription tokens before crediting the renewed month', async () => {
    const sendEmailFn = vi.fn();
    const tokenLedgerUpsert = vi.fn().mockResolvedValue({ id: 'ledger-1' });
    const tx = {
      license: {
        create: vi.fn(),
        update: vi.fn(),
      },
      mobileSession: {
        updateMany: vi.fn(),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-06-12T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-05-12T00:00:00.000Z'),
          id: 'order-renewal-1',
          licenseId: 'license-1',
          lsOrderId: 'sub_payment:ls-payment-1',
          lsSubscriptionId: 'ls-sub-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          tokenPackId: 'pack-starter',
        }),
        findFirst: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-05-12T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-04-12T00:00:00.000Z'),
          id: 'order-initial-1',
          licenseId: 'license-1',
          lsOrderId: 'ls-order-1',
          lsSubscriptionId: 'ls-sub-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          tokenPackId: 'pack-starter',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      redeemCode: {
        findFirst: vi.fn().mockResolvedValue({
          code: 'TB-PAID-1111-2222',
          id: 'redeem-1',
        }),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 120,
          },
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: tokenLedgerUpsert,
      },
      translationJob: {
        count: vi.fn().mockResolvedValue(2),
      },
      tokenPack: {
        findUnique: vi.fn().mockResolvedValue({
          bonusTokenAmount: 0,
          currency: 'usd',
          description: null,
          id: 'pack-starter',
          key: 'starter',
          name: 'Starter',
          priceAmountCents: 200,
          tokenAmount: 500,
        }),
      },
      webhookEvent: {
        update: vi.fn(),
      },
    };
    const dbClient = {
      $transaction: vi.fn(async (callback) => await callback(tx)),
      webhookEvent: {
        create: vi.fn().mockResolvedValue({
          id: 'event-1',
          orderId: null,
          status: 'received',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };

    const result = await processWebhookEvent(buildRenewalEvent(), {
      dbClient: dbClient as never,
      sendEmailFn: sendEmailFn as never,
    });

    expect(result).toEqual({
      lsEventId: 'subscription_payment_success:ls-payment-1',
      orderId: 'order-renewal-1',
      status: 'processed',
    });
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          billingPeriodEnd: new Date('2026-06-12T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-05-12T00:00:00.000Z'),
          licenseId: 'license-1',
        }),
      })
    );
    expect(tx.redeemCode.upsert).not.toHaveBeenCalled();
    expect(sendEmailFn).not.toHaveBeenCalled();
    expect(tx.translationJob.count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date('2026-05-12T00:00:00.000Z'),
        },
        licenseId: 'license-1',
        status: {
          in: ['created', 'awaiting_upload', 'queued', 'processing'],
        },
      },
    });
    expect(tokenLedgerUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({
          deltaTokens: -100,
          metadata: expect.objectContaining({
            expiredTokens: 100,
            protectedCommittedTokens: 20,
          }),
          type: 'expiration_debit',
        }),
        where: {
          idempotencyKey:
            'ls:sub_payment:ls-payment-1:unused-balance-expiration',
        },
      })
    );
    expect(tokenLedgerUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({
          deltaTokens: 500,
          type: 'purchase_credit',
        }),
        where: {
          idempotencyKey: 'ls:sub_payment:ls-payment-1:purchase-credit',
        },
      })
    );
  });

  it('does not double-credit a prorated subscription invoice already handled by mobile upgrade', async () => {
    const sendEmailFn = vi.fn();
    const mobileUpgradeCreditKey =
      'mobile:subscription:ls-sub-1:upgrade:pro:2026-05-12T00:00:00.000Z:purchase-credit';
    const tx = {
      license: {
        create: vi.fn(),
        update: vi.fn(),
      },
      mobileSession: {
        updateMany: vi.fn(),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-06-12T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-05-12T00:00:00.000Z'),
          id: 'order-upgrade-invoice-1',
          licenseId: 'license-1',
          lsOrderId: 'sub_payment:ls-payment-upgrade-1',
          lsSubscriptionId: 'ls-sub-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          tokenPackId: 'pack-pro',
        }),
        findFirst: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-06-12T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-05-12T00:00:00.000Z'),
          id: 'order-current-1',
          licenseId: 'license-1',
          lsOrderId: 'ls-order-1',
          lsSubscriptionId: 'ls-sub-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          tokenPackId: 'pack-pro',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      redeemCode: {
        findFirst: vi.fn().mockResolvedValue({
          code: 'TB-PAID-1111-2222',
          id: 'redeem-1',
        }),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      tokenLedger: {
        aggregate: vi.fn(),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.idempotencyKey === mobileUpgradeCreditKey) {
            return Promise.resolve({ id: 'mobile-upgrade-credit-1' });
          }

          return Promise.resolve(null);
        }),
        upsert: vi.fn(),
      },
      translationJob: {
        count: vi.fn(),
      },
      tokenPack: {
        findUnique: vi.fn().mockResolvedValue({
          bonusTokenAmount: 0,
          currency: 'usd',
          description: null,
          id: 'pack-pro',
          key: 'pro',
          name: 'Pro',
          priceAmountCents: 1000,
          tokenAmount: 2500,
        }),
      },
      webhookEvent: {
        update: vi.fn(),
      },
    };
    const dbClient = {
      $transaction: vi.fn(async (callback) => await callback(tx)),
      webhookEvent: {
        create: vi.fn().mockResolvedValue({
          id: 'event-1',
          orderId: null,
          status: 'received',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };

    const result = await processWebhookEvent(buildProratedUpgradeEvent(), {
      dbClient: dbClient as never,
      sendEmailFn: sendEmailFn as never,
    });

    expect(result).toEqual({
      lsEventId: 'subscription_payment_success:ls-payment-upgrade-1',
      orderId: 'order-upgrade-invoice-1',
      status: 'processed',
    });
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountSubtotalCents: 800,
          billingReason: 'updated',
          tokenPackId: 'pack-pro',
        }),
      })
    );
    expect(tx.tokenLedger.aggregate).not.toHaveBeenCalled();
    expect(tx.tokenLedger.upsert).not.toHaveBeenCalled();
    expect(sendEmailFn).not.toHaveBeenCalled();
  });

  it('attaches a mobile checkout to its existing license and device', async () => {
    const tx = {
      device: {
        update: vi.fn().mockResolvedValue({ id: 'device-1' }),
      },
      license: {
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: 'license-1',
          status: 'active',
        }),
      },
      licenseDevice: {
        upsert: vi.fn().mockResolvedValue({ id: 'binding-1' }),
      },
      mobileCheckoutIntent: {
        findUnique: vi.fn().mockResolvedValue({
          device: { id: 'device-1', status: 'active' },
          deviceId: 'device-1',
          id: 'checkout-intent-1',
          license: {
            activatedAt: new Date('2026-08-01T00:00:00.000Z'),
            id: 'license-1',
            status: 'active',
          },
          licenseId: 'license-1',
          status: 'pending',
          tokenPackId: 'pack-starter',
        }),
        update: vi.fn().mockResolvedValue({ id: 'checkout-intent-1' }),
      },
      mobileSession: {
        updateMany: vi.fn(),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          billingPeriodEnd: null,
          billingPeriodStart: null,
          id: 'order-mobile-1',
          licenseId: 'license-1',
          lsOrderId: 'ls-order-mobile-1',
          lsSubscriptionId: 'ls-sub-mobile-1',
          payerEmail: 'reader@example.com',
          status: 'paid',
          tokenPackId: 'pack-starter',
        }),
        findFirst: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      redeemCode: {
        findFirst: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          code: 'TB-MOBILE-1111-2222',
          id: 'redeem-mobile-1',
        }),
      },
      tokenLedger: {
        aggregate: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'ledger-mobile-1' }),
      },
      tokenPack: {
        findUnique: vi.fn().mockResolvedValue({
          bonusTokenAmount: 0,
          currency: 'usd',
          description: null,
          id: 'pack-starter',
          key: 'starter',
          name: 'Starter 50',
          priceAmountCents: 200,
          tokenAmount: 50,
        }),
      },
      translationJob: {
        count: vi.fn(),
      },
      webhookEvent: {
        update: vi.fn(),
      },
    };
    const dbClient = {
      $transaction: vi.fn(async (callback) => await callback(tx)),
      webhookEvent: {
        create: vi.fn().mockResolvedValue({
          id: 'webhook-mobile-1',
          orderId: null,
          status: 'received',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const event: LemonSqueezyWebhookEvent = {
      data: {
        attributes: {
          currency: 'USD',
          customer_id: 'ls-customer-mobile-1',
          discount_total: 0,
          first_order_item: {
            subscription_id: 'ls-sub-mobile-1',
          },
          subtotal: 200,
          total: 200,
          user_email: 'reader@example.com',
        },
        id: 'ls-order-mobile-1',
        type: 'orders',
      },
      meta: {
        custom_data: {
          mobile_checkout_intent_id: 'checkout-intent-1',
          token_pack_id: 'pack-starter',
          token_pack_key: 'starter',
        },
        event_name: 'order_created',
      },
    };

    const result = await processWebhookEvent(event, {
      dbClient: dbClient as never,
      sendEmailFn: vi.fn() as never,
    });

    expect(result).toEqual({
      lsEventId: 'order_created:ls-order-mobile-1',
      orderId: 'order-mobile-1',
      status: 'processed',
    });
    expect(tx.license.create).not.toHaveBeenCalled();
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ licenseId: 'license-1' }),
      })
    );
    expect(tx.licenseDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          deviceId: 'device-1',
          licenseId: 'license-1',
        }),
      })
    );
    expect(tx.mobileCheckoutIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          licenseId: 'license-1',
          orderId: 'order-mobile-1',
          status: 'paid',
        }),
      })
    );
  });
});

function buildRenewalEvent(): LemonSqueezyWebhookEvent {
  return {
    data: {
      attributes: {
        billing_period_end: '2026-06-12T00:00:00.000Z',
        billing_period_start: '2026-05-12T00:00:00.000Z',
        billing_reason: 'renewal',
        currency: 'USD',
        customer_id: 'ls-customer-1',
        discount_total: 0,
        status: 'paid',
        subtotal: 200,
        subscription_id: 'ls-sub-1',
        total: 200,
        user_email: 'reader@example.com',
      },
      id: 'ls-payment-1',
      type: 'subscription-invoices',
    },
    meta: {
      custom_data: {
        token_pack_key: 'starter',
      },
      event_name: 'subscription_payment_success',
    },
  };
}

function buildProratedUpgradeEvent(): LemonSqueezyWebhookEvent {
  return {
    data: {
      attributes: {
        billing_period_end: '2026-06-12T00:00:00.000Z',
        billing_period_start: '2026-05-12T00:00:00.000Z',
        billing_reason: 'updated',
        currency: 'USD',
        customer_id: 'ls-customer-1',
        discount_total: 0,
        status: 'paid',
        subtotal: 800,
        subscription_id: 'ls-sub-1',
        total: 800,
        user_email: 'reader@example.com',
      },
      id: 'ls-payment-upgrade-1',
      type: 'subscription-invoices',
    },
    meta: {
      event_name: 'subscription_payment_success',
    },
  };
}
