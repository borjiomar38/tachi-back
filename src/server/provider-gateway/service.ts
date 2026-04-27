import { envServer } from '@/env/server';
import { ProviderType, ProviderUsageStage } from '@/server/db/generated/client';
import { ProviderGatewayError } from '@/server/provider-gateway/errors';
import {
  performGeminiVisionOcr,
  performGoogleCloudVisionOcr,
} from '@/server/provider-gateway/ocr';
import { buildTranslationJsonPayload } from '@/server/provider-gateway/prompts';
import {
  HostedPageTranslation,
  NormalizedOcrPage,
  NormalizedTranslationBatch,
  zHostedPageTranslation,
  zNormalizedTranslationBatch,
  zNormalizedTranslationPage,
} from '@/server/provider-gateway/schema';
import { performTranslationWithProvider } from '@/server/provider-gateway/translation';
import { persistProviderUsageSnapshot } from '@/server/provider-gateway/usage';
import { retryProviderCall } from '@/server/provider-gateway/utils';

const TRANSLATION_BATCH_MAX_PAYLOAD_CHARS = 9_000;
const TRANSLATION_BATCH_MAX_BLOCKS = 45;
const TRANSLATION_BATCH_CONCURRENCY = 3;

type TranslationPageInput = {
  blocks: Array<{ text: string }>;
  pageKey: string;
};

type TranslationBatchSegment = {
  originalPageKey: string;
  requestPage: TranslationPageInput;
};

type TranslationBatch = {
  payloadChars: number;
  requestPages: TranslationPageInput[];
  segments: TranslationBatchSegment[];
};

