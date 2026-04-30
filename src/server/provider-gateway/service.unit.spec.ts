import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockPerformGeminiVisionOcr,
  mockPerformGoogleCloudVisionOcr,
  mockPerformTranslationWithProvider,
  mockPersistProviderUsageSnapshot,
} = vi.hoisted(() => ({
  mockPerformGeminiVisionOcr: vi.fn(),
  mockPerformGoogleCloudVisionOcr: vi.fn(),
  mockPerformTranslationWithProvider: vi.fn(),
  mockPersistProviderUsageSnapshot: vi.fn(),
}));

vi.mock('@/env/server', () => ({
  envServer: {
    GEMINI_API_KEY: '',
    PROVIDER_RETRY_MAX_ATTEMPTS: 1,
    TRANSLATION_BATCH_CONCURRENCY: 40,
    TRANSLATION_BATCH_MAX_BLOCKS: 45,
    TRANSLATION_BATCH_MAX_PAYLOAD_CHARS: 2_000,
    TRANSLATION_BLOCK_RETRY_MAX_ATTEMPTS: 3,
  },
}));

vi.mock('@/server/provider-gateway/ocr', () => ({
  performGeminiVisionOcr: mockPerformGeminiVisionOcr,
  performGoogleCloudVisionOcr: mockPerformGoogleCloudVisionOcr,
}));

vi.mock('@/server/provider-gateway/translation', () => ({
  performTranslationWithProvider: mockPerformTranslationWithProvider,
}));

vi.mock('@/server/provider-gateway/usage', () => ({
  persistProviderUsageSnapshot: mockPersistProviderUsageSnapshot,
}));

import { ProviderGatewayError } from '@/server/provider-gateway/errors';
import {
  performHostedOcr,
  performHostedTranslation,
} from '@/server/provider-gateway/service';

