import { envServer } from '@/env/server';
import { ProviderType, ProviderUsageStage } from '@/server/db/generated/client';
import { performGoogleCloudVisionOcr } from '@/server/provider-gateway/ocr';
import {
  HostedPageTranslation,
  NormalizedOcrPage,
  zHostedPageTranslation,
  zNormalizedTranslationPage,
} from '@/server/provider-gateway/schema';
import { performTranslationWithProvider } from '@/server/provider-gateway/translation';
import { persistProviderUsageSnapshot } from '@/server/provider-gateway/usage';
import { retryProviderCall } from '@/server/provider-gateway/utils';

export async function performHostedOcr(
  input: {
    imageBytes: Uint8Array;
    imageHeight?: number;
    imageWidth?: number;
    jobId?: string;
  },
  deps: {
    fetchFn?: typeof fetch;
  } = {}
) {
  const result = await retryProviderCall(
    async () =>
      await performGoogleCloudVisionOcr(
        {
          imageBytes: input.imageBytes,
          imageHeight: input.imageHeight,
          imageWidth: input.imageWidth,
        },
        {
          fetchFn: deps.fetchFn,
        }
      ),
    {
      maxAttempts: envServer.PROVIDER_RETRY_MAX_ATTEMPTS,
    }
  );

  if (input.jobId) {
    await persistProviderUsageSnapshot({
      inputTokens: result.usage.inputTokens ?? undefined,
      jobId: input.jobId,
      latencyMs: result.usage.latencyMs,
      metadata: {
        providerRequestId: result.usage.providerRequestId ?? null,
      },
      modelName: result.providerModel,
      outputTokens: result.usage.outputTokens ?? undefined,
      pageCount: result.usage.pageCount,
      provider: ProviderType.google_cloud_vision,
      requestCount: result.usage.requestCount,
      stage: ProviderUsageStage.ocr,
      success: true,
    });
  }

  return result;
}

export async function performHostedTranslation(
  input: {
    jobId?: string;
    mangaContext?: string;
    pages: Array<{
      blocks: Array<{ text: string }>;
      pageKey: string;
    }>;
    preferredProvider?: 'anthropic' | 'gemini' | 'openai';
    sourceLanguage: string;
    targetLanguage: string;
  },
  deps: {
    fetchFn?: typeof fetch;
  } = {}
) {
  const result = await retryProviderCall(
    async () =>
      await performTranslationWithProvider(
        {
          jobId: input.jobId,
          mangaContext: input.mangaContext ?? '',
          pages: input.pages,
          preferredProvider: input.preferredProvider,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
        },
        {
          fetchFn: deps.fetchFn,
          preferredProvider: input.preferredProvider,
        }
      ),
    {
      maxAttempts: envServer.PROVIDER_RETRY_MAX_ATTEMPTS,
    }
  );

  if (input.jobId) {
    await persistProviderUsageSnapshot({
      inputTokens: result.usage.inputTokens ?? undefined,
      jobId: input.jobId,
      latencyMs: result.usage.latencyMs,
      metadata: {
        finishReason: result.usage.finishReason ?? null,
        promptProfile: result.promptProfile,
        promptVersion: result.promptVersion,
        providerRequestId: result.usage.providerRequestId ?? null,
        stopReason: result.usage.stopReason ?? null,
      },
      modelName: result.providerModel,
      outputTokens: result.usage.outputTokens ?? undefined,
      pageCount: result.usage.pageCount,
      provider: result.provider,
      requestCount: result.usage.requestCount,
      stage: ProviderUsageStage.translation,
      success: true,
    });
  }

  return result;
}

export function mergeHostedPageTranslation(input: {
  ocrPage: NormalizedOcrPage;
  targetLanguage: string;
  translatorType: 'anthropic' | 'gemini' | 'openai';
  translationPage: unknown;
}): HostedPageTranslation {
  const translationPage = zNormalizedTranslationPage.parse(
    input.translationPage
  );

  if (translationPage.blocks.length !== input.ocrPage.blocks.length) {
    throw new Error(
      'Translation block count does not match OCR block count for hosted page merge.'
    );
  }

  return zHostedPageTranslation.parse({
    blocks: input.ocrPage.blocks.map((block, index) => ({
      ...block,
      translation: translationPage.blocks[index]?.translation ?? '',
    })),
    imgHeight: input.ocrPage.imgHeight,
    imgWidth: input.ocrPage.imgWidth,
    sourceLanguage: input.ocrPage.sourceLanguage,
    targetLanguage: input.targetLanguage,
    translatorType: input.translatorType,
  });
}
