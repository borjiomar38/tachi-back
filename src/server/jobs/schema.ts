import { z } from 'zod';

import { zHostedPageTranslation } from '@/server/provider-gateway/schema';

const zPageMimeType = z
  .string()
  .trim()
  .min(1)
  .regex(/^image\/[a-z0-9.+-]+$/i);

const zPageChecksumSha256 = z
  .string()
  .trim()
  .length(64)
  .regex(/^[a-f0-9]+$/i);

export const zTranslationChapterIdentity = z
  .object({
    categories: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    chapterName: z.string().trim().min(1).max(255).optional(),
    chapterUrl: z.string().trim().min(1).max(2048),
    contentRating: z.string().trim().min(1).max(255).optional(),
    genres: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    mangaTitle: z.string().trim().min(1).max(255).optional(),
    mangaUrl: z.string().trim().min(1).max(2048).optional(),
    rating: z.string().trim().min(1).max(255).optional(),
    sourceId: z.string().trim().min(1).max(64).optional(),
    sourceName: z.string().trim().min(1).max(255).optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  })
  .strict();

export const zMobileOcrRegionHint = z
  .object({
    confidence: z.number().min(0).max(1).optional(),
    height: z.number().positive(),
    hintId: z.string().trim().min(1).max(80),
    kind: z.enum(['white_bubble']).default('white_bubble'),
    sourceBlockCount: z.number().int().positive().max(100).optional(),
    width: z.number().positive(),
    x: z.number(),
    y: z.number(),
  })
  .strict();

export const zMobileOcrRegionHints = z
  .object({
    algorithm: z.string().trim().min(1).max(120),
    coordinateSpace: z
      .literal('original_image_px')
      .default('original_image_px'),
    imageHeight: z.number().positive(),
    imageWidth: z.number().positive(),
    regions: z.array(zMobileOcrRegionHint).max(512),
    schemaVersion: z
      .literal('mobile_ocr_region_hints.v1')
      .default('mobile_ocr_region_hints.v1'),
    status: z.enum(['ok', 'failed', 'skipped']).default('ok'),
  })
  .strict();

export const zTranslationJobUploadSourcePage = z
  .object({
    checksumSha256: zPageChecksumSha256.optional(),
    fileName: z.string().trim().min(1).max(255),
    height: z.number().int().positive().max(100_000),
    logicalFileName: z.string().trim().min(1).max(255).optional(),
    logicalHeight: z.number().int().positive().max(100_000).optional(),
    logicalOffsetX: z.number().int().nonnegative().max(1_000_000).optional(),
    logicalOffsetY: z.number().int().nonnegative().max(1_000_000).optional(),
    logicalPageNumber: z.number().int().positive().max(200).optional(),
    logicalWidth: z.number().int().positive().max(100_000).optional(),
    offsetX: z.number().int().nonnegative().max(1_000_000),
    offsetY: z.number().int().nonnegative().max(1_000_000),
    originalPageNumber: z.number().int().positive().max(200).optional(),
    width: z.number().int().positive().max(100_000),
  })
  .strict();

export const zTranslationJobUploadSourcePages = z
  .array(zTranslationJobUploadSourcePage)
  .min(1)
  .max(200);

