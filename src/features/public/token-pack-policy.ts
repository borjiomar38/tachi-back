import type { PublicTokenPack } from '@/features/public/data';

export const getBestValuePackId = (
  packs: PublicTokenPack[]
): string | undefined => {
  const paid = packs.filter((pack) => pack.priceAmountCents > 0);
  if (
    paid.length < 2 ||
    new Set(paid.map((pack) => pack.currency.toLowerCase())).size !== 1
  )
    return undefined;
  const sorted = [...paid].sort(
    (a, b) =>
      b.totalTokens / b.priceAmountCents - a.totalTokens / a.priceAmountCents
  );
  const [best, next] = sorted;
  if (!best || !next) return undefined;
  return best.totalTokens / best.priceAmountCents >
    next.totalTokens / next.priceAmountCents
    ? best.id
    : undefined;
};
