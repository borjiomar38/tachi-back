import { z } from 'zod';

import { zTranslationChapterIdentity } from '@/server/jobs/schema';

export const TRANSLATION_RATING_FEEDBACK_COMMENT_MAX_LENGTH = 1000;

export const zCreateTranslationRatingFeedbackInput = z
  .object({
    chapterCacheKey: z.string().trim().min(1).max(255).optional(),
    chapterIdentity: zTranslationChapterIdentity.optional(),
    clientSessionId: z.string().trim().min(1).max(128).optional(),
    comment: z
      .string()
      .trim()
      .max(TRANSLATION_RATING_FEEDBACK_COMMENT_MAX_LENGTH)
      .optional(),
    pageCount: z.number().int().positive().max(200).optional(),
    providerSignature: z.string().trim().min(1).max(255).optional(),
    rating: z.number().int().min(1).max(5),
    readDurationMs: z
      .number()
      .int()
      .positive()
      .max(24 * 60 * 60 * 1000)
      .optional(),
    sourceLanguage: z.string().trim().min(1).max(32).optional(),
    targetLanguage: z.string().trim().min(1).max(32),
    translationCacheKey: z.string().trim().min(1).max(255).optional(),
    translationJobId: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      !input.chapterCacheKey &&
      !input.chapterIdentity &&
      !input.translationCacheKey &&
      !input.translationJobId
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Provide chapterCacheKey, chapterIdentity, translationCacheKey, or translationJobId.',
        path: ['chapterIdentity'],
      });
    }
  });

export type CreateTranslationRatingFeedbackInput = z.infer<
  typeof zCreateTranslationRatingFeedbackInput
>;

export const zTranslationRatingFeedbackSubmissionResponse = z.object({
  duplicate: z.boolean(),
  feedback: z.object({
    createdAt: z.date(),
    id: z.string(),
    rating: z.number().int().min(1).max(5),
  }),
});

export const zBackofficeTranslationRatingFeedbackRatingFilter = z.enum([
  'all',
  'low',
  '1',
  '2',
  '3',
  '4',
  '5',
]);

export const zBackofficeTranslationRatingFeedbackListInput = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  rating: zBackofficeTranslationRatingFeedbackRatingFilter.default('all'),
  searchTerm: z.string().trim().max(128).optional().default(''),
});

export const zBackofficeTranslationRatingFeedbackListItem = z.object({
  appBuild: z.string().nullish(),
  appVersion: z.string().nullish(),
  chapterCacheKey: z.string().nullish(),
  chapterName: z.string().nullish(),
  chapterUrl: z.string().nullish(),
  comment: z.string().nullish(),
  createdAt: z.date(),
  deviceId: z.string(),
  id: z.string(),
  installationId: z.string(),
  licenseKey: z.string(),
  locale: z.string().nullish(),
  mangaTitle: z.string().nullish(),
  ownerEmail: z.string().nullish(),
  pageCount: z.number().int().positive().nullish(),
  rating: z.number().int().min(1).max(5),
  readDurationMs: z.number().int().positive().nullish(),
  sourceLanguage: z.string().nullish(),
  sourceName: z.string().nullish(),
  targetLanguage: z.string(),
  translationCacheKey: z.string().nullish(),
  translationJobId: z.string().nullish(),
});

export const zBackofficeTranslationRatingFeedbackStats = z.object({
  averageRating: z.number().nullable(),
  commentCount: z.number().int().nonnegative(),
  lowRatingCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const zBackofficeTranslationRatingFeedbackListResponse = z.object({
  items: z.array(zBackofficeTranslationRatingFeedbackListItem),
  stats: zBackofficeTranslationRatingFeedbackStats,
  total: z.number().int().nonnegative(),
});
