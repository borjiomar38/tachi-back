import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env/server', () => ({
  envServer: {
    ANTHROPIC_API_KEY: 'anthropic-key',
    ANTHROPIC_TRANSLATION_MODEL: 'claude-test',
    GEMINI_API_KEY: 'gemini-key',
    GEMINI_TRANSLATION_MODEL: 'gemini-test',
    OPENAI_API_KEY: 'openai-key',
    OPENAI_TRANSLATION_MODEL: 'gpt-test',
    PROVIDER_REQUEST_TIMEOUT_MS: 5000,
    PROVIDER_RETRY_MAX_ATTEMPTS: 2,
    TRANSLATION_PROMPT_VERSION: '2026-03-20.v1',
    TRANSLATION_PROVIDER_PRIMARY: 'gemini',
    GOOGLE_CLOUD_VISION_API_KEY: '',
    GOOGLE_CLOUD_TRANSLATE_API_KEY: '',
    OPENROUTER_API_KEY: '',
    OCR_PROVIDER_PRIMARY: 'google_cloud_vision',
  },
}));

import { ProviderGatewayError } from '@/server/provider-gateway/errors';
import { performHostedTranslation } from '@/server/provider-gateway/service';
import { performTranslationWithProvider } from '@/server/provider-gateway/translation';

describe('provider gateway translation', () => {
  it('retries a retryable provider failure and returns normalized translations', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Too many requests',
            },
          }),
          { status: 429 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"001.jpg":["Hello there"]}' }],
                },
                finishReason: 'STOP',
              },
            ],
            responseId: 'gemini-response-123',
            usageMetadata: {
              candidatesTokenCount: 7,
              promptTokenCount: 21,
            },
          }),
          { status: 200 }
        )
      );

    const result = await performHostedTranslation(
      {
        pages: [
          {
            blocks: [{ text: '안녕하세요' }],
            pageKey: '001.jpg',
          },
        ],
        sourceLanguage: 'ko',
        targetLanguage: 'en',
      },
      {
        fetchFn,
      }
    );

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.provider).toBe('gemini');
    expect(result.promptVersion).toBe('2026-03-20.v1');
    expect(result.pages[0]?.blocks[0]?.translation).toBe('Hello there');
    expect(result.usage.inputTokens).toBe(21);
    expect(result.usage.outputTokens).toBe(7);
  });

  it('maps malformed model JSON to a stable invalid_response error', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: 'stop',
              message: {
                content: 'not-json-at-all',
              },
            },
          ],
          usage: {
            completion_tokens: 5,
            prompt_tokens: 10,
          },
        }),
        { status: 200 }
      )
    );

    await expect(
      performTranslationWithProvider(
        {
          pages: [
            {
              blocks: [{ text: 'こんにちは' }],
              pageKey: '001.jpg',
            },
          ],
          preferredProvider: 'openai',
          sourceLanguage: 'ja',
          targetLanguage: 'en',
        },
        {
          fetchFn,
          preferredProvider: 'openai',
        }
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProviderGatewayError>>({
        code: 'invalid_response',
        provider: 'openai',
      })
    );
  });
});
