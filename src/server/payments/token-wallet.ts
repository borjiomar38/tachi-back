import type { Prisma, TokenLedger } from '@/server/db/generated/client';

type WalletEntry = Pick<TokenLedger, 'deltaTokens' | 'metadata' | 'type'>;
export const walletEntrySelect = {
  deltaTokens: true,
  metadata: true,
  type: true,
} as const;
export interface WalletReader {
  tokenLedger: {
    findMany: (args: {
      where: { licenseId: string; status: 'posted' };
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }];
      select: typeof walletEntrySelect;
    }) => Promise<WalletEntry[]>;
  };
}
const isOneTimeCredit = (entry: WalletEntry) => {
  const metadata = entry.metadata as Prisma.JsonObject | null;
  return entry.deltaTokens > 0 && metadata?.purchaseType === 'one_time';
};
// Spending consumes the expiring allowance first, preserving the purchased
// one-time pool. This is shared by renewal and legacy-plan upgrade callers.
export const resolveTokenWallet = (entries: readonly WalletEntry[]) => {
  let recurring = 0;
  let purchased = 0;
  let hasOneTimePurchase = false;
  for (const entry of entries) {
    if (isOneTimeCredit(entry)) {
      hasOneTimePurchase = true;
      purchased += entry.deltaTokens;
    } else {
      recurring += entry.deltaTokens;
    }
    if (recurring < 0 && purchased > 0) {
      const fromPurchased = Math.min(purchased, -recurring);
      purchased -= fromPurchased;
      recurring += fromPurchased;
    }
  }
  return {
    hasOneTimePurchase,
    purchasedTokens: Math.max(0, purchased),
    recurringTokens: Math.max(0, recurring),
  };
};
export const readTokenWallet = async (
  reader: WalletReader,
  licenseId: string
) =>
  resolveTokenWallet(
    await reader.tokenLedger.findMany({
      where: { licenseId, status: 'posted' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: walletEntrySelect,
    })
  );
