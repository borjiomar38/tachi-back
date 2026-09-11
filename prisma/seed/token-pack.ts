import { envServer } from '@/env/server';
import { db } from '@/server/db';

export const oneTimeTokenPacks = [
  {
    key: 'starter-tokens',
    name: 'Starter',
    tokenAmount: 250,
    priceAmountCents: 200,
    sortOrder: 10,
  },
  {
    key: 'pro-tokens',
    name: 'Pro',
    tokenAmount: 1250,
    priceAmountCents: 1000,
    sortOrder: 20,
  },
  {
    key: 'power-tokens',
    name: 'Power',
    tokenAmount: 2750,
    priceAmountCents: 2000,
    sortOrder: 30,
  },
] as const;

export async function createTokenPacks() {
  const variants: Record<string, string | undefined> = {
    'starter-tokens': envServer.LEMONSQUEEZY_ONE_TIME_VARIANT_STARTER,
    'pro-tokens': envServer.LEMONSQUEEZY_ONE_TIME_VARIANT_PRO,
    'power-tokens': envServer.LEMONSQUEEZY_ONE_TIME_VARIANT_POWER,
  };
  for (const pack of oneTimeTokenPacks) {
    // Do not mutate historical subscriptions or overwrite manager-edited prices.
    // New one-time variants are deliberately separate from the legacy env vars.
    await db.tokenPack.upsert({
      where: { key: pack.key },
      create: {
        ...pack,
        billingType: 'one_time',
        bonusTokenAmount: 0,
        currency: 'usd',
        lsVariantId: variants[pack.key] ?? null,
      },
      update: {},
    });
  }
  console.log(
    'One-time token packs checked; existing catalog settings preserved.'
  );
}
