import { db } from '@/server/db';
import {
  FREE_TRIAL_CONFIG_KEY,
  type FreeTrialRuntimeConfig,
  getDefaultFreeTrialRuntimeConfig,
  zFreeTrialRuntimeConfig,
} from '@/server/licenses/free-trial-settings-schema';

export type { FreeTrialRuntimeConfig } from '@/server/licenses/free-trial-settings-schema';
export {
  DEFAULT_FREE_TRIAL_TOKEN_AMOUNT,
  FREE_TRIAL_CONFIG_KEY,
  getDefaultFreeTrialRuntimeConfig,
  zFreeTrialDeliveryMode,
  zFreeTrialRuntimeConfig,
} from '@/server/licenses/free-trial-settings-schema';

const zStoredFreeTrialRuntimeConfig = zFreeTrialRuntimeConfig.partial();

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
