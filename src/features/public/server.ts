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

interface TokenPackMarketingPresentation {
  marketedChaptersPerMonth: number;
  marketingSummary: string;
}

const CHAPTER_TOKEN_COST = 10;

const tokenPackMarketingSummaries: Record<string, string> = {
  power: 'For heavy readers',
  pro: 'Best for regular readers',
  starter: 'Good to start',
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
  const marketing = getMarketingPresentation(tokenPack);

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
  tokenPack: PublicTokenPackRow
): TokenPackMarketingPresentation {
  return {
    marketedChaptersPerMonth: Math.max(
      1,
      Math.floor(tokenPack.tokenAmount / CHAPTER_TOKEN_COST)
    ),
    marketingSummary:
      tokenPackMarketingSummaries[tokenPack.key] ??
      'Monthly manga and manhwa translation',
  };
}