describe('provider gateway service', () => {
  beforeEach(() => {
    mockPerformGeminiVisionOcr.mockReset();
    mockPerformGoogleCloudVisionOcr.mockReset();
    mockPerformTranslationWithProvider.mockReset();
    mockPersistProviderUsageSnapshot.mockReset();
  });

  it('records the original page count when OCR uses a merged image batch', async () => {
    mockPerformGoogleCloudVisionOcr.mockResolvedValue({
      blocks: [],
      imgHeight: 4000,
      imgWidth: 1200,
      provider: 'google_cloud_vision',
      providerModel: 'TEXT_DETECTION',
      sourceLanguage: 'ja',
      usage: {
        inputTokens: null,
        latencyMs: 120,
        outputTokens: null,
        pageCount: 1,
        providerRequestId: 'vision-batch-request',
        requestCount: 1,
      },
    });

    await performHostedOcr({
      imageBytes: Uint8Array.from([1, 2, 3]),
      imageHeight: 4000,
      imageWidth: 1200,
      jobId: 'job-ocr-batch',
      pageCount: 3,
    });

    expect(mockPersistProviderUsageSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-ocr-batch',
        metadata: {
          providerRequestId: 'vision-batch-request',
        },
        pageCount: 3,
        requestCount: 1,
        stage: 'ocr',
        success: true,
      })
    );
  });

  it('splits hosted translation batches by payload size and reassembles split pages', async () => {
    mockPerformTranslationWithProvider.mockImplementation(
      async (rawInput: unknown) => {
        const input = rawInput as {
          pages: Array<{
            blocks: Array<{ text: string }>;
            pageKey: string;
          }>;
          sourceLanguage: string;
          targetLanguage: string;
        };
        const requestNumber =
          mockPerformTranslationWithProvider.mock.calls.length;

        return {
          pages: input.pages.map((page) => ({
            blocks: page.blocks.map((block, index) => ({
              index,
              sourceText: block.text,
              translation: `${page.pageKey}:${index}`,
            })),
            pageKey: page.pageKey,
          })),
          promptProfile: 'arabic_target',
          promptVersion: '2026-03-20.v1',
          provider: 'openai',
          providerModel: 'gpt-test',
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          usage: {
            finishReason: 'stop',
            inputTokens: 10,
            latencyMs: 100,
            outputTokens: 5,
            pageCount: input.pages.length,
            providerRequestId: `request-${requestNumber}`,
            requestCount: 1,
            stopReason: null,
          },
        };
      }
    );

    const result = await performHostedTranslation({
      jobId: 'job-large-translation',
      pages: [
        {
          blocks: [
            { text: 'A'.repeat(5_000) },
            { text: 'B'.repeat(5_000) },
            { text: 'C'.repeat(5_000) },
          ],
          pageKey: 'large.jpg',
        },
      ],
      preferredProvider: 'openai',
      sourceLanguage: 'en',
      targetLanguage: 'ar',
    });

    expect(mockPerformTranslationWithProvider).toHaveBeenCalledTimes(3);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0]?.pageKey).toBe('large.jpg');
    expect(result.pages[0]?.blocks).toHaveLength(3);
    expect(result.pages[0]?.blocks.map((block) => block.sourceText)).toEqual([
      'A'.repeat(5_000),
      'B'.repeat(5_000),
      'C'.repeat(5_000),
    ]);
    expect(result.pages[0]?.blocks.map((block) => block.index)).toEqual([
      0, 1, 2,
    ]);
    expect(result.usage).toEqual(
      expect.objectContaining({
        inputTokens: 30,
        latencyMs: 300,
        outputTokens: 15,
        pageCount: 1,
        requestCount: 3,
      })
    );
    expect(mockPersistProviderUsageSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-large-translation',
        metadata: expect.objectContaining({
          batchCount: 3,
        }),
        pageCount: 1,
        requestCount: 3,
        stage: 'translation',
      })
    );
  });

  it('falls back to page-level translation when a batched response is incomplete', async () => {
    mockPerformTranslationWithProvider.mockImplementation(
      async (rawInput: unknown) => {
        const input = rawInput as {
          pages: Array<{
            blocks: Array<{ text: string }>;
            pageKey: string;
          }>;
          sourceLanguage: string;
          targetLanguage: string;
        };
        const requestNumber =
          mockPerformTranslationWithProvider.mock.calls.length;

        if (requestNumber === 1) {
          throw new ProviderGatewayError(
            'invalid_response',
            'openai',
            true,
            502,
            'Provider response is missing the page key "002.webp".'
          );
        }

        return {
          pages: input.pages.map((page) => ({
            blocks: page.blocks.map((block, index) => ({
              index,
              sourceText: block.text,
              translation: `${page.pageKey}:${block.text}`,
            })),
            pageKey: page.pageKey,
          })),
          promptProfile: 'arabic_target',
          promptVersion: '2026-03-20.v1',
          provider: 'openai',
          providerModel: 'gpt-test',
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          usage: {
            finishReason: 'stop',
            inputTokens: 10,
            latencyMs: 100,
            outputTokens: 5,
            pageCount: input.pages.length,
            providerRequestId: `request-${requestNumber}`,
            requestCount: 1,
            stopReason: null,
          },
        };
      }
    );

    const result = await performHostedTranslation({
      pages: [
        {
          blocks: [{ text: 'first' }],
          pageKey: '001.webp',
        },
        {
          blocks: [{ text: 'second' }],
          pageKey: '002.webp',
        },
      ],
      preferredProvider: 'openai',
      sourceLanguage: 'ja',
      targetLanguage: 'ar',
    });

    expect(mockPerformTranslationWithProvider).toHaveBeenCalledTimes(3);
    expect(mockPerformTranslationWithProvider).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        pages: [
          {
            blocks: [{ text: 'first' }],
            pageKey: '001.webp',
          },
        ],
      }),
      expect.any(Object)
    );
    expect(mockPerformTranslationWithProvider).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        pages: [
          {
            blocks: [{ text: 'second' }],
            pageKey: '002.webp',
          },
        ],
      }),
      expect.any(Object)
    );
    expect(result.pages.map((page) => page.pageKey)).toEqual([
      '001.webp',
      '002.webp',
    ]);
    expect(result.pages.flatMap((page) => page.blocks)).toEqual([
      {
        index: 0,
        sourceText: 'first',
        translation: '001.webp:first',
      },
      {
        index: 0,
        sourceText: 'second',
        translation: '002.webp:second',
      },
    ]);
    expect(result.usage).toEqual(
      expect.objectContaining({
        inputTokens: 20,
        latencyMs: 200,
        outputTokens: 10,
        pageCount: 2,
        requestCount: 2,
      })
    );
  });

  it('retries invalid translation blocks three times and leaves failed blocks empty', async () => {
    const counters = {
      badSingleBlockCalls: 0,
    };

    mockPerformTranslationWithProvider.mockImplementation(
      async (rawInput: unknown) => {
        const input = rawInput as {
          pages: Array<{
            blocks: Array<{ text: string }>;
            pageKey: string;
          }>;
          sourceLanguage: string;
          targetLanguage: string;
        };
        const hasBadBlock = input.pages.some((page) =>
          page.blocks.some((block) => block.text === 'bad')
        );

        if (hasBadBlock) {
          if (
            input.pages.length === 1 &&
            input.pages[0]?.blocks.length === 1 &&
            input.pages[0]?.blocks[0]?.text === 'bad'
          ) {
            counters.badSingleBlockCalls += 1;
          }

          throw new ProviderGatewayError(
            'invalid_response',
            'openai',
            true,
            502,
            'Provider returned a block that does not match the OCR convention.'
          );
        }

        return {
          pages: input.pages.map((page) => ({
            blocks: page.blocks.map((block, index) => ({
              index,
              sourceText: block.text,
              translation: `${block.text}-translated`,
            })),
            pageKey: page.pageKey,
          })),
          promptProfile: 'arabic_target',
          promptVersion: '2026-03-20.v1',
          provider: 'openai',
          providerModel: 'gpt-test',
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          usage: {
            finishReason: 'stop',
            inputTokens: 10,
            latencyMs: 100,
            outputTokens: 5,
            pageCount: input.pages.length,
            providerRequestId: null,
            requestCount: 1,
            stopReason: null,
          },
        };
      }
    );

    const result = await performHostedTranslation({
      pages: [
        {
          blocks: [{ text: 'bad' }, { text: 'good' }],
          pageKey: '001.webp',
        },
      ],
      preferredProvider: 'openai',
      sourceLanguage: 'ja',
      targetLanguage: 'ar',
    });

    expect(counters.badSingleBlockCalls).toBe(3);
    expect(result.pages[0]?.blocks).toEqual([
      {
        index: 0,
        sourceText: 'bad',
        translation: '',
      },
      {
        index: 1,
        sourceText: 'good',
        translation: 'good-translated',
      },
    ]);
    expect(result.usage.requestCount).toBe(4);
  });

  it('runs hosted translation batches up to the configured concurrency', async () => {
    const counters = {
      active: 0,
      maxActive: 0,
    };

    mockPerformTranslationWithProvider.mockImplementation(
      async (rawInput: unknown) => {
        counters.active += 1;
        counters.maxActive = Math.max(counters.maxActive, counters.active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        counters.active -= 1;

        const input = rawInput as {
          pages: Array<{
            blocks: Array<{ text: string }>;
            pageKey: string;
          }>;
          sourceLanguage: string;
          targetLanguage: string;
        };

        return {
          pages: input.pages.map((page) => ({
            blocks: page.blocks.map((block, index) => ({
              index,
              sourceText: block.text,
              translation: `${page.pageKey}:${index}`,
            })),
            pageKey: page.pageKey,
          })),
          promptProfile: 'arabic_target',
          promptVersion: '2026-03-20.v1',
          provider: 'openai',
          providerModel: 'gpt-test',
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          usage: {
            finishReason: 'stop',
            inputTokens: 10,
            latencyMs: 100,
            outputTokens: 5,
            pageCount: input.pages.length,
            providerRequestId: null,
            requestCount: 1,
            stopReason: null,
          },
        };
      }
    );

    await performHostedTranslation({
      pages: Array.from({ length: 50 }, (_, index) => ({
        blocks: [{ text: `line-${index}-${'A'.repeat(2_100)}` }],
        pageKey: `${String(index).padStart(3, '0')}.webp`,
      })),
      preferredProvider: 'openai',
      sourceLanguage: 'ja',
      targetLanguage: 'ar',
    });

    expect(mockPerformTranslationWithProvider).toHaveBeenCalledTimes(50);
    expect(counters.maxActive).toBe(40);
  });
});
