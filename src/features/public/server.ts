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
  stripePriceId: true,
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
  stripePriceId: string | null;
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
  return {
    ...tokenPack,
    totalTokens: tokenPack.tokenAmount + tokenPack.bonusTokenAmount,
    checkoutEnabled: envServer.STRIPE_ENABLED && !!tokenPack.stripePriceId,
  };
}
