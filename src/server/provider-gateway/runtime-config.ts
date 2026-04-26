import { z } from 'zod';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { ProviderType } from '@/server/db/generated/client';
import {
  fetchTextWithTimeout,
  parseJsonResponse,
} from '@/server/provider-gateway/utils';

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

const OPENAI_MODEL_OPTIONS_CACHE_MS = 5 * 60 * 1000;
const OPENAI_MODEL_OPTIONS_TIMEOUT_MS = 5000;

const zOpenAIModelsResponse = z.object({
  data: z.array(
    z.object({
      id: z.string().trim().min(1),
    })
  ),
});

let openAIModelOptionsCache:
  | {
      expiresAt: number;
      options: string[];
    }
  | undefined;

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
  return buildProviderGatewayRuntimeState({
    config: input.config,
    openAIModelOptions: [...OPENAI_MODEL_OPTIONS],
  });
}

export async function getProviderGatewayRuntimeStateWithDynamicModels(
  input: {
    config: ProviderGatewayRuntimeConfig;
  },
  deps?: {
    fetchFn?: typeof fetch;
    now?: () => number;
  }
) {
  return buildProviderGatewayRuntimeState({
    config: input.config,
    openAIModelOptions: await getOpenAIModelOptions(deps),
  });
}

export async function getOpenAIModelOptions(deps?: {
  fetchFn?: typeof fetch;
  now?: () => number;
}) {
  const apiKey = envServer.OPENAI_API_KEY;
  const fallbackOptions = [...OPENAI_MODEL_OPTIONS];

  if (!apiKey) {
    return fallbackOptions;
  }

  const now = deps?.now?.() ?? Date.now();

  if (openAIModelOptionsCache && openAIModelOptionsCache.expiresAt > now) {
    return openAIModelOptionsCache.options;
  }

  try {
    const response = await fetchTextWithTimeout({
      fetchFn: deps?.fetchFn,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      method: 'GET',
      provider: ProviderType.openai,
      timeoutMs: OPENAI_MODEL_OPTIONS_TIMEOUT_MS,
      url: 'https://api.openai.com/v1/models',
    });
    const parsed = zOpenAIModelsResponse.parse(
      parseJsonResponse<unknown>(
        ProviderType.openai,
        response.text,
        'OpenAI returned malformed model data'
      )
    );
    const options = Array.from(
      new Set(
        parsed.data
          .map((model) => model.id.trim())
          .filter(isOpenAITranslationModel)
          .sort((first, second) => first.localeCompare(second))
      )
    );
    const mergedOptions = mergeModelOptions(options, fallbackOptions);

    openAIModelOptionsCache = {
      expiresAt: now + OPENAI_MODEL_OPTIONS_CACHE_MS,
      options: mergedOptions,
    };

    return mergedOptions;
  } catch {
    return fallbackOptions;
  }
}

function buildProviderGatewayRuntimeState(input: {
  config: ProviderGatewayRuntimeConfig;
  openAIModelOptions: string[];
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
        modelOptions: mergeModelOptions(input.openAIModelOptions, [
          input.config.openaiTranslationModel,
        ]),
        provider: ProviderType.openai,
        reason: openaiEnabled ? null : 'OPENAI_API_KEY is not configured.',
      },
    ],
  };
}

function isOpenAITranslationModel(modelId: string) {
  if (
    [
      'audio',
      'dall-e',
      'embedding',
      'image',
      'moderation',
      'realtime',
      'speech',
      'transcribe',
      'tts',
      'whisper',
    ].some((blocked) => modelId.includes(blocked))
  ) {
    return false;
  }

  return (
    modelId.startsWith('gpt-') ||
    modelId.startsWith('chatgpt-') ||
    /^o\d/.test(modelId)
  );
}

function mergeModelOptions(
  primaryOptions: readonly string[],
  secondaryOptions: readonly string[]
) {
  return Array.from(
    new Set(
      [...secondaryOptions, ...primaryOptions]
        .map((option) => option.trim())
        .filter(Boolean)
    )
  );
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
