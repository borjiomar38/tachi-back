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
});
