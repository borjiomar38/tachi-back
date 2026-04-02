import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockLogger, mockGetStripeClient } = vi.hoisted(() => ({
  mockDb: {
    tokenPack: {
      findUnique: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
  },
  mockGetStripeClient: vi.fn(),
}));

vi.mock('@/env/client', () => ({
  envClient: {
    VITE_BASE_URL: 'http://localhost:3000',
    VITE_ENV_NAME: 'LOCAL',
  },
}));

vi.mock('@/env/server', () => ({
  envServer: {
    STRIPE_ENABLED: true,
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/server/payments/stripe', () => ({
  getStripeClient: mockGetStripeClient,
}));

import {
  buildStripeCheckoutSessionParams,
  createStripeCheckoutSession,
  StripeCheckoutError,
} from '@/server/payments/checkout';

const activeTokenPack = {
  active: true,
  bonusTokenAmount: 250,
  currency: 'usd',
  description: 'Pro pack',
  id: 'pack-pro',
  key: 'pro',
  name: 'Pro 2500',
  priceAmountCents: 3999,
  stripePriceId: 'price_pro_123',
  tokenAmount: 2500,
};

describe('checkout payments', () => {
  beforeEach(() => {
    mockDb.tokenPack.findUnique.mockReset();
    mockLogger.info.mockReset();
    mockGetStripeClient.mockReset();
  });

  it('builds trusted Stripe checkout session params', () => {
    const params = buildStripeCheckoutSessionParams({
      payerEmail: 'reader@example.com',
      tokenPack: {
        id: activeTokenPack.id,
        key: activeTokenPack.key,
        name: activeTokenPack.name,
        tokenAmount: activeTokenPack.tokenAmount,
        bonusTokenAmount: activeTokenPack.bonusTokenAmount,
        stripePriceId: activeTokenPack.stripePriceId,
      },
    });

    expect(params.customer_email).toBe('reader@example.com');
    expect(params.mode).toBe('subscription');
    expect(params.line_items).toEqual([
      {
        price: 'price_pro_123',
        quantity: 1,
      },
    ]);
    expect(params.metadata).toMatchObject({
      token_pack_id: 'pack-pro',
      token_pack_key: 'pro',
      total_tokens: '2750',
    });
    expect(params.subscription_data).toMatchObject({
      metadata: expect.objectContaining({
        token_pack_key: 'pro',
      }),
    });
    expect(params.success_url).toContain('/checkout/success');
    expect(params.cancel_url).toContain('/checkout/cancel');
  });

  it('creates a Stripe checkout session for an active mapped monthly plan', async () => {
    const stripeClient = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/c/pay/cs_test_123',
          }),
        },
      },
    };

    mockDb.tokenPack.findUnique.mockResolvedValue(activeTokenPack);

    const result = await createStripeCheckoutSession(
      {
        tokenPackKey: 'pro',
        payerEmail: 'reader@example.com',
      },
      {
        dbClient: mockDb,
        log: mockLogger,
        stripeClient,
      }
    );

    expect(result).toEqual({
      sessionId: 'cs_test_123',
      tokenPack: activeTokenPack,
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });
    expect(stripeClient.checkout.sessions.create).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalledOnce();
  });

  it('rejects checkout when Stripe is disabled', async () => {
    await expect(
      createStripeCheckoutSession(
        {
          tokenPackKey: 'pro',
          payerEmail: 'reader@example.com',
        },
        {
          stripeEnabled: false,
        }
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<StripeCheckoutError>>({
        code: 'stripe_disabled',
      })
    );
  });

  it('rejects checkout when the monthly plan has no Stripe price mapping', async () => {
    mockDb.tokenPack.findUnique.mockResolvedValue({
      ...activeTokenPack,
      stripePriceId: null,
    });

    await expect(
      createStripeCheckoutSession(
        {
          tokenPackKey: 'pro',
          payerEmail: 'reader@example.com',
        },
        {
          dbClient: mockDb,
        }
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<StripeCheckoutError>>({
        code: 'token_pack_unavailable',
      })
    );
  });

  it('rejects checkout when the monthly plan is missing', async () => {
    mockDb.tokenPack.findUnique.mockResolvedValue(null);

    await expect(
      createStripeCheckoutSession(
        {
          tokenPackKey: 'missing',
          payerEmail: 'reader@example.com',
        },
        {
          dbClient: mockDb,
        }
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<StripeCheckoutError>>({
        code: 'token_pack_not_found',
      })
    );
  });

  it('rejects checkout when Stripe does not return a hosted URL', async () => {
    const stripeClient = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: null,
          }),
        },
      },
    };

    mockDb.tokenPack.findUnique.mockResolvedValue(activeTokenPack);

    await expect(
      createStripeCheckoutSession(
        {
          tokenPackKey: 'pro',
          payerEmail: 'reader@example.com',
        },
        {
          dbClient: mockDb,
          stripeClient,
        }
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<StripeCheckoutError>>({
        code: 'checkout_unavailable',
      })
    );
  });
});
