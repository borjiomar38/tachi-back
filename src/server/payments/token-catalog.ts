import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { getFreeTrialRuntimeConfig } from '@/server/licenses/free-trial-settings';
import { getTokenConsumption } from '@/server/payments/token-consumption';

export const getTokenCatalog = async () => {
  const [packs, trial] = await Promise.all([
    db.tokenPack.findMany({
      where: { active: true, billingType: 'one_time' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        tokenAmount: true,
        bonusTokenAmount: true,
        priceAmountCents: true,
        currency: true,
        lsVariantId: true,
      },
    }),
    getFreeTrialRuntimeConfig(),
  ]);
  return {
    purchaseFlowVersion: 2,
    packs: packs.map(({ lsVariantId, ...pack }) => ({
      ...pack,
      totalTokens: pack.tokenAmount + pack.bonusTokenAmount,
      billingType: 'one_time' as const,
      checkoutEnabled: envServer.LEMONSQUEEZY_ENABLED && Boolean(lsVariantId),
    })),
    freeTrial: {
      enabled: trial.current.enabled,
      tokenAmount: trial.current.tokenAmount,
    },
    consumption: getTokenConsumption(),
  };
};
