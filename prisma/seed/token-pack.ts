import { envServer } from '@/env/server';
import { db } from '@/server/db';

const tokenPacks = [
  {
    key: 'starter',
    name: 'Starter 500',
    description: '500 hosted OCR/translation tokens for light usage.',
    tokenAmount: 500,
    bonusTokenAmount: 0,
    priceAmountCents: 999,
    currency: 'usd',
    sortOrder: 10,
  },
  {
    key: 'pro',
    name: 'Pro 2500',
    description: '2500 tokens plus a small bonus for regular readers.',
    tokenAmount: 2500,
    bonusTokenAmount: 250,
    priceAmountCents: 3999,
    currency: 'usd',
    sortOrder: 20,
  },
  {
    key: 'power',
    name: 'Power 7500',
    description: '7500 tokens plus a larger bonus for heavy usage.',
    tokenAmount: 7500,
    bonusTokenAmount: 1000,
    priceAmountCents: 9999,
    currency: 'usd',
    sortOrder: 30,
  },
] as const;

export async function createTokenPacks() {
  console.log(`⏳ Seeding token packs`);

  let createdCounter = 0;

  for (const tokenPack of tokenPacks) {
    const stripePriceId = getStripePriceId(tokenPack.key);
    const existing = await db.tokenPack.findUnique({
      where: { key: tokenPack.key },
      select: { id: true },
    });

    if (existing) {
      await db.tokenPack.update({
        where: { key: tokenPack.key },
        data: {
          ...tokenPack,
          stripePriceId,
        },
      });
      continue;
    }

    await db.tokenPack.create({
      data: {
        ...tokenPack,
        stripePriceId,
      },
    });
    createdCounter += 1;
  }

  console.log(
    `✅ ${tokenPacks.length} token pack definitions checked 👉 ${createdCounter} created`
  );
}

function getStripePriceId(tokenPackKey: (typeof tokenPacks)[number]['key']) {
  switch (tokenPackKey) {
    case 'starter':
      return envServer.STRIPE_PRICE_TOKENS_STARTER ?? null;
    case 'pro':
      return envServer.STRIPE_PRICE_TOKENS_PRO ?? null;
    case 'power':
      return envServer.STRIPE_PRICE_TOKENS_POWER ?? null;
    default:
      return null;
  }
}
