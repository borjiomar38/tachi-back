import { z } from 'zod';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { ProviderType } from '@/server/db/generated/client';

export const GEMINI_MODEL_OPTIONS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
] as const;

export const OPENAI_MODEL_OPTIONS = [
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-4o-mini',
] as const;

export const zTranslationProviderPrimary = z.enum(['gemini', 'openai']);

export const zProviderGatewayRuntimeConfig = z.object({
  geminiTranslationModel: z.string().trim().min(1),
  openaiTranslationModel: z.string().trim().min(1),
  translationProviderPrimary: zTranslationProviderPrimary,
});

const zStoredProviderGatewayRuntimeConfig =
  zProviderGatewayRuntimeConfig.partial();

const PROVIDER_GATEWAY_RUNTIME_CONFIG_KEY = 'provider_gateway_runtime';

export type ProviderGatewayRuntimeConfig = z.infer<
  typeof zProviderGatewayRuntimeConfig
>;

export async function getProviderGatewayRuntimeConfig(deps?: {
  dbClient?: typeof db;
}) {
  const dbClient = deps?.dbClient ?? db;
  const entry = await dbClient.appConfig.findUnique({
    where: {
      key: PROVIDER_GATEWAY_RUNTIME_CONFIG_KEY,
    },
    select: {
      updatedAt: true,
      value: true,
    },
  });

  const parsedValue = zStoredProviderGatewayRuntimeConfig.safeParse(
    entry?.value
  );

  const current = zProviderGatewayRuntimeConfig.parse({
    ...getDefaultProviderGatewayRuntimeConfig(),
    ...(parsedValue.success ? parsedValue.data : {}),
  });

  return {
    current,
    updatedAt: entry?.updatedAt ?? null,
  };
}

export async function updateProviderGatewayRuntimeConfig(
  input: ProviderGatewayRuntimeConfig,
  deps?: {
    dbClient?: typeof db;
  }
) {
  const dbClient = deps?.dbClient ?? db;
  const parsed = zProviderGatewayRuntimeConfig.parse(input);

  const entry = await dbClient.appConfig.upsert({
    where: {
      key: PROVIDER_GATEWAY_RUNTIME_CONFIG_KEY,
    },
    create: {
      key: PROVIDER_GATEWAY_RUNTIME_CONFIG_KEY,
      value: parsed,
    },
    update: {
      value: parsed,
    },
    select: {
      updatedAt: true,
      value: true,
    },
  });

  return {
    current: zProviderGatewayRuntimeConfig.parse(entry.value),
    updatedAt: entry.updatedAt,
  };
}

export function getDefaultProviderGatewayRuntimeConfig(): ProviderGatewayRuntimeConfig {
  return {
    geminiTranslationModel: envServer.GEMINI_TRANSLATION_MODEL,
    openaiTranslationModel: envServer.OPENAI_TRANSLATION_MODEL,
    translationProviderPrimary: getDefaultTranslationProviderPrimary(),
  };
}

export function getEffectiveTranslationModel(input: {
  config: ProviderGatewayRuntimeConfig;
  provider: 'gemini' | 'openai';
}) {
  return input.provider === 'gemini'
    ? input.config.geminiTranslationModel
    : input.config.openaiTranslationModel;
}

export function getProviderGatewayRuntimeState(input: {
  config: ProviderGatewayRuntimeConfig;
}) {
  const geminiEnabled = Boolean(envServer.GEMINI_API_KEY);
  const openaiEnabled = Boolean(envServer.OPENAI_API_KEY);
  const googleCloudVisionEnabled = Boolean(
    envServer.GOOGLE_CLOUD_VISION_API_KEY
  );

  return {
    current: input.config,
    ocr: {
      enabled: googleCloudVisionEnabled,
      modelName: 'TEXT_DETECTION',
      provider: ProviderType.google_cloud_vision,
      reason: googleCloudVisionEnabled
        ? null
        : 'GOOGLE_CLOUD_VISION_API_KEY is not configured.',
    },
    translationProviders: [
      {
        enabled: geminiEnabled,
        modelName: input.config.geminiTranslationModel,
        modelOptions: [...GEMINI_MODEL_OPTIONS],
        provider: ProviderType.gemini,
        reason: geminiEnabled ? null : 'GEMINI_API_KEY is not configured.',
      },
      {
        enabled: openaiEnabled,
        modelName: input.config.openaiTranslationModel,
        modelOptions: [...OPENAI_MODEL_OPTIONS],
        provider: ProviderType.openai,
        reason: openaiEnabled ? null : 'OPENAI_API_KEY is not configured.',
      },
    ],
  };
}

function getDefaultTranslationProviderPrimary(): 'gemini' | 'openai' {
  if (envServer.TRANSLATION_PROVIDER_PRIMARY === 'gemini') {
    return 'gemini';
  }

  if (envServer.TRANSLATION_PROVIDER_PRIMARY === 'openai') {
    return 'openai';
  }

  if (envServer.GEMINI_API_KEY) {
    return 'gemini';
  }

  if (envServer.OPENAI_API_KEY) {
    return 'openai';
  }

  return 'gemini';
}
