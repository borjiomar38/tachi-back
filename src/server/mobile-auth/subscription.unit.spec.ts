import { describe, expect, it, vi } from 'vitest';

const { mockUpdateSubscription } = vi.hoisted(() => ({
  mockUpdateSubscription: vi.fn(),
}));

vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  cancelSubscription: vi.fn(),
  updateSubscription: mockUpdateSubscription,
}));

vi.mock('@/server/db', () => ({
  db: {},
}));

vi.mock('@/env/server', () => ({
  envServer: {
    JOB_TOKENS_PER_CHAPTER: 10,
  },
}));

vi.mock('@/server/payments/lemonsqueezy', () => ({
  initLemonSqueezy: vi.fn(),
}));

import { upgradeMobileLicenseSubscription } from '@/server/mobile-auth/subscription';

describe('mobile subscription upgrade', () => {
  it('upgrades starter to pro and credits only the remaining current-cycle tokens', async () => {
    mockUpdateSubscription.mockResolvedValue({
      data: {
        data: {
          attributes: {
            renews_at: '2026-06-12T00:00:00.000Z',
            status: 'active',
          },
        },
      },
      error: null,
      statusCode: 200,
    });

    const tokenLedgerUpsert = vi.fn().mockResolvedValue({ id: 'ledger-1' });
    const tx = {
      order: {
        update: vi.fn().mockResolvedValue({ id: 'order-1' }),
      },
      redeemCode: {
        findFirst: vi.fn().mockResolvedValue({ id: 'redeem-1' }),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 0,
          },
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: tokenLedgerUpsert,
      },
      translationJob: {
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const dbClient = {
      $transaction: vi.fn(async (callback) => await callback(tx)),
      order: {
        findFirst: vi.fn().mockResolvedValue({
          billingPeriodEnd: new Date('2026-06-12T00:00:00.000Z'),
          billingPeriodStart: new Date('2026-05-12T00:00:00.000Z'),
          id: 'order-1',
          licenseId: 'license-1',
          lsSubscriptionId: 'ls-sub-1',
          payerEmail: 'reader@example.com',
          rawPayload: {
            data: {
              attributes: {
                renews_at: '2026-06-12T00:00:00.000Z',
                status: 'active',
              },
            },
          },
          status: 'paid',
          tokenPack: {
            bonusTokenAmount: 0,
            id: 'pack-starter',
            key: 'starter',
            lsVariantId: '111',
            name: 'Starter 50',
            priceAmountCents: 200,
            tokenAmount: 500,
          },
          tokenPackId: 'pack-starter',
        }),
      },
      tokenPack: {
        findUnique: vi.fn().mockResolvedValue({
          active: true,
          bonusTokenAmount: 0,
          currency: 'usd',
          id: 'pack-pro',
          key: 'pro',
          lsVariantId: '222',
          name: 'Pro 250',
          priceAmountCents: 1000,
          tokenAmount: 2500,
        }),
      },
    };

    const result = await upgradeMobileLicenseSubscription(
      {
        license: {
          id: 'license-1',
        },
      },
      {
        tokenPackKey: 'pro',
      },
      {
        dbClient: dbClient as never,
        log: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      }
    );

    expect(mockUpdateSubscription).toHaveBeenCalledWith('ls-sub-1', {
      disableProrations: false,
      invoiceImmediately: true,
      variantId: 222,
    });
    expect(tokenLedgerUpsert).toHaveBeenCalledOnce();
    expect(tokenLedgerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          deltaTokens: 2000,
          metadata: expect.objectContaining({
            consumedCurrentPlanTokens: 500,
            currentTokenPackKey: 'starter',
            source: 'mobile_subscription_upgrade',
            targetTokenPackKey: 'pro',
          }),
          type: 'purchase_credit',
        }),
        where: {
          idempotencyKey:
            'mobile:subscription:ls-sub-1:upgrade:pro:2026-05-12T00:00:00.000Z:purchase-credit',
        },
      })
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenPackId: 'pack-pro',
        }),
        where: {
          id: 'order-1',
        },
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        creditedTokens: 2000,
        currentTokenPackKey: 'starter',
        tokenPackKey: 'pro',
      })
    );
  });
});
