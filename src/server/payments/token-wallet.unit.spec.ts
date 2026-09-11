import { describe, expect, it } from 'vitest';

import { resolveTokenWallet } from '@/server/payments/token-wallet';

const credit = (amount: number) => ({
  deltaTokens: amount,
  metadata: {},
  type: 'purchase_credit' as const,
});
const purchase = (amount: number) => ({
  ...credit(amount),
  metadata: { purchaseType: 'one_time' },
});
const spend = (amount: number) => ({
  deltaTokens: -amount,
  metadata: {},
  type: 'job_spend' as const,
});

describe('token wallet pools', () => {
  it('spends expiring tokens first and preserves one-time purchases through renewal', () => {
    expect(
      resolveTokenWallet([credit(500), purchase(250), spend(400)])
    ).toEqual({
      hasOneTimePurchase: true,
      recurringTokens: 100,
      purchasedTokens: 250,
    });
  });
  it('uses purchased tokens once the expiring allowance is depleted', () => {
    expect(
      resolveTokenWallet([credit(25), purchase(250), spend(100)])
        .purchasedTokens
    ).toBe(175);
  });
  it('does not bring spent tokens back when a recurring grant arrives', () => {
    expect(
      resolveTokenWallet([purchase(250), spend(100), credit(500)])
    ).toEqual({
      hasOneTimePurchase: true,
      recurringTokens: 500,
      purchasedTokens: 150,
    });
  });
  it('leaves legacy-only wallets unchanged', () => {
    expect(resolveTokenWallet([credit(500), spend(125)])).toEqual({
      hasOneTimePurchase: false,
      recurringTokens: 375,
      purchasedTokens: 0,
    });
  });
});
