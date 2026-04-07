import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { ProviderType } from '@/server/db/generated/client';
import {
  getProviderGatewayRuntimeConfig,
  getProviderGatewayRuntimeState,
} from '@/server/provider-gateway/runtime-config';
import { zProviderGatewayManifest } from '@/server/provider-gateway/schema';

export function getProviderGatewayManifest() {
  const ocrProviders = [
    {
      enabled: Boolean(envServer.GOOGLE_CLOUD_VISION_API_KEY),
      isDefault:
        envServer.OCR_PROVIDER_PRIMARY === 'google_cloud_vision' &&
        Boolean(envServer.GOOGLE_CLOUD_VISION_API_KEY),
      launchStage: 'primary' as const,
      modelName: 'TEXT_DETECTION',
      provider: ProviderType.google_cloud_vision,
      supportedByGateway: true,
    },
  ];

  const translationProviders = [
    {
      enabled: Boolean(envServer.GEMINI_API_KEY),
      isDefault:
        envServer.TRANSLATION_PROVIDER_PRIMARY === 'gemini' &&
        Boolean(envServer.GEMINI_API_KEY),
      launchStage: 'primary' as const,
      modelName: envServer.GEMINI_TRANSLATION_MODEL,
      provider: ProviderType.gemini,
      supportedByGateway: true,
    },
    {
      enabled: Boolean(envServer.OPENAI_API_KEY),
      isDefault:
        envServer.TRANSLATION_PROVIDER_PRIMARY === 'openai' &&
        Boolean(envServer.OPENAI_API_KEY),
      launchStage: 'primary' as const,
      modelName: envServer.OPENAI_TRANSLATION_MODEL,
      provider: ProviderType.openai,
      supportedByGateway: true,
    },
    {
      enabled: Boolean(envServer.ANTHROPIC_API_KEY),
      isDefault:
        envServer.TRANSLATION_PROVIDER_PRIMARY === 'anthropic' &&
        Boolean(envServer.ANTHROPIC_API_KEY),
      launchStage: 'primary' as const,
      modelName: envServer.ANTHROPIC_TRANSLATION_MODEL,
      provider: ProviderType.anthropic,
      supportedByGateway: true,
    },
    {
      enabled: Boolean(envServer.GOOGLE_CLOUD_TRANSLATE_API_KEY),
      isDefault: false,
      launchStage: 'compatibility' as const,
      modelName: null,
      provider: ProviderType.google_cloud_translate,
      supportedByGateway: false,
    },
    {
      enabled: Boolean(envServer.OPENROUTER_API_KEY),
      isDefault: false,
      launchStage: 'compatibility' as const,
      modelName: null,
      provider: ProviderType.openrouter,
      supportedByGateway: false,
    },
  ];

  const defaultOcrProvider =
    ocrProviders.find((provider) => provider.isDefault)?.provider ??
    ocrProviders.find(
      (provider) => provider.enabled && provider.supportedByGateway
    )?.provider;
  const defaultTranslationProvider =
    translationProviders.find((provider) => provider.isDefault)?.provider ??
    translationProviders.find(
      (provider) => provider.enabled && provider.supportedByGateway
    )?.provider;

  return zProviderGatewayManifest.parse({
    ocr: {
      defaultProvider:
        defaultOcrProvider === ProviderType.google_cloud_vision
          ? defaultOcrProvider
          : null,
      providers: ocrProviders,
    },
    requestPolicy: {
      retryMaxAttempts: envServer.PROVIDER_RETRY_MAX_ATTEMPTS,
      timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    },
    translation: {
      defaultProvider:
        defaultTranslationProvider === ProviderType.gemini ||
        defaultTranslationProvider === ProviderType.openai ||
        defaultTranslationProvider === ProviderType.anthropic
          ? defaultTranslationProvider
          : null,
      promptVersion: envServer.TRANSLATION_PROMPT_VERSION,
      providers: translationProviders,
    },
  });
}

export async function getProviderGatewayManifestWithRuntimeConfig(deps?: {
  dbClient?: typeof db;
}) {
  const manifest = getProviderGatewayManifest();
  const { current } = await getProviderGatewayRuntimeConfig({
    dbClient: deps?.dbClient,
  });
  const runtimeState = getProviderGatewayRuntimeState({
    config: current,
  });

  const translationDefaultProvider = runtimeState.translationProviders.find(
    (provider) =>
      provider.provider === current.translationProviderPrimary &&
      provider.enabled
  )
    ? current.translationProviderPrimary
    : (runtimeState.translationProviders.find((provider) => provider.enabled)
        ?.provider ?? null);

  return zProviderGatewayManifest.parse({
    ...manifest,
    ocr: {
      defaultProvider: runtimeState.ocr.enabled
        ? ProviderType.google_cloud_vision
        : null,
      providers: manifest.ocr.providers.map((provider) =>
        provider.provider === ProviderType.google_cloud_vision
          ? {
              ...provider,
              isDefault: runtimeState.ocr.enabled,
              modelName: runtimeState.ocr.modelName,
            }
          : provider
      ),
    },
    translation: {
      ...manifest.translation,
      defaultProvider: translationDefaultProvider,
      providers: manifest.translation.providers.map((provider) => {
        if (provider.provider === ProviderType.gemini) {
          return {
            ...provider,
            isDefault: translationDefaultProvider === ProviderType.gemini,
            modelName: runtimeState.translationProviders.find(
              (item) => item.provider === ProviderType.gemini
            )?.modelName,
          };
        }

        if (provider.provider === ProviderType.openai) {
          return {
            ...provider,
            isDefault: translationDefaultProvider === ProviderType.openai,
            modelName: runtimeState.translationProviders.find(
              (item) => item.provider === ProviderType.openai
            )?.modelName,
          };
        }

        return provider;
      }),
    },
  });
}

export function isTranslationProviderEnabled(provider: ProviderType) {
  const manifest = getProviderGatewayManifest();

  return manifest.translation.providers.some(
    (item) =>
      item.provider === provider && item.enabled && item.supportedByGateway
  );
}
