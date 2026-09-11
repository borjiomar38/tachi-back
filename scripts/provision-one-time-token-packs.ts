import { db } from '@/server/db';

import { createTokenPacks,oneTimeTokenPacks } from '../prisma/seed/token-pack';

const main = async () => {
  const existing = await db.tokenPack.findMany({
    where: { key: { in: oneTimeTokenPacks.map((pack) => pack.key) } },
    select: {
      key: true,
      billingType: true,
      tokenAmount: true,
      priceAmountCents: true,
      lsVariantId: true,
    },
  });
  console.table(
    oneTimeTokenPacks.map((pack) => ({
      ...pack,
      exists: existing.some((row) => row.key === pack.key),
      action: existing.some((row) => row.key === pack.key)
        ? 'preserve'
        : 'create one-time pack',
    }))
  );
  if (!process.argv.includes('--apply')) {
    console.log(
      'Preview only. Pass --apply to add missing packs; existing packs and subscriptions are never changed.'
    );
    return;
  }
  await createTokenPacks();
  console.log(
    'Map each NEW one-time Lemon variant in the token_packs catalog (lsVariantId), or set LEMONSQUEEZY_ONE_TIME_VARIANT_STARTER/PRO/POWER before creating the packs. Do not reuse legacy subscription variants.'
  );
};
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'Provisioning failed'
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
