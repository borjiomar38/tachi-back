import { z } from 'zod';

import { zHostedPageTranslation } from '@/server/provider-gateway/schema';

const zPageMimeType = z
  .string()
  .trim()
  .min(1)
  .regex(/^image\/[a-z0-9.+-]+$/i);

export const zTranslationChapterIdentity = z
  .object({
    chapterName: z.string().trim().min(1).max(255).optional(),
    chapterUrl: z.string().trim().min(1).max(2048),
    mangaTitle: z.string().trim().min(1).max(255).optional(),
    mangaUrl: z.string().trim().min(1).max(2048).optional(),
    sourceId: z.string().trim().min(1).max(64).optional(),
    sourceName: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const zCreateTranslationJobInput = z
  .object({
    chapterIdentity: zTranslationChapterIdentity.optional(),
    ocrProvider: z.literal('google_cloud_vision').optional(),
    pages: z
      .array(
        z.object({
          checksumSha256: z
            .string()
            .trim()
            .length(64)
            .regex(/^[a-f0-9]+$/i)
            .optional(),
          fileName: z.string().trim().min(1).max(255),
          mimeType: zPageMimeType,
          sizeBytes: z.number().int().positive().max(50_000_000),
        })
      )
      .min(1)
      .max(200),
    sourceLanguage: z.string().trim().min(1).max(32).default('auto'),
    targetLanguage: z.string().trim().min(2).max(32),
    translationProvider: z.enum(['anthropic', 'gemini', 'openai']).optional(),
  })
  .superRefine((input, context) => {
    const seenFileNames = new Set<string>();

    for (const [index, page] of input.pages.entries()) {
      if (seenFileNames.has(page.fileName)) {
        context.addIssue({
          code: 'custom',
          message: 'Page file names must be unique within a job.',
          path: ['pages', index, 'fileName'],
        });
        continue;
      }

      seenFileNames.add(page.fileName);
    }
  });

export const zTranslationJobPageUploadInput = z.object({
  jobId: z.string().trim().min(1),
  pageNumber: z.coerce.number().int().positive(),
});

export const zTranslationJobControlInput = z.object({
  jobId: z.string().trim().min(1),
});

export const zTranslationJobPageSummary = z.object({
  checksumSha256: z.string().nullish(),
  fileName: z.string(),
  mimeType: z.string().nullish(),
  pageNumber: z.number().int().positive(),
  sizeBytes: z.number().int().positive().nullish(),
  uploadedAt: z.date().nullish(),
  uploadedBytes: z.number().int().nonnegative().nullish(),
  uploadPath: z.string(),
  uploadStatus: z.enum(['pending', 'uploaded']),
});

export const zTranslationJobSummary = z.object({
  completedAt: z.date().nullish(),
  createdAt: z.date(),
  errorCode: z.string().nullish(),
  errorMessage: z.string().nullish(),
  failedAt: z.date().nullish(),
  id: z.string(),
  pageCount: z.number().int().positive(),
  pages: z.array(zTranslationJobPageSummary),
  progressMessage: z.string().nullish(),
  progressPercent: z.number().int().min(0).max(100),
  progressStage: z
    .enum([
      'created',
      'uploading',
      'queued',
      'starting',
      'ocr',
      'translation',
      'finalizing',
      'completed',
      'failed',
    ])
    .nullish(),
  queuedAt: z.date().nullish(),
  reservedTokens: z.number().int().nonnegative(),
  resultPath: z.string().nullish(),
  sourceLanguage: z.string(),
  spentTokens: z.number().int().nonnegative(),
  startedAt: z.date().nullish(),
  status: z.enum([
    'created',
    'awaiting_upload',
    'queued',
    'processing',
    'completed',
    'failed',
    'canceled',
    'expired',
  ]),
  targetLanguage: z.string(),
  uploadCompletedAt: z.date().nullish(),
  uploadedPageCount: z.number().int().nonnegative(),
});

export const zCreateTranslationJobResponse = z.object({
  job: zTranslationJobSummary,
  upload: z.object({
    expiresAt: z.date().nullish(),
    method: z.literal('PUT'),
    mode: z.literal('server_multipart'),
  }),
});

export const zTranslationJobResultManifest = z.object({
  completedAt: z.date(),
  deviceId: z.string(),
  jobId: z.string(),
  licenseId: z.string(),
  pageCount: z.number().int().positive(),
  pageOrder: z.array(z.string()).min(1),
  pages: z.record(z.string(), zHostedPageTranslation),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  translatorType: z.enum(['anthropic', 'gemini', 'openai']),
  version: z.enum(['2026-03-20.phase11.v1', '2026-05-03.ocr-grouping.v1']),
});

export type TranslationJobResultManifest = z.infer<
  typeof zTranslationJobResultManifest
>;
