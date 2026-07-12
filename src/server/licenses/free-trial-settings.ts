import { z } from 'zod';

import { db } from '@/server/db';

export const DEFAULT_FREE_TRIAL_TOKEN_AMOUNT = 25;
export const FREE_TRIAL_CONFIG_KEY = 'free_trial_runtime_config';

export const zFreeTrialDeliveryMode = z.enum(['direct', 'email_code']);

export const zFreeTrialRuntimeConfig = z
  .object({
    deliveryMode: zFreeTrialDeliveryMode,
    emailRiskReviewEnabled: z.boolean(),
    enabled: z.boolean(),
    tokenAmount: z.number().int().min(1).max(10_000),
  })
  .strict();

const zStoredFreeTrialRuntimeConfig = zFreeTrialRuntimeConfig.partial();

export type FreeTrialRuntimeConfig = z.infer<typeof zFreeTrialRuntimeConfig>;

export function getDefaultFreeTrialRuntimeConfig(): FreeTrialRuntimeConfig {
  return {
    deliveryMode: 'direct',
    emailRiskReviewEnabled: false,
    enabled: true,
    tokenAmount: DEFAULT_FREE_TRIAL_TOKEN_AMOUNT,
  };
}

export async function getFreeTrialRuntimeConfig(deps?: {
  dbClient?: typeof db;
}) {
  const dbClient = deps?.dbClient ?? db;
  const appConfig = dbClient.appConfig as
    | {
        findUnique: typeof db.appConfig.findUnique;
      }
    | undefined;

  if (!appConfig) {
    return {
      current: getDefaultFreeTrialRuntimeConfig(),
      updatedAt: null,
    };
  }

  const entry = await appConfig.findUnique({
    select: {
      updatedAt: true,
      value: true,
    },
    where: {
      key: FREE_TRIAL_CONFIG_KEY,
    },
  });
  const parsedValue = zStoredFreeTrialRuntimeConfig.safeParse(entry?.value);

  return {
    current: zFreeTrialRuntimeConfig.parse({
      ...getDefaultFreeTrialRuntimeConfig(),
      ...(parsedValue.success ? parsedValue.data : {}),
    }),
    updatedAt: entry?.updatedAt ?? null,
  };
}

export async function updateFreeTrialRuntimeConfig(
  input: FreeTrialRuntimeConfig,
  deps?: {
    dbClient?: typeof db;
  }
) {
  const dbClient = deps?.dbClient ?? db;
  const current = zFreeTrialRuntimeConfig.parse(input);
  const entry = await dbClient.appConfig.upsert({
    create: {
      key: FREE_TRIAL_CONFIG_KEY,
      value: current,
    },
    select: {
      updatedAt: true,
      value: true,
    },
    update: {
      value: current,
    },
    where: {
      key: FREE_TRIAL_CONFIG_KEY,
    },
  });

  return {
    current: zFreeTrialRuntimeConfig.parse(entry.value),
    updatedAt: entry.updatedAt,
  };
}
