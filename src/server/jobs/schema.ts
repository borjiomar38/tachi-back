import { z } from 'zod';

import {
  OCR_UPLOAD_COMPRESSION_POLICY_VERSION,
  zOcrUploadCompressionProfile,
} from '@/server/ocr-upload-compression/schema';
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

const MAX_TRANSLATION_JOB_UPLOAD_TOTAL_BYTES = 10_000_000_000;
const OCR_UPLOAD_COMPRESSION_POLICY_REVISION_PATTERN = new RegExp(
  `^ocr-upload-v${OCR_UPLOAD_COMPRESSION_POLICY_VERSION}-[a-f\\d]{16}$`
);

const zTranslationJobUploadTotalBytes = z
  .number()
  .int()
  .positive()
  .max(MAX_TRANSLATION_JOB_UPLOAD_TOTAL_BYTES);

export const zTranslationJobOcrUploadMetadata = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('original'),
      originalTotalBytes: zTranslationJobUploadTotalBytes,
      policyRevision: z
        .string()
        .trim()
        .regex(OCR_UPLOAD_COMPRESSION_POLICY_REVISION_PATTERN),
      policyVersion: z.literal(OCR_UPLOAD_COMPRESSION_POLICY_VERSION),
      preparedTotalBytes: zTranslationJobUploadTotalBytes,
      profile: z.literal('original'),
    })
    .strict(),
  z
    .object({
      mode: z.literal('webp'),
      originalTotalBytes: zTranslationJobUploadTotalBytes,
      policyRevision: z
        .string()
        .trim()
        .regex(OCR_UPLOAD_COMPRESSION_POLICY_REVISION_PATTERN),
      policyVersion: z.literal(OCR_UPLOAD_COMPRESSION_POLICY_VERSION),
      preparedTotalBytes: zTranslationJobUploadTotalBytes,
      profile: zOcrUploadCompressionProfile.exclude(['original']),
    })
    .strict(),
]);

export type TranslationJobOcrUploadMetadata = z.infer<
  typeof zTranslationJobOcrUploadMetadata
>;

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
    // width/height stay in uploaded batch pixels; these restore the pre-resize space.
    originalHeight: z.number().int().positive().max(100_000).optional(),
    originalPageNumber: z.number().int().positive().max(200).optional(),
    originalWidth: z.number().int().positive().max(100_000).optional(),
    width: z.number().int().positive().max(100_000),
  })
  .strict()
  .superRefine((sourcePage, context) => {
    const hasOriginalHeight = sourcePage.originalHeight != null;
    const hasOriginalWidth = sourcePage.originalWidth != null;

    if (hasOriginalHeight !== hasOriginalWidth) {
      context.addIssue({
        code: 'custom',
        message:
          'Original source page dimensions must include both originalWidth and originalHeight.',
        path: [hasOriginalWidth ? 'originalHeight' : 'originalWidth'],
      });
      return;
    }

    if (
      hasOriginalDimensions(sourcePage) &&
      (sourcePage.originalWidth < sourcePage.width ||
        sourcePage.originalHeight < sourcePage.height)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Original source page dimensions cannot be smaller than the uploaded OCR dimensions.',
        path: ['originalWidth'],
      });
    }

    if (!sourcePage.logicalFileName) {
      return;
    }

    const requiredLogicalFields = [
      'logicalHeight',
      'logicalOffsetX',
      'logicalOffsetY',
      'logicalPageNumber',
      'logicalWidth',
    ] as const;

    for (const field of requiredLogicalFields) {
      if (sourcePage[field] == null) {
        context.addIssue({
          code: 'custom',
          message:
            'Logical split page metadata must include all logical dimensions and offsets.',
          path: [field],
        });
      }
    }

    if (!hasCompleteLogicalGeometry(sourcePage)) {
      return;
    }

    const fragmentWidth = sourcePage.originalWidth ?? sourcePage.width;
    const fragmentHeight = sourcePage.originalHeight ?? sourcePage.height;

    if (sourcePage.logicalOffsetX + fragmentWidth > sourcePage.logicalWidth) {
      context.addIssue({
        code: 'custom',
        message:
          'The logical horizontal offset and source fragment width must fit within logicalWidth.',
        path: ['logicalWidth'],
      });
    }

    if (sourcePage.logicalOffsetY + fragmentHeight > sourcePage.logicalHeight) {
      context.addIssue({
        code: 'custom',
        message:
          'The logical vertical offset and source fragment height must fit within logicalHeight.',
        path: ['logicalHeight'],
      });
    }
  });

export const zTranslationJobUploadSourcePages = z
  .array(zTranslationJobUploadSourcePage)
  .min(1)
  .max(200)
  .superRefine((sourcePages, context) => {
    const originalDimensionCount = sourcePages.filter(
      hasOriginalDimensions
    ).length;

    if (
      originalDimensionCount > 0 &&
      originalDimensionCount < sourcePages.length
    ) {
      for (const [index, sourcePage] of sourcePages.entries()) {
        if (hasOriginalDimensions(sourcePage)) {
          continue;
        }

        context.addIssue({
          code: 'custom',
          message:
            'A resized OCR batch must include original dimensions for every source page.',
          path: [index, 'originalWidth'],
        });
      }
    }

    for (const conflict of getTranslationJobLogicalGeometryConflicts(
      sourcePages
    )) {
      context.addIssue({
        code: 'custom',
        message: `All fragments of ${conflict.logicalFileName} must use the same ${conflict.field}.`,
        path: [conflict.sourcePageIndex, conflict.field],
      });
    }
  });

