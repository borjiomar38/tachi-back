import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    child: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
  }),
}));

vi.mock('@/server/db', () => ({
  db: {},
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

import { Route } from './check';

describe('POST /api/mobile/content-policy/check', () => {
  beforeEach(() => {
    mockLogger.child.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.child.mockReturnValue(mockLogger);
  });

  const handler = (
    Route as never as {
      options: {
        server: {
          handlers: {
            POST: (input: { request: Request }) => Promise<Response>;
          };
        };
      };
    }
  ).options.server.handlers.POST;

  it('allows manga when metadata has no blocked signal', async () => {
    const response = await handler({
      request: new Request('http://localhost/api/mobile/content-policy/check', {
        body: JSON.stringify({
          manga: {
            genres: ['Action', 'Romance'],
            mangaTitle: 'Allowed Test',
            mangaUrl: 'https://example.test/manga',
            sourceId: 'source-1',
          },
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        blocked: false,
        details: null,
        reason: null,
        signal: null,
      },
      ok: true,
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('returns explicit adult block details for forbidden metadata', async () => {
    const response = await handler({
      request: new Request('http://localhost/api/mobile/content-policy/check', {
        body: JSON.stringify({
          manga: {
            mangaTitle: 'Blocked Test',
            mangaUrl: 'https://example.test/manga',
            sourceId: 'source-1',
            tags: ['Pornographic'],
          },
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        blocked: true,
        details: {
          i18n: {
            fallbackBody: 'This is haram',
            fallbackTitle: 'Warning, this is haram',
          },
          reason: 'official_explicit_adult_metadata',
          signal: {
            field: 'tags',
            value: 'Pornographic',
          },
        },
        reason: 'official_explicit_adult_metadata',
        signal: {
          field: 'tags',
          value: 'Pornographic',
        },
      },
      ok: true,
    });
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });
});
