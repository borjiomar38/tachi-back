import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { envServer } from '@/env/server';
import type { PublicTokenPack } from '@/features/public/data';
import { db } from '@/server/db';

const publicTokenPackSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  tokenAmount: true,
  bonusTokenAmount: true,
  priceAmountCents: true,
  currency: true,
  lsVariantId: true,
} as const;

const zPublicTokenPackByKeyInput = z.object({
  tokenPackKey: z.string().trim().min(1).max(64),
});

type PublicTokenPackRow = {
  bonusTokenAmount: number;
  currency: string;
  description: string | null;
  id: string;
  key: string;
  name: string;
  priceAmountCents: number;
  lsVariantId: string | null;
  tokenAmount: number;
};

export const getPublicTokenPacks = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PublicTokenPack[]> => {
    const tokenPacks = await db.tokenPack.findMany({
      where: {
        active: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: publicTokenPackSelect,
    });

    return tokenPacks.map(mapPublicTokenPack);
  }
);

export const getPublicTokenPackByKey = createServerFn({ method: 'GET' })
  .inputValidator(zPublicTokenPackByKeyInput)
  .handler(async ({ data }): Promise<PublicTokenPack | null> => {
    const tokenPack = await db.tokenPack.findFirst({
      where: {
        key: data.tokenPackKey,
        active: true,
      },
      select: publicTokenPackSelect,
    });

    return tokenPack ? mapPublicTokenPack(tokenPack) : null;
  });

function mapPublicTokenPack(tokenPack: PublicTokenPackRow): PublicTokenPack {
  const totalTokens = tokenPack.tokenAmount + tokenPack.bonusTokenAmount;
  const estimatedPages = Math.max(
    1,
    Math.floor(totalTokens / envServer.JOB_TOKENS_PER_PAGE)
  );
  const estimatedChapters = Math.max(1, Math.round(estimatedPages / 20));
  const marketing = getMarketingPresentation(tokenPack.key, estimatedChapters);

  return {
    ...tokenPack,
    estimatedChapters,
    estimatedPages,
    totalTokens,
    checkoutEnabled: envServer.LEMONSQUEEZY_ENABLED && !!tokenPack.lsVariantId,
    marketedChaptersPerMonth: marketing.marketedChaptersPerMonth,
    marketingSummary: marketing.marketingSummary,
  };
}

function getMarketingPresentation(
  tokenPackKey: string,
  estimatedChapters: number
) {
  switch (tokenPackKey) {
    case 'starter':
      return {
        marketedChaptersPerMonth: 100,
        marketingSummary: 'Good to start',
      };
    case 'pro':
      return {
        marketedChaptersPerMonth: 500,
        marketingSummary: 'Best for regular readers',
      };
    case 'power':
      return {
        marketedChaptersPerMonth: 1500,
        marketingSummary: 'For heavy readers',
      };
    default:
      return {
        marketedChaptersPerMonth: estimatedChapters,
        marketingSummary: 'Monthly manga and manhwa translation',
      };
  }
}