export type TranslationJobUploadSourcePage = z.infer<
  typeof zTranslationJobUploadSourcePage
>;

const LOGICAL_GEOMETRY_FIELDS = [
  'logicalHeight',
  'logicalPageNumber',
  'logicalWidth',
] as const;

type TranslationJobLogicalGeometryField =
  (typeof LOGICAL_GEOMETRY_FIELDS)[number];

export interface TranslationJobLogicalGeometryConflict {
  actualValue: number;
  expectedValue: number;
  field: TranslationJobLogicalGeometryField;
  fileName: string;
  logicalFileName: string;
  sourcePageIndex: number;
}

/**
 * Cross-fragment policy shared by request validation and persisted-job replay.
 * A logical output page is keyed by file name, so every physical fragment that
 * contributes to it must agree on its page number and canvas dimensions.
 */
export const getTranslationJobLogicalGeometryConflicts = (
  sourcePages: readonly TranslationJobUploadSourcePage[]
): TranslationJobLogicalGeometryConflict[] => {
  const geometryByLogicalFileName = new Map<
    string,
    Pick<
      Required<TranslationJobUploadSourcePage>,
      'logicalHeight' | 'logicalPageNumber' | 'logicalWidth'
    >
  >();
  const conflicts: TranslationJobLogicalGeometryConflict[] = [];

  for (const [sourcePageIndex, sourcePage] of sourcePages.entries()) {
    if (!hasCompleteLogicalGeometry(sourcePage)) {
      continue;
    }

    const expectedGeometry = geometryByLogicalFileName.get(
      sourcePage.logicalFileName
    );

    if (!expectedGeometry) {
      geometryByLogicalFileName.set(sourcePage.logicalFileName, {
        logicalHeight: sourcePage.logicalHeight,
        logicalPageNumber: sourcePage.logicalPageNumber,
        logicalWidth: sourcePage.logicalWidth,
      });
      continue;
    }

    for (const field of LOGICAL_GEOMETRY_FIELDS) {
      if (sourcePage[field] === expectedGeometry[field]) {
        continue;
      }

      conflicts.push({
        actualValue: sourcePage[field],
        expectedValue: expectedGeometry[field],
        field,
        fileName: sourcePage.fileName,
        logicalFileName: sourcePage.logicalFileName,
        sourcePageIndex,
      });
    }
  }

  return conflicts;
};

function hasOriginalDimensions(sourcePage: {
  originalHeight?: number;
  originalWidth?: number;
}): sourcePage is {
  originalHeight: number;
  originalWidth: number;
} {
  return sourcePage.originalHeight != null && sourcePage.originalWidth != null;
}

function hasCompleteLogicalGeometry(
  sourcePage: TranslationJobUploadSourcePage
): sourcePage is TranslationJobUploadSourcePage & {
  logicalFileName: string;
  logicalHeight: number;
  logicalOffsetX: number;
  logicalOffsetY: number;
  logicalPageNumber: number;
  logicalWidth: number;
} {
  return (
    sourcePage.logicalFileName != null &&
    sourcePage.logicalHeight != null &&
    sourcePage.logicalOffsetX != null &&
    sourcePage.logicalOffsetY != null &&
    sourcePage.logicalPageNumber != null &&
    sourcePage.logicalWidth != null
  );
}

export const zCreateTranslationJobInput = z
  .object({
    chapterIdentity: zTranslationChapterIdentity.optional(),
    ocrUpload: zTranslationJobOcrUploadMetadata.optional(),
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
        seenLogicalPageNames.add(logicalFileName ?? sourcePage.fileName);
      }
    }

    const logicalSourcePageEntries = input.pages.flatMap((page, pageIndex) =>
      (page.sourcePages ?? []).map((sourcePage, sourceIndex) => ({
        pageIndex,
        sourceIndex,
        sourcePage,
      }))
    );

    for (const conflict of getTranslationJobLogicalGeometryConflicts(
      logicalSourcePageEntries.map((entry) => entry.sourcePage)
    )) {
      const entry = logicalSourcePageEntries[conflict.sourcePageIndex];
      if (!entry) {
        continue;
      }

      context.addIssue({
        code: 'custom',
        message: `All fragments of ${conflict.logicalFileName} must use the same ${conflict.field}.`,
        path: [
          'pages',
          entry.pageIndex,
          'sourcePages',
          entry.sourceIndex,
          conflict.field,
        ],
      });
    }

    if (seenLogicalPageNames.size > 200) {
      context.addIssue({
        code: 'custom',
        message: 'A job can contain at most 200 source pages.',
        path: ['pages'],
      });
    }

    if (!input.ocrUpload) {
      return;
    }

    const preparedTotalBytes = input.pages.reduce(
      (total, page) => total + page.sizeBytes,
      0
    );

    if (input.ocrUpload.preparedTotalBytes !== preparedTotalBytes) {
      context.addIssue({
        code: 'custom',
        message:
          'Prepared OCR upload bytes must match the sum of the uploaded pages.',
        path: ['ocrUpload', 'preparedTotalBytes'],
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
