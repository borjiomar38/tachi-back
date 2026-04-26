import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockPerformGeminiVisionOcr,
  mockPerformGoogleCloudVisionOcr,
  mockPersistProviderUsageSnapshot,
} = vi.hoisted(() => ({
  mockPerformGeminiVisionOcr: vi.fn(),
  mockPerformGoogleCloudVisionOcr: vi.fn(),
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

vi.mock('@/server/provider-gateway/usage', () => ({
  persistProviderUsageSnapshot: mockPersistProviderUsageSnapshot,
}));

import { performHostedOcr } from '@/server/provider-gateway/service';

describe('provider gateway service', () => {
  beforeEach(() => {
    mockPerformGeminiVisionOcr.mockReset();
    mockPerformGoogleCloudVisionOcr.mockReset();
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
});
