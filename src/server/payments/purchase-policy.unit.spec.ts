import { describe, expect, it } from 'vitest';

import {
  isTokenPurchaseEvent,
  resolvePurchaseDestination,
  resolvePurchaseTestMode,
} from '@/server/payments/purchase-policy';

describe('one-time checkout environment isolation', () => {
  it('allows test checkout in staging and production', () => {
    expect(
      resolvePurchaseTestMode({ testMode: true, environmentName: 'STAGING' })
    ).toBe(true);
    expect(
      resolvePurchaseTestMode({ testMode: true, environmentName: 'PRODUCTION' })
    ).toBe(true);
  });
  it('forbids live payments in staging or an unspecified environment', () => {
    for (const environmentName of ['STAGING', 'LOCAL', undefined]) {
      expect(() =>
        resolvePurchaseTestMode({ testMode: false, environmentName })
      ).toThrow('live_checkout_forbidden_outside_production');
    }
    expect(
      resolvePurchaseTestMode({
        testMode: false,
        environmentName: 'PRODUCTION',
      })
    ).toBe(false);
  });
});

describe('explicit code destination', () => {
  const now = new Date('2026-09-11');
  const redeem = {
    id: 'code-a',
    licenseId: 'wallet-a',
    status: 'redeemed',
    expiresAt: null,
  };
  it('creates an independent code even when a wallet is active', () => {
    expect(
      resolvePurchaseDestination({
        destination: 'new_code',
        currentLicenseId: 'wallet-a',
        redeem,
        now,
      })
    ).toEqual({ targetLicenseId: null, targetRedeemCodeId: null });
  });
  it('requires explicit destination from old authenticated clients, but guests get a new code', () => {
    expect(() =>
      resolvePurchaseDestination({ currentLicenseId: 'wallet-a', now })
    ).toThrow('purchase_destination_required');
    expect(resolvePurchaseDestination({ now })).toEqual({
      targetLicenseId: null,
      targetRedeemCodeId: null,
    });
  });
  it('freezes both the exact redeem and its wallet for recharge', () => {
    expect(
      resolvePurchaseDestination({
        destination: 'recharge',
        currentLicenseId: 'wallet-a',
        redeem,
        now,
      })
    ).toEqual({ targetLicenseId: 'wallet-a', targetRedeemCodeId: 'code-a' });
  });
  it('rejects recharge without the current authenticated code', () => {
    for (const data of [
      {},
      { currentLicenseId: 'wallet-a' },
      { currentLicenseId: 'wallet-b', redeem },
    ]) {
      expect(() =>
        resolvePurchaseDestination({ destination: 'recharge', ...data, now })
      ).toThrow('purchase_code_mismatch');
    }
  });
  it('rejects revoked or expired codes before creating a checkout', () => {
    for (const code of [
      { ...redeem, status: 'revoked' },
      { ...redeem, expiresAt: new Date(0) },
    ]) {
      expect(() =>
        resolvePurchaseDestination({
          destination: 'recharge',
          currentLicenseId: 'wallet-a',
          redeem: code,
          now,
        })
      ).toThrow('redeem_code_unavailable');
    }
  });
});

describe('one-time fulfillment routing', () => {
  it('only mints tokens for a new purchase, never for another signed event', () => {
    const custom_data = { token_purchase_id: 'purchase-1' };
    expect(
      isTokenPurchaseEvent({
        meta: { event_name: 'order_created', custom_data },
      })
    ).toBe(true);
    expect(
      isTokenPurchaseEvent({ meta: { event_name: 'order_created' } })
    ).toBe(false);
    expect(
      isTokenPurchaseEvent({
        meta: { event_name: 'order_refunded', custom_data },
      })
    ).toBe(false);
    expect(
      isTokenPurchaseEvent({
        meta: { event_name: 'license_key_created', custom_data },
      })
    ).toBe(false);
  });
});
