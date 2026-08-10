import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAppConfigFindUnique, mockAssessmentFindUnique, mockLogger } =
  vi.hoisted(() => ({
    mockAppConfigFindUnique: vi.fn(),
    mockAssessmentFindUnique: vi.fn(),
    mockLogger: {
      child: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  }));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
  }),
}));

vi.mock('@/server/db', () => ({
  db: {
    appConfig: {
      findUnique: mockAppConfigFindUnique,
    },
    mangaPornographyAssessment: {
      findUnique: mockAssessmentFindUnique,
    },
  },
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

import { Route } from './check';

describe('POST /api/mobile/content-policy/check', () => {
  beforeEach(() => {
    mockLogger.child.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.error.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.child.mockReturnValue(mockLogger);
    mockAppConfigFindUnique.mockReset();
    mockAppConfigFindUnique.mockResolvedValue(null);
    mockAssessmentFindUnique.mockReset();
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

  it('returns a cached automatic pornography block for the same source and title', async () => {
    mockAssessmentFindUnique.mockResolvedValue({
      id: 'assessment-1',
      manualDecision: null,
      status: 'completed',
      verdict: 'block',
    });

    const response = await handler({
      request: new Request('http://localhost/api/mobile/content-policy/check', {
        body: JSON.stringify({
          manga: {
            genres: ['Action'],
            mangaTitle: 'Automatically Blocked Test',
            mangaUrl: '/manga/automatically-blocked',
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
        blocked: true,
        details: {
          i18n: {
            fallbackBody:
              'This title was blocked after an automated explicit-pornography check.',
            fallbackTitle: 'Title unavailable',
          },
          reason: 'automatic_pornography_detection',
          signal: {
            field: 'manga',
            value: 'Automatically Blocked Test',
          },
        },
        reason: 'automatic_pornography_detection',
      },
      ok: true,
    });
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 'assessment-1',
        reason: 'automatic_pornography_detection',
        type: 'content_policy_blocked',
      })
    );
    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain(
      'Automatically Blocked Test'
    );
    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain(
      'source-1'
    );
  });

  it('ignores a cached AI block when a manager disables the automation', async () => {
    mockAppConfigFindUnique.mockImplementation(async ({ where }) =>
      where.key === 'content_policy_manga_pornography_automation:2026-08-09.v1'
        ? {
            updatedAt: new Date('2026-08-09T12:00:00.000Z'),
            value: { enabled: false },
          }
        : null
    );
    mockAssessmentFindUnique.mockResolvedValue({
      id: 'assessment-disabled-automation',
      manualDecision: null,
      status: 'completed',
      verdict: 'block',
    });

    const response = await handler({
      request: new Request('http://localhost/api/mobile/content-policy/check', {
        body: JSON.stringify({
          manga: {
            mangaTitle: 'Cached Block While Disabled',
            sourceId: 'source-1',
          },
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    await expect(response.json()).resolves.toMatchObject({
      data: {
        blocked: false,
        details: null,
        reason: null,
      },
      ok: true,
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
