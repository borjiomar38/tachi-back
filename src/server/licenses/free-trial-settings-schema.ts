import { z } from 'zod';

export const DEFAULT_FREE_TRIAL_TOKEN_AMOUNT = 25;
export const FREE_TRIAL_CONFIG_KEY = 'free_trial_runtime_config';

const createFreeTrialDeliveryModeSchema = () =>
  z.enum(['direct', 'email_code']);

export const zFreeTrialDeliveryMode = createFreeTrialDeliveryModeSchema();

const createFreeTrialRuntimeConfigSchema = () =>
  z
    .object({
      deliveryMode: zFreeTrialDeliveryMode,
      emailRiskReviewEnabled: z.boolean(),
      enabled: z.boolean(),
      tokenAmount: z.number().int().min(1).max(10_000),
    })
    .strict();

export const zFreeTrialRuntimeConfig = createFreeTrialRuntimeConfigSchema();

export type FreeTrialRuntimeConfig = z.infer<typeof zFreeTrialRuntimeConfig>;

export const getDefaultFreeTrialRuntimeConfig = (): FreeTrialRuntimeConfig => ({
  deliveryMode: 'direct',
  emailRiskReviewEnabled: false,
  enabled: true,
  tokenAmount: DEFAULT_FREE_TRIAL_TOKEN_AMOUNT,
});