export async function performHostedOcr(
  input: {
    imageBytes: Uint8Array;
    imageHeight?: number;
    imageWidth?: number;
    jobId?: string;
    pageCount?: number;
  },
  deps: {
    fetchFn?: typeof fetch;
  } = {}
) {
  let result: NormalizedOcrPage;

  try {
    result = await retryProviderCall(
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
  } catch (error) {
    if (!shouldFallbackToGeminiOcr(error)) {
      throw error;
    }

    result = await retryProviderCall(
      async () =>
        await performGeminiVisionOcr(
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
  }

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
      pageCount: input.pageCount ?? result.usage.pageCount,
      provider: result.provider,
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
  const translationPlan = buildTranslationBatchPlan(input.pages);
  const batchResults = await mapWithConcurrency(
    translationPlan.batches,
    TRANSLATION_BATCH_CONCURRENCY,
    async (batch) =>
      await retryProviderCall(
        async () =>
          await performTranslationWithProvider(
            {
              jobId: input.jobId,
              mangaContext: input.mangaContext ?? '',
              pages: batch.requestPages,
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
      )
  );
  const result = combineTranslationBatchResults({
    batchResults,
    batches: translationPlan.batches,
    originalPages: input.pages,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });

  if (input.jobId) {
    await persistProviderUsageSnapshot({
      inputTokens: result.usage.inputTokens ?? undefined,
      jobId: input.jobId,
      latencyMs: result.usage.latencyMs,
      metadata: {
        batchCount: translationPlan.batches.length,
        batchPayloadChars: translationPlan.batches.map(
          (batch) => batch.payloadChars
        ),
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

function buildTranslationBatchPlan(pages: TranslationPageInput[]) {
  const segments = pages.flatMap(splitPageIntoTranslationSegments);
  const batches: TranslationBatch[] = [];
  let currentSegments: TranslationBatchSegment[] = [];
  let currentPayloadChars = 0;
  let currentBlockCount = 0;

  for (const segment of segments) {
    const segmentPayloadChars = estimateTranslationPayloadChars([
      segment.requestPage,
    ]);
    const segmentBlockCount = segment.requestPage.blocks.length;
    const shouldStartNextBatch =
      currentSegments.length > 0 &&
      (currentPayloadChars + segmentPayloadChars >
        TRANSLATION_BATCH_MAX_PAYLOAD_CHARS ||
        currentBlockCount + segmentBlockCount > TRANSLATION_BATCH_MAX_BLOCKS);

    if (shouldStartNextBatch) {
      batches.push(createTranslationBatch(currentSegments));
      currentSegments = [];
      currentPayloadChars = 0;
      currentBlockCount = 0;
    }

    currentSegments.push(segment);
    currentPayloadChars += segmentPayloadChars;
    currentBlockCount += segmentBlockCount;
  }

  if (currentSegments.length > 0) {
    batches.push(createTranslationBatch(currentSegments));
  }

  return {
    batches,
    segments,
  };
}

function splitPageIntoTranslationSegments(
  page: TranslationPageInput
): TranslationBatchSegment[] {
  const blockGroups: Array<Array<{ text: string }>> = [];
  let currentBlocks: Array<{ text: string }> = [];

  for (const block of page.blocks) {
    const candidateBlocks = [...currentBlocks, block];
    const candidatePayloadChars = estimateTranslationPayloadChars([
      {
        blocks: candidateBlocks,
        pageKey: page.pageKey,
      },
    ]);
    const shouldStartNextSegment =
      currentBlocks.length > 0 &&
      (candidatePayloadChars > TRANSLATION_BATCH_MAX_PAYLOAD_CHARS ||
        candidateBlocks.length > TRANSLATION_BATCH_MAX_BLOCKS);

    if (shouldStartNextSegment) {
      blockGroups.push(currentBlocks);
      currentBlocks = [];
    }

    currentBlocks.push(block);
  }

  if (currentBlocks.length > 0) {
    blockGroups.push(currentBlocks);
  }

  return blockGroups.map((blocks, index) => ({
    originalPageKey: page.pageKey,
    requestPage: {
      blocks,
      pageKey:
        blockGroups.length === 1
          ? page.pageKey
          : `${page.pageKey}__part_${String(index + 1).padStart(3, '0')}`,
    },
  }));
}

function createTranslationBatch(
  segments: TranslationBatchSegment[]
): TranslationBatch {
  const requestPages = segments.map((segment) => segment.requestPage);

  return {
    payloadChars: estimateTranslationPayloadChars(requestPages),
    requestPages,
    segments,
  };
}

function estimateTranslationPayloadChars(pages: TranslationPageInput[]) {
  return JSON.stringify(buildTranslationJsonPayload(pages)).length;
}

async function mapWithConcurrency<Item, Result>(
  items: Item[],
  concurrency: number,
  task: (item: Item, index: number) => Promise<Result>
) {
  const results = Array.from<Result | undefined>({ length: items.length });
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];

      if (item !== undefined) {
        results[index] = await task(item, index);
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => await worker()
    )
  );

  return results as Result[];
}

function combineTranslationBatchResults(input: {
  batches: TranslationBatch[];
  batchResults: NormalizedTranslationBatch[];
  originalPages: TranslationPageInput[];
  sourceLanguage: string;
  targetLanguage: string;
}) {
  const firstResult = input.batchResults[0];

  if (!firstResult) {
    throw new Error('Hosted translation produced no batch results.');
  }

  const translatedPagesByRequestKey = new Map(
    input.batchResults.flatMap((result) =>
      result.pages.map((page) => [page.pageKey, page] as const)
    )
  );
  const blocksByOriginalPageKey = new Map<
    string,
    NormalizedTranslationBatch['pages'][number]['blocks']
  >();

  for (const batch of input.batches) {
    for (const segment of batch.segments) {
      const translatedPage = translatedPagesByRequestKey.get(
        segment.requestPage.pageKey
      );

      if (!translatedPage) {
        throw new Error(
          `Missing translation batch page for ${segment.requestPage.pageKey}.`
        );
      }

      const existingBlocks =
        blocksByOriginalPageKey.get(segment.originalPageKey) ?? [];
      blocksByOriginalPageKey.set(segment.originalPageKey, [
        ...existingBlocks,
        ...translatedPage.blocks,
      ]);
    }
  }

  const pages = input.originalPages.map((page) => {
    const blocks = blocksByOriginalPageKey.get(page.pageKey) ?? [];

    if (blocks.length !== page.blocks.length) {
      throw new Error(
        `Translation batch block count does not match OCR block count for ${page.pageKey}.`
      );
    }

    return {
      blocks,
      pageKey: page.pageKey,
    };
  });

  return zNormalizedTranslationBatch.parse({
    pages,
    promptProfile: firstResult.promptProfile,
    promptVersion: firstResult.promptVersion,
    provider: firstResult.provider,
    providerModel: firstResult.providerModel,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    usage: {
      finishReason: combineOptionalStrings(
        input.batchResults.map((result) => result.usage.finishReason)
      ),
      inputTokens: sumOptionalNumbers(
        input.batchResults.map((result) => result.usage.inputTokens)
      ),
      latencyMs: input.batchResults.reduce(
        (sum, result) => sum + result.usage.latencyMs,
        0
      ),
      outputTokens: sumOptionalNumbers(
        input.batchResults.map((result) => result.usage.outputTokens)
      ),
      pageCount: input.originalPages.length,
      providerRequestId: combineOptionalStrings(
        input.batchResults.map((result) => result.usage.providerRequestId)
      ),
      requestCount: input.batchResults.reduce(
        (sum, result) => sum + result.usage.requestCount,
        0
      ),
      stopReason: combineOptionalStrings(
        input.batchResults.map((result) => result.usage.stopReason)
      ),
    },
  });
}

function sumOptionalNumbers(values: Array<null | number | undefined>) {
  const numbers = values.filter((value): value is number => value != null);

  if (numbers.length === 0) {
    return null;
  }

  return numbers.reduce((sum, value) => sum + value, 0);
}

function combineOptionalStrings(values: Array<null | string | undefined>) {
  const strings = values.filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );

  if (strings.length === 0) {
    return null;
  }

  return [...new Set(strings)].join(',');
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

function shouldFallbackToGeminiOcr(error: unknown) {
  if (!envServer.GEMINI_API_KEY) {
    return false;
  }

  if (
    !(error instanceof ProviderGatewayError) ||
    error.provider !== ProviderType.google_cloud_vision
  ) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    error.code === 'config_error' ||
    message.includes('has not been used in project') ||
    message.includes('enable it by visiting') ||
    message.includes('authentication failed') ||
    message.includes('request contains an invalid argument')
  );
}
