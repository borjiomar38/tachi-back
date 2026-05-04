import { envServer } from '@/env/server';
import { db } from '@/server/db';

const tokenPacks = [
  {
    key: 'starter',
    name: 'Starter 50',
    description:
      '500 hosted OCR/translation tokens for about 50 chapters every month.',
    tokenAmount: 500,
    bonusTokenAmount: 0,
    priceAmountCents: 200,
    currency: 'usd',
    sortOrder: 10,
  },
  {
    key: 'pro',
    name: 'Pro 250',
    description:
      '2500 hosted OCR/translation tokens for about 250 chapters every month.',
    tokenAmount: 2500,
    bonusTokenAmount: 0,
    priceAmountCents: 1000,
    currency: 'usd',
    sortOrder: 20,
  },
  {
    key: 'power',
    name: 'Power 550',
    description:
      '5500 hosted OCR/translation tokens for about 550 chapters every month.',
    tokenAmount: 5500,
    bonusTokenAmount: 0,
    priceAmountCents: 2000,
    currency: 'usd',
    sortOrder: 30,
  },
] as const;

export async function createTokenPacks() {
  console.log(`⏳ Seeding token packs`);

  let createdCounter = 0;

  for (const tokenPack of tokenPacks) {
    const lsVariantId = getLsVariantId(tokenPack.key);
    const existing = await db.tokenPack.findUnique({
      where: { key: tokenPack.key },
      select: { id: true },
    });

    if (existing) {
      await db.tokenPack.update({
        where: { key: tokenPack.key },
        data: {
          ...tokenPack,
          lsVariantId,
        },
      });
      continue;
    }

    await db.tokenPack.create({
      data: {
        ...tokenPack,
        lsVariantId,
      },
    });
    createdCounter += 1;
  }

  console.log(
    `✅ ${tokenPacks.length} token pack definitions checked 👉 ${createdCounter} created`
  );
}

function getLsVariantId(tokenPackKey: (typeof tokenPacks)[number]['key']) {
  switch (tokenPackKey) {
    case 'starter':
      return envServer.LEMONSQUEEZY_VARIANT_TOKENS_STARTER ?? null;
    case 'pro':
      return envServer.LEMONSQUEEZY_VARIANT_TOKENS_PRO ?? null;
    case 'power':
      return envServer.LEMONSQUEEZY_VARIANT_TOKENS_POWER ?? null;
    default:
      return null;
  }
}
