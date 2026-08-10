import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAuthenticateAndRateLimitMobileJobRequest,
  mockDb,
  mockGetAvailableLicenseTokenBalance,
  mockLogger,
  mockTranslateMangaPage,
} = vi.hoisted(() => ({
  mockAuthenticateAndRateLimitMobileJobRequest: vi.fn(),
  mockDb: {
    $transaction: vi.fn(),
    freeTrialClaim: {
      findUnique: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
    tokenLedger: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  mockGetAvailableLicenseTokenBalance: vi.fn(),
  mockLogger: {
    child: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  mockTranslateMangaPage: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
  }),
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/jobs/http', () => {
  return {
    authenticateAndRateLimitMobileJobRequest:
      mockAuthenticateAndRateLimitMobileJobRequest,
    buildMobileJobErrorResponse: (error: {
      code?: string;
      details?: unknown;
      statusCode?: number;
    }) =>
      Response.json(
        {
          error: {
            code: error.code ?? 'unknown_error',
            ...(error.details === undefined ? {} : { details: error.details }),
          },
          ok: false,
        },
        {
          status: error.statusCode ?? 500,
        }
      ),
    buildMobileJobRateLimitedResponse: () =>
      Response.json(
        {
          error: {
            code: 'rate_limited',
          },
          ok: false,
        },
        {
          status: 429,
        }
      ),
  };
});

vi.mock('@/server/licenses/token-balance', () => ({
  getAvailableLicenseTokenBalance: mockGetAvailableLicenseTokenBalance,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/server/manga-page-translation/service', async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import('@/server/manga-page-translation/service')
    >();

  return {
    ...original,
    translateMangaPage: mockTranslateMangaPage,
  };
});

import { Route } from './translate';

describe('POST /api/mobile/manga-page/translate', () => {
  beforeEach(() => {
    mockAuthenticateAndRateLimitMobileJobRequest.mockReset();
    mockDb.$transaction.mockReset();
    mockDb.freeTrialClaim.findUnique.mockReset();
    mockDb.order.findFirst.mockReset();
    mockDb.tokenLedger.createMany.mockReset();
    mockDb.tokenLedger.findUnique.mockReset();
    mockDb.tokenLedger.updateMany.mockReset();
    mockGetAvailableLicenseTokenBalance.mockReset();
    mockLogger.child.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.error.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockTranslateMangaPage.mockReset();

    mockLogger.child.mockReturnValue({
      debug: mockLogger.debug,
      error: mockLogger.error,
      info: mockLogger.info,
      warn: mockLogger.warn,
    });
    mockAuthenticateAndRateLimitMobileJobRequest.mockResolvedValue({
      auth: {
        device: {
          id: 'device-1',
        },
        license: {
          id: 'license-free-trial-1',
        },
      },
      rateLimit: {
        allowed: true,
      },
    });
    mockDb.freeTrialClaim.findUnique.mockResolvedValue({
      id: 'claim-1',
    });
    mockDb.order.findFirst.mockResolvedValue(null);
    mockDb.tokenLedger.findUnique.mockResolvedValue(null);
    mockGetAvailableLicenseTokenBalance.mockResolvedValue(100);
  });

  it('allows another free-trial chapter while the one-time balance remains', async () => {
    mockDb.tokenLedger.createMany.mockResolvedValue({ count: 1 });
    mockTranslateMangaPage.mockResolvedValue({
      chapters: [
        {
          key: 'chapter-3',
          name: 'Chapitre 3',
          url: 'https://example.test/manga/chapter-3',
        },
      ],
      manga: {
        title: 'Test de solde',
        url: 'https://example.test/manga',
      },
      targetLanguage: 'fr',
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
    const response = await handler({
      request: new Request('http://localhost/api/mobile/manga-page/translate', {
        body: JSON.stringify({
          chapters: [
            {
              key: 'chapter-3',
              name: 'Chapter 3',
              url: 'https://example.test/manga/chapter-3',
            },
          ],
          manga: {
            title: 'Limit Test',
            url: 'https://example.test/manga',
          },
          sourceId: 'source-1',
          sourceLanguage: 'auto',
          targetLanguage: 'fr',
        }),
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        targetLanguage: 'fr',
      },
      ok: true,
    });
    expect(mockTranslateMangaPage).toHaveBeenCalledOnce();
    expect(mockDb.tokenLedger.createMany).toHaveBeenCalledOnce();
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockDb.freeTrialClaim.findUnique).not.toHaveBeenCalled();
  });

  it('uses the one-time token balance as the only free-trial limit', async () => {
    mockGetAvailableLicenseTokenBalance.mockResolvedValue(0);

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
    const response = await handler({
      request: new Request('http://localhost/api/mobile/manga-page/translate', {
        body: JSON.stringify({
          chapters: [
            {
              key: 'chapter-3',
              name: 'Chapter 3',
              url: 'https://example.test/manga/chapter-3',
            },
          ],
          manga: {
            title: 'Limit Test',
            url: 'https://example.test/manga',
          },
          sourceId: 'source-1',
          sourceLanguage: 'auto',
          targetLanguage: 'fr',
        }),
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'insufficient_tokens',
        details: {
          availableTokens: 0,
          isTrialOnly: true,
          requiredTokens: 5,
        },
      },
      ok: false,
    });
    expect(mockTranslateMangaPage).not.toHaveBeenCalled();
    expect(mockDb.tokenLedger.createMany).not.toHaveBeenCalled();
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockDb.freeTrialClaim.findUnique).toHaveBeenCalledOnce();
    expect(mockDb.order.findFirst).toHaveBeenCalledOnce();
  });

  it('blocks explicit adult manga page metadata before token and translation work', async () => {
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
    const response = await handler({
      request: new Request('http://localhost/api/mobile/manga-page/translate', {
        body: JSON.stringify({
          chapters: [
            {
              key: 'chapter-1',
              name: 'Chapter 1',
              url: 'https://example.test/manga/chapter-1',
            },
          ],
          manga: {
            genres: ['BL', 'Romance'],
            tags: ['Pornographic'],
            title: 'Blocked Test',
            url: 'https://example.test/manga',
          },
          sourceId: 'source-1',
          sourceLanguage: 'auto',
          targetLanguage: 'fr',
        }),
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(451);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'explicit_adult_content_blocked',
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
      },
      ok: false,
    });
    expect(mockGetAvailableLicenseTokenBalance).not.toHaveBeenCalled();
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockTranslateMangaPage).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'official_explicit_adult_metadata',
        type: 'content_policy_blocked',
      })
    );
    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toMatch(
      /Blocked Test|Pornographic|device-1|license-1/
    );
  });
});
