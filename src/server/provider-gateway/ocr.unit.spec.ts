import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env/server', () => ({
  envServer: {
    GEMINI_API_KEY: 'gemini-key',
    GEMINI_TRANSLATION_MODEL: 'gemini-2.5-flash',
    GOOGLE_CLOUD_VISION_API_KEY: 'vision-key',
    PROVIDER_REQUEST_TIMEOUT_MS: 5000,
  },
}));

import {
  performGeminiVisionOcr,
  performGoogleCloudVisionOcr,
} from '@/server/provider-gateway/ocr';

describe('provider gateway OCR', () => {
  it('normalizes Google Cloud Vision paragraph geometry into hosted OCR blocks', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [
            {
              fullTextAnnotation: {
                pages: [
                  {
                    blocks: [
                      {
                        blockType: 'TEXT',
                        paragraphs: [
                          {
                            words: [
                              {
                                boundingBox: {
                                  vertices: [
                                    { x: 10, y: 20 },
                                    { x: 70, y: 20 },
                                    { x: 70, y: 60 },
                                    { x: 10, y: 60 },
                                  ],
                                },
                                symbols: [
                                  {
                                    boundingBox: {
                                      vertices: [
                                        { x: 10, y: 20 },
                                        { x: 35, y: 20 },
                                        { x: 35, y: 60 },
                                        { x: 10, y: 60 },
                                      ],
                                    },
                                    text: '안',
                                  },
                                  {
                                    boundingBox: {
                                      vertices: [
                                        { x: 36, y: 20 },
                                        { x: 60, y: 20 },
                                        { x: 60, y: 60 },
                                        { x: 36, y: 60 },
                                      ],
                                    },
                                    text: '녕',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                    height: 1800,
                    width: 1200,
                  },
                ],
              },
              textAnnotations: [{ locale: 'ko' }],
            },
          ],
        }),
        {
          headers: {
            'x-guploader-uploadid': 'vision-request-123',
          },
          status: 200,
        }
      )
    );

    const result = await performGoogleCloudVisionOcr(
      {
        imageBytes: Uint8Array.from([1, 2, 3]),
      },
      {
        fetchFn,
      }
    );

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(result.provider).toBe('google_cloud_vision');
    expect(result.sourceLanguage).toBe('ko');
    expect(result.imgWidth).toBe(1200);
    expect(result.imgHeight).toBe(1800);
    expect(result.blocks).toEqual([
      expect.objectContaining({
        height: 40,
        text: '안녕',
        width: 60,
        x: 10,
        y: 20,
      }),
    ]);
    expect(result.usage.providerRequestId).toBe('vision-request-123');
  });

  it('normalizes Gemini multimodal OCR output into hosted OCR blocks', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      blocks: [
                        {
                          height: 120,
                          text: 'Hello there',
                          width: 320,
                          x: 24,
                          y: 80,
                        },
                      ],
                      sourceLanguage: 'en',
                    }),
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
          responseId: 'gemini-ocr-request-123',
          usageMetadata: {
            candidatesTokenCount: 31,
            promptTokenCount: 117,
          },
        }),
        {
          status: 200,
        }
      )
    );

    const pngBytes = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x04, 0xb0, 0x00, 0x00, 0x06, 0x40,
    ]);

    const result = await performGeminiVisionOcr(
      {
        imageBytes: pngBytes,
      },
      {
        fetchFn,
      }
    );

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(result.provider).toBe('gemini');
    expect(result.sourceLanguage).toBe('en');
    expect(result.imgWidth).toBe(1200);
    expect(result.imgHeight).toBe(1600);
    expect(result.blocks).toEqual([
      expect.objectContaining({
        height: 120,
        text: 'Hello there',
        width: 320,
        x: 24,
        y: 80,
      }),
    ]);
    expect(result.usage.providerRequestId).toBe('gemini-ocr-request-123');
    expect(result.usage.inputTokens).toBe(117);
    expect(result.usage.outputTokens).toBe(31);
  });
});
