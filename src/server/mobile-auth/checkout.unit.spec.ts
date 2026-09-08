import { describe, expect, it, vi } from 'vitest';

const { mockGetCheckoutTokenPack, mockGetSubscriptionSummary } = vi.hoisted(
  () => ({
    mockGetCheckoutTokenPack: vi.fn(),
    mockGetSubscriptionSummary: vi.fn(),
  })
);

vi.mock('@/server/db', () => ({ db: {} }));
vi.mock('@/env/server', () => ({
  envServer: {
    MOBILE_API_JWT_SECRET: 'test-mobile-checkout-secret-that-is-long-enough',
  },
}));
vi.mock('@/server/payments/checkout', () => ({
  createLemonSqueezyCheckout: vi.fn(),
  getCheckoutTokenPackByKey: mockGetCheckoutTokenPack,
}));
vi.mock('@/server/mobile-auth/subscription', () => ({
  getMobileLicenseSubscriptionSummary: mockGetSubscriptionSummary,
}));

import {
  claimMobileSubscriptionCheckout,
  createMobileSubscriptionCheckout,
  MobileCheckoutError,
  resolveMobileCheckoutEligibility,
} from '@/server/mobile-auth/checkout';

describe('mobile subscription checkout policy', () => {
  it('allows a pending installation without a subscription', () => {
    expect(() =>
      resolveMobileCheckoutEligibility({
        deviceStatus: 'pending',
      })
    ).not.toThrow();
  });

  it('blocks duplicate checkout for an active subscription', () => {
    expect(() =>
      resolveMobileCheckoutEligibility({
        deviceStatus: 'active',
        licenseStatus: 'active',
        subscriptionStatus: 'active',
      })
    ).toThrowError(
      expect.objectContaining({ code: 'checkout_already_active' })
    );
  });

  it('blocks a revoked installation', () => {
    expect(() =>
      resolveMobileCheckoutEligibility({
        deviceStatus: 'revoked',
      })
    ).toThrowError(expect.objectContaining({ code: 'device_unavailable' }));
  });
});

describe('mobile subscription checkout intent', () => {
  it('creates a signed device-bound intent and exchanges it after payment', async () => {
    const now = new Date('2026-08-24T12:00:00.000Z');
    let tokenHash = '';
    const mobileCheckoutIntent = {
      create: vi.fn().mockImplementation(async ({ data }) => {
        tokenHash = data.tokenHash;
        return { id: 'checkout-intent-1' };
      }),
      findUnique: vi.fn().mockImplementation(async () => ({
        claimCount: 0,
        device: {
          id: 'device-1',
          installationId: 'android-11111111-1111-4111-8111-111111111111',
          status: 'active',
        },
        expiresAt: new Date('2026-08-25T12:00:00.000Z'),
        id: 'checkout-intent-1',
        license: {
          id: 'license-1',
          status: 'active',
        },
        paidAt: new Date('2026-08-24T12:02:00.000Z'),
        status: 'paid',
        tokenHash,
        tokenPack: {
          bonusTokenAmount: 0,
          currency: 'usd',
          key: 'starter',
          name: 'Starter 50',
          priceAmountCents: 200,
          tokenAmount: 50,
        },
      })),
      update: vi.fn().mockResolvedValue({ id: 'checkout-intent-1' }),
    };
    const dbClient = {
      device: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'device-1',
          installationId: 'android-11111111-1111-4111-8111-111111111111',
          licenseBindings: [],
          status: 'pending',
        }),
      },
      mobileCheckoutIntent,
    };
    const tokenPack = {
      active: true,
      bonusTokenAmount: 0,
      currency: 'usd',
      description: null,
      id: 'pack-starter',
      key: 'starter',
      lsVariantId: '123',
      name: 'Starter 50',
      priceAmountCents: 200,
      tokenAmount: 50,
    };
    mockGetCheckoutTokenPack.mockResolvedValue(tokenPack);
    mockGetSubscriptionSummary.mockResolvedValue(null);
    const createCheckoutFn = vi.fn().mockResolvedValue({
      checkoutId: 'ls-checkout-1',
      tokenPack,
      url: 'https://checkout.lemonsqueezy.test/checkout-1',
    });

    const checkout = await createMobileSubscriptionCheckout(
      null,
      {
        installationId: 'android-11111111-1111-4111-8111-111111111111',
        tokenPackKey: 'starter',
      },
      {
        baseUrl: 'https://tachiyomiat.com',
        createCheckoutFn: createCheckoutFn as never,
        dbClient: dbClient as never,
        now,
        signingSecret: 'test-mobile-checkout-secret-that-is-long-enough',
      }
    );

    expect(checkout.intentToken).toMatch(/^checkout-intent-1\.[^.]+\.[^.]+$/);
    expect(createCheckoutFn).toHaveBeenCalledWith(
      expect.objectContaining({ tokenPackKey: 'starter' }),
      expect.objectContaining({
        mobileCheckout: {
          intentId: 'checkout-intent-1',
          returnToken: checkout.intentToken,
        },
      })
    );

    const auth = {
      accessToken: 'access-token',
      accessTokenExpiresAt: new Date('2026-08-24T12:15:00.000Z'),
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date('2026-09-24T12:00:00.000Z'),
      session: {
        createdAt: now,
        deviceId: 'device-1',
        expiresAt: new Date('2026-09-24T12:00:00.000Z'),
        id: 'session-1',
        installationId: 'android-11111111-1111-4111-8111-111111111111',
        licenseId: 'license-1',
      },
    };
    const claim = await claimMobileSubscriptionCheckout(
      {
        installationId: 'android-11111111-1111-4111-8111-111111111111',
        intentToken: checkout.intentToken,
      },
      {
        createMobileSessionFn: vi.fn().mockResolvedValue(auth) as never,
        dbClient: dbClient as never,
        now: new Date('2026-08-24T12:03:00.000Z'),
        signingSecret: 'test-mobile-checkout-secret-that-is-long-enough',
      }
    );

    expect(claim.state).toBe('paid');
    expect(claim.auth).toEqual(auth);
    expect(mobileCheckoutIntent.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          claimCount: { increment: 1 },
        }),
      })
    );
  });

  it('rejects a tampered return token', async () => {
    await expect(
      claimMobileSubscriptionCheckout(
        {
          installationId: 'android-11111111-1111-4111-8111-111111111111',
          intentToken: `${'a'.repeat(64)}.tampered.signature`,
        },
        {
          dbClient: {} as never,
          signingSecret: 'test-mobile-checkout-secret-that-is-long-enough',
        }
      )
    ).rejects.toBeInstanceOf(MobileCheckoutError);
  });
});
