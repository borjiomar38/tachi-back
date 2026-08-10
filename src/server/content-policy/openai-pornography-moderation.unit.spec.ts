import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  moderateMangaPornography,
  OpenAIPornographyModerationError,
} from '@/server/content-policy/openai-pornography-moderation';

const MODEL = 'omni-moderation-2024-09-26';

const buildModerationResponse = (
  overrides?: Partial<{
    appliedInputTypes: Array<'image' | 'text'>;
    model: string;
    score: number;
    sexual: boolean;
  }>
) =>
  new Response(
    JSON.stringify({
      id: 'modr-test-1',
      model: overrides?.model ?? MODEL,
      results: [
        {
          categories: {
            sexual: overrides?.sexual ?? true,
          },
          category_applied_input_types: {
            sexual: overrides?.appliedInputTypes ?? ['text', 'image'],
          },
          category_scores: {
            sexual: overrides?.score ?? 0.987,
          },
          flagged: true,
          unrelated_provider_field: 'ignored',
        },
      ],
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  );

const buildDependencies = (fetchFn: typeof fetch) => ({
  apiKey: 'test-api-key',
  baseUrl: 'https://api.openai.com/v1/',
  fetchFn,
  model: MODEL,
  timeoutMs: 1_000,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OpenAI pornography moderation client', () => {
  it('posts the manga title and safe public image to the pinned moderation model', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(buildModerationResponse());

    const result = await moderateMangaPornography(
      {
        imageUrl: 'https://cdn.example.com/covers/manga.jpg?size=large',
        title: 'A Sample Manga',
      },
      buildDependencies(fetchFn)
    );

    expect(result).toEqual({
      id: 'modr-test-1',
      imageIncluded: true,
      model: MODEL,
      sexual: true,
      sexualAppliedInputTypes: ['text', 'image'],
      sexualScore: 0.987,
    });
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://api.openai.com/v1/moderations'
    );
    const request = fetchFn.mock.calls[0]?.[1];
    expect(request).toMatchObject({
      headers: {
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(request?.body))).toEqual({
      input: [
        {
          text: 'Manga title: A Sample Manga',
          type: 'text',
        },
        {
          image_url: {
            url: 'https://cdn.example.com/covers/manga.jpg?size=large',
          },
          type: 'image_url',
        },
      ],
      model: MODEL,
    });
  });

  it.each([
    ['not a URL', 'not a URL'],
    ['non-HTTP URL', 'data:image/png;base64,AAAA'],
    ['URL credentials', 'https://user:password@cdn.example.com/cover.jpg'],
    ['localhost', 'http://localhost/cover.jpg'],
    ['private IPv4', 'http://192.168.1.10/cover.jpg'],
    ['numeric loopback IPv4', 'http://2130706433/cover.jpg'],
    ['loopback IPv6', 'http://[::1]/cover.jpg'],
    ['internal hostname', 'https://covers.internal/cover.jpg'],
  ])('uses text-only input for a rejected %s', async (_label, imageUrl) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      buildModerationResponse({
        appliedInputTypes: ['text'],
        score: 0.01,
        sexual: false,
      })
    );

    const result = await moderateMangaPornography(
      { imageUrl, title: 'Safe title' },
      buildDependencies(fetchFn)
    );

    expect(result.imageIncluded).toBe(false);
    expect(JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body))).toEqual({
      input: [
        {
          text: 'Manga title: Safe title',
          type: 'text',
        },
      ],
      model: MODEL,
    });
  });

  it('falls back to title-only moderation when OpenAI cannot load the remote image', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('invalid remote image', { status: 400 })
      )
      .mockResolvedValueOnce(
        buildModerationResponse({
          appliedInputTypes: ['text'],
          score: 0.02,
          sexual: false,
        })
      );

    const result = await moderateMangaPornography(
      {
        imageUrl: 'https://cdn.example.com/expired-cover.jpg',
        title: 'Safe title',
      },
      buildDependencies(fetchFn)
    );

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchFn.mock.calls[1]?.[1]?.body))).toEqual({
      input: [
        {
          text: 'Manga title: Safe title',
          type: 'text',
        },
      ],
      model: MODEL,
    });
    expect(result).toMatchObject({
      imageIncluded: false,
      sexualAppliedInputTypes: ['text'],
    });
  });

  it('throws a retryable typed timeout error and aborts the request', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>(() => new Promise(() => undefined));
    const request = moderateMangaPornography(
      { imageUrl: null, title: 'Slow manga' },
      {
        ...buildDependencies(fetchFn),
        timeoutMs: 50,
      }
    );
    const rejection = expect(request).rejects.toMatchObject({
      code: 'timeout',
      message: 'OpenAI moderation request timed out.',
      name: 'OpenAIPornographyModerationError',
      retryable: true,
    });

    await vi.advanceTimersByTimeAsync(50);
    await rejection;
    expect(fetchFn.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it.each([
    [401, false],
    [429, true],
    [503, true],
  ])(
    'throws a safe typed HTTP error for status %s',
    async (status, retryable) => {
      const secretResponseBody =
        'secret upstream response with https://private.example/cover.jpg';
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(secretResponseBody, { status }));

      let thrown: unknown;
      try {
        await moderateMangaPornography(
          {
            imageUrl: 'https://private.example/cover.jpg?token=url-secret',
            title: 'Manga',
          },
          {
            ...buildDependencies(fetchFn),
            apiKey: 'api-key-secret',
          }
        );
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(OpenAIPornographyModerationError);
      expect(thrown).toMatchObject({
        code: 'http_error',
        message: 'OpenAI moderation request was rejected.',
        retryable,
        statusCode: status,
      });
      expect(String(thrown)).not.toContain(secretResponseBody);
      expect(String(thrown)).not.toContain('api-key-secret');
      expect(String(thrown)).not.toContain('url-secret');
    }
  );

  it.each([
    ['non-JSON body', new Response('not JSON', { status: 200 })],
    [
      'missing sexual score',
      new Response(
        JSON.stringify({
          id: 'modr-test-1',
          model: MODEL,
          results: [
            {
              categories: { sexual: false },
              category_applied_input_types: { sexual: ['text'] },
              category_scores: {},
            },
          ],
        }),
        { status: 200 }
      ),
    ],
    [
      'unknown applied input type',
      new Response(
        JSON.stringify({
          id: 'modr-test-1',
          model: MODEL,
          results: [
            {
              categories: { sexual: false },
              category_applied_input_types: { sexual: ['audio'] },
              category_scores: { sexual: 0.01 },
            },
          ],
        }),
        { status: 200 }
      ),
    ],
  ])(
    'throws a typed error for a malformed response: %s',
    async (_label, response) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);

      await expect(
        moderateMangaPornography({ title: 'Manga' }, buildDependencies(fetchFn))
      ).rejects.toMatchObject({
        code: 'malformed_response',
        message: 'OpenAI moderation returned an invalid response.',
        retryable: false,
      });
    }
  );

  it('does not expose a network failure message', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(
        new Error(
          'request to https://secret.example/cover.jpg failed with API key'
        )
      );

    await expect(
      moderateMangaPornography({ title: 'Manga' }, buildDependencies(fetchFn))
    ).rejects.toMatchObject({
      code: 'request_failed',
      message: 'OpenAI moderation request failed.',
      retryable: true,
    });
  });
});
