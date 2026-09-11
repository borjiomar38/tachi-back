import { describe, expect, it } from 'vitest';

import {
  isTokenPurchaseEvent,
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
