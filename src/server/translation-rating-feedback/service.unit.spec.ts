import { describe, expect, it, vi } from 'vitest';

import { zCreateTranslationRatingFeedbackInput } from '@/server/translation-rating-feedback/schema';
import {
  buildTranslationRatingChapterFingerprint,
  createTranslationRatingFeedback,
} from '@/server/translation-rating-feedback/service';

const now = new Date('2026-06-13T10:00:00.000Z');

describe('translation rating feedback service', () => {
  it('accepts ratings from 1 to 5 and rejects invalid ratings', () => {
    const baseInput = {
      chapterCacheKey: 'chapter-cache-1',
      rating: 1,
      targetLanguage: 'en',
    };

    for (const rating of [1, 2, 3, 4, 5]) {
      expect(
        zCreateTranslationRatingFeedbackInput.safeParse({
          ...baseInput,
          rating,
        }).success
      ).toBe(true);
    }

    for (const rating of [0, 6, 1.5]) {
      expect(
        zCreateTranslationRatingFeedbackInput.safeParse({
          ...baseInput,
          rating,
        }).success
      ).toBe(false);
    }
  });

  it('rejects overlong comments and submissions without a chapter signal', () => {
    expect(
      zCreateTranslationRatingFeedbackInput.safeParse({
        comment: 'a'.repeat(1001),
        rating: 5,
        targetLanguage: 'en',
        translationJobId: 'job-1',
      }).success
    ).toBe(false);

    expect(
      zCreateTranslationRatingFeedbackInput.safeParse({
        rating: 5,
        targetLanguage: 'en',
      }).success
    ).toBe(false);
  });

  it('builds a normalized chapter fingerprint from stable chapter identity', () => {
    expect(
      buildTranslationRatingChapterFingerprint({
        chapterIdentity: {
          chapterUrl: ' HTTPS://EXAMPLE.COM/Manga/Chapter-1 ',
          mangaTitle: 'Example Manga',
        },
        rating: 4,
        targetLanguage: 'fr',
      })
    ).toBe('https://example.com/manga/chapter-1');
  });

  it('returns an existing duplicate instead of creating another row', async () => {
    const existing = {
      createdAt: now,
      id: 'feedback-1',
      rating: 2,
    };
    const dbClient = {
      translationRatingFeedback: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(existing),
        findUniqueOrThrow: vi.fn(),
      },
    };

    const result = await createTranslationRatingFeedback(
      {
        chapterCacheKey: 'chapter-cache-1',
        comment: 'The pronouns were inconsistent.',
        rating: 2,
        targetLanguage: 'en',
      },
      {
        actor: {
          deviceId: 'device-1',
          licenseId: 'license-1',
        },
        dbClient: dbClient as never,
      }
    );

    expect(result).toEqual({
      duplicate: true,
      feedback: existing,
    });
    expect(dbClient.translationRatingFeedback.create).not.toHaveBeenCalled();
  });

  it('creates feedback with chapter metadata for first submission', async () => {
    const created = {
      createdAt: now,
      id: 'feedback-2',
      rating: 5,
    };
    const dbClient = {
      translationRatingFeedback: {
        create: vi.fn().mockResolvedValue(created),
        findUnique: vi.fn().mockResolvedValue(null),
        findUniqueOrThrow: vi.fn(),
      },
    };

    const result = await createTranslationRatingFeedback(
      {
        chapterIdentity: {
          chapterName: 'Chapter 7',
          chapterUrl: 'https://example.com/chapter-7',
          mangaTitle: 'Example Manga',
          sourceName: 'Example Source',
        },
        comment: 'Great names and tone.',
        pageCount: 12,
        rating: 5,
        readDurationMs: 180_000,
        targetLanguage: 'en',
      },
      {
        actor: {
          appVersion: '0.18.0',
          deviceId: 'device-1',
          licenseId: 'license-1',
          mobileSessionId: 'session-1',
        },
        dbClient: dbClient as never,
      }
    );

    expect(result).toEqual({
      duplicate: false,
      feedback: created,
    });
    expect(dbClient.translationRatingFeedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          chapterFingerprint: 'https://example.com/chapter-7',
          chapterName: 'Chapter 7',
          comment: 'Great names and tone.',
          mangaTitle: 'Example Manga',
          mobileSessionId: 'session-1',
          rating: 5,
        }),
      })
    );
  });
});
