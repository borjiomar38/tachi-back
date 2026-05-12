import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAuthenticateAndRateLimitMobileJobRequest,
  mockDb,
  mockGetAvailableLicenseTokenBalance,
  mockLogger,
  mockTranslateMangaPage,
  mockVoidMobileJobReservationOnError,
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
    info: vi.fn(),
    warn: vi.fn(),
  },
  mockTranslateMangaPage: vi.fn(),
  mockVoidMobileJobReservationOnError: vi.fn(),
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
    voidMobileJobReservationOnError: mockVoidMobileJobReservationOnError,
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
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockTranslateMangaPage.mockReset();
    mockVoidMobileJobReservationOnError.mockReset();

    mockLogger.child.mockReturnValue({
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

  it('returns the free trial daily limit modal contract before translating a third chapter', async () => {
    const acquireDailyLock = vi.fn().mockResolvedValue([{ locked: true }]);
    const countDailyJobs = vi.fn().mockResolvedValue(2);

    mockDb.$transaction.mockImplementation(async (callback) => {
      const tx = {
        $queryRaw: acquireDailyLock,
        order: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        tokenLedger: {
          createMany: vi.fn(),
        },
        translationJob: {
          count: countDailyJobs,
        },
      };

      return await callback(tx);
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

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'free_trial_daily_limit_exceeded',
        details: {
          dailyLimit: 2,
          remainingChapters: 0,
          requestedChapters: 1,
          resetsAt: expect.any(String),
          usedChapters: 2,
        },
      },
      ok: false,
    });
    expect(mockTranslateMangaPage).not.toHaveBeenCalled();
    expect(countDailyJobs).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: expect.any(Date),
          lt: expect.any(Date),
        },
        licenseId: 'license-free-trial-1',
      },
    });
  });

  it('counts same-day manga-page usage before allowing another free trial chapter', async () => {
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ chapterCount: 2 }]);
    const countDailyJobs = vi.fn().mockResolvedValue(0);

    mockDb.$transaction.mockImplementation(async (callback) => {
      const tx = {
        $queryRaw: queryRaw,
        order: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        tokenLedger: {
          createMany: vi.fn(),
        },
        translationJob: {
          count: countDailyJobs,
        },
      };

      return await callback(tx);
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

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'free_trial_daily_limit_exceeded',
        details: {
          dailyLimit: 2,
          remainingChapters: 0,
          requestedChapters: 1,
          resetsAt: expect.any(String),
          usedChapters: 2,
        },
      },
      ok: false,
    });
    expect(countDailyJobs).toHaveBeenCalledOnce();
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(mockTranslateMangaPage).not.toHaveBeenCalled();
  });
});