export const zCreateTranslationJobInput = z
  .object({
    chapterIdentity: zTranslationChapterIdentity.optional(),
    ocrProvider: z.literal('google_cloud_vision').optional(),
    pages: z
      .array(
        z.object({
          checksumSha256: zPageChecksumSha256.optional(),
          fileName: z.string().trim().min(1).max(255),
          mimeType: zPageMimeType,
          mobileOcrRegionHints: zMobileOcrRegionHints.optional(),
          sizeBytes: z.number().int().positive().max(50_000_000),
          sourcePages: zTranslationJobUploadSourcePages.optional(),
        })
      )
      .min(1)
      .max(200),
    sourceLanguage: z.string().trim().min(1).max(32).default('auto'),
    targetLanguage: z.string().trim().min(2).max(32),
    translationProvider: z.enum(['anthropic', 'gemini', 'openai']).optional(),
  })
  .superRefine((input, context) => {
    const seenUploadFileNames = new Set<string>();
    const seenSourceFileNames = new Set<string>();
    const seenLogicalPageNames = new Set<string>();

    for (const [index, page] of input.pages.entries()) {
      if (seenUploadFileNames.has(page.fileName)) {
        context.addIssue({
          code: 'custom',
          message: 'Upload file names must be unique within a job.',
          path: ['pages', index, 'fileName'],
        });
      } else {
        seenUploadFileNames.add(page.fileName);
      }

      const sourcePages: Array<{
        fileName: string;
        logicalFileName?: string;
        logicalHeight?: number;
        logicalOffsetX?: number;
        logicalOffsetY?: number;
        logicalPageNumber?: number;
        logicalWidth?: number;
      }> = page.sourcePages ?? [
        {
          fileName: page.fileName,
        },
      ];

      for (const [sourceIndex, sourcePage] of sourcePages.entries()) {
        if (seenSourceFileNames.has(sourcePage.fileName)) {
          context.addIssue({
            code: 'custom',
            message: 'Source page file names must be unique within a job.',
            path: page.sourcePages
              ? ['pages', index, 'sourcePages', sourceIndex, 'fileName']
              : ['pages', index, 'fileName'],
          });
          continue;
        }

        seenSourceFileNames.add(sourcePage.fileName);

        const logicalFileName =
          'logicalFileName' in sourcePage
            ? sourcePage.logicalFileName
            : undefined;
        if (logicalFileName) {
          const requiredLogicalFields = [
            'logicalHeight',
            'logicalOffsetX',
            'logicalOffsetY',
            'logicalPageNumber',
            'logicalWidth',
          ] as const;

          for (const field of requiredLogicalFields) {
            if (!(field in sourcePage) || sourcePage[field] == null) {
              context.addIssue({
                code: 'custom',
                message:
                  'Logical split page metadata must include all logical dimensions and offsets.',
                path: ['pages', index, 'sourcePages', sourceIndex, field],
              });
            }
          }
        }

        seenLogicalPageNames.add(logicalFileName ?? sourcePage.fileName);
      }
    }

    if (seenLogicalPageNames.size > 200) {
      context.addIssue({
        code: 'custom',
        message: 'A job can contain at most 200 source pages.',
        path: ['pages'],
      });
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

export const zTranslationJobDirectPageUpload = z.object({
  confirmPath: z.string(),
  headers: z.record(z.string(), z.string()),
  method: z.literal('PUT'),
  pageNumber: z.number().int().positive(),
  uploadUrl: z.url(),
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
    mode: z.enum(['direct_object_storage', 'server_multipart']),
    pages: z.array(zTranslationJobDirectPageUpload).optional(),
  }),
});

const zTranslationJobResultPageFingerprint = z.object({
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  fileName: z.string().min(1),
  pageNumber: z.number().int().positive(),
});

export const zTranslationJobResultManifest = z.object({
  completedAt: z.date(),
  deviceId: z.string(),
  jobId: z.string(),
  licenseId: z.string(),
  pageCount: z.number().int().positive(),
  pageFingerprints: z
    .array(zTranslationJobResultPageFingerprint)
    .min(1)
    .optional(),
  pageOrder: z.array(z.string()).min(1),
  pages: z.record(z.string(), zHostedPageTranslation),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  translatorType: z.enum(['anthropic', 'gemini', 'openai']),
  version: z.enum([
    '2026-03-20.phase11.v1',
    '2026-05-03.ocr-grouping.v1',
    '2026-05-05.mobile-layout-hints.v1',
    '2026-05-06.no-mobile-layout-hints.v1',
  ]),
});

export type TranslationJobResultManifest = z.infer<
  typeof zTranslationJobResultManifest
>;
export type MobileOcrRegionHints = z.infer<typeof zMobileOcrRegionHints>;
