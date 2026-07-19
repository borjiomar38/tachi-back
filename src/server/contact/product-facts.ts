import { db } from '@/server/db';
import { getFreeTrialRuntimeConfig } from '@/server/licenses/free-trial-settings';

export interface ContactProductFacts {
  billingCadence: 'monthly';
  freeTrial: {
    enabled: boolean;
    tokenAmount: number;
  };
  plans: Array<{
    bonusTokenAmount: number;
    currency: string;
    name: string;
    priceAmountCents: number;
    tokenAmount: number;
  }>;
}

export const getContactProductFacts =
  async (): Promise<ContactProductFacts> => {
    const [plans, freeTrial] = await Promise.all([
      db.tokenPack.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          bonusTokenAmount: true,
          currency: true,
          name: true,
          priceAmountCents: true,
          tokenAmount: true,
        },
        where: { active: true },
      }),
      getFreeTrialRuntimeConfig(),
    ]);

    return {
      billingCadence: 'monthly',
      freeTrial: {
        enabled: freeTrial.current.enabled,
        tokenAmount: freeTrial.current.tokenAmount,
      },
      plans,
    };
  };
