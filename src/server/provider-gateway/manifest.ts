import { envServer } from '@/env/server';
import { ProviderType } from '@/server/db/generated/client';
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

export function isTranslationProviderEnabled(provider: ProviderType) {
  const manifest = getProviderGatewayManifest();

  return manifest.translation.providers.some(
    (item) =>
      item.provider === provider && item.enabled && item.supportedByGateway
  );
}
