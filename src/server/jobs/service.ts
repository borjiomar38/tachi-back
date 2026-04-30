import { createHash } from 'node:crypto';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { Prisma, ProviderType } from '@/server/db/generated/client';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
import { logger } from '@/server/logger';
import { getProviderGatewayManifestWithRuntimeConfig } from '@/server/provider-gateway/manifest';
import {
  HostedPageTranslation,
  NormalizedOcrPage,
} from '@/server/provider-gateway/schema';
import {
  mergeHostedPageTranslation,
  performHostedOcr,
  performHostedTranslation,
} from '@/server/provider-gateway/service';

import {
  type TranslationJobResultManifest,
  zCreateTranslationJobInput,
  zCreateTranslationJobResponse,
  zTranslationChapterIdentity,
  zTranslationJobControlInput,
  zTranslationJobPageUploadInput,
  zTranslationJobResultManifest,
  zTranslationJobSummary,
} from './schema';
import {
  deleteTranslationJobPageUploads,
  getTranslationJobPageUpload,
  getTranslationJobResultManifest,
  putTranslationJobPageUpload,
  putTranslationJobResultManifest,
  putTranslationResultCacheManifest,
} from './storage';

type MobileJobActor = {
  deviceId: string;
  licenseId: string;
};

type JobAssetRecord = {
  bucketName: string | null;
  checksumSha256: string | null;
  createdAt: Date;
  id: string;
  kind: 'page_upload' | 'result_manifest' | 'debug_artifact' | 'log_export';
  metadata: unknown;
  mimeType: string | null;
  objectKey: string | null;
  originalFileName: string | null;
  pageNumber: number | null;
  sizeBytes: number | null;
};

type JobRecord = {
  assets: JobAssetRecord[];
  chapterCacheKey: string | null;
  chapterIdentity: unknown;
  completedAt: Date | null;
  createdAt: Date;
  deviceId: string;
  errorCode: string | null;
  errorMessage: string | null;
  expiresAt: Date | null;
  failedAt: Date | null;
  id: string;
  licenseId: string;
  pageCount: number;
  queuedAt: Date | null;
  reservedTokens: number;
  resolvedOcrProvider: ProviderType | null;
  resolvedTranslationProvider: ProviderType | null;
  sourceLanguage: string;
  spentTokens: number;
  startedAt: Date | null;
  status:
    | 'created'
    | 'awaiting_upload'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'expired';
  targetLanguage: string;
  uploadCompletedAt: Date | null;
};

type UploadedOcrPage = {
  fileName: string;
  imageBytes: Uint8Array;
};

type UploadedOcrPageWithDimensions = UploadedOcrPage & {
  imageHeight: number;
  imageWidth: number;
};

type OcrBatchPlacement = {
  fileName: string;
  height: number;
  offsetX: number;
  offsetY: number;
  width: number;
};

type OcrBatch = {
  height: number;
  imageBytes: Uint8Array;
  placements: OcrBatchPlacement[];
  width: number;
};

const JOB_RESULT_VERSION = '2026-03-20.phase11.v1' as const;
const HOSTED_OCR_MAX_BATCH_HEIGHT = 30_000;
const HOSTED_OCR_MAX_BATCH_PIXELS = 40_000_000;
const HOSTED_OCR_MAX_INLINE_IMAGE_BYTES = 7 * 1024 * 1024;
const HOSTED_OCR_JPEG_QUALITY = 88;

export class TranslationJobError extends Error {
  constructor(
    readonly code:
      | 'checksum_mismatch'
      | 'insufficient_tokens'
      | 'invalid_job'
      | 'invalid_job_state'
      | 'invalid_provider'
      | 'invalid_upload'
      | 'payload_too_large'
      | 'result_not_ready'
      | 'upload_expired',
    readonly statusCode: number,
    options?: string | { details?: unknown; message?: string }
  ) {
    super(typeof options === 'string' ? options : (options?.message ?? code));
    this.details = typeof options === 'string' ? undefined : options?.details;
    this.name = 'TranslationJobError';
  }

  readonly details?: unknown;
}

export async function createTranslationJob(
  rawInput: unknown,
  deps: {
    actor: MobileJobActor;
    dbClient?: typeof db;
    now?: Date;
  }
) {
  const input = zCreateTranslationJobInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const now = deps.now ?? new Date();
  const providers = await resolveProviderSelection(
    {
      ocrProvider: input.ocrProvider,
      translationProvider: input.translationProvider,
    },
    {
      dbClient,
    }
  );
  const reservedTokens = calculateReservedTokens(input.pages.length);
  const availableTokens = await getAvailableLicenseTokenBalance(
    {
      licenseId: deps.actor.licenseId,
    },
    {
      dbClient,
    }
  );

  if (availableTokens < reservedTokens) {
    throw new TranslationJobError('insufficient_tokens', 409, {
      details: {
        availableTokens,
        requiredTokens: reservedTokens,
      },
    });
  }

  const expiresAt = new Date(
    now.getTime() + envServer.JOB_PAGE_UPLOAD_URL_TTL_SECONDS * 1000
  );

  const job = await dbClient.$transaction(async (tx) => {
    const createdJob = await tx.translationJob.create({
      data: {
        chapterCacheKey: buildChapterCacheKey(input.chapterIdentity),
        chapterIdentity: input.chapterIdentity
          ? (input.chapterIdentity as Prisma.InputJsonValue)
          : undefined,
        deviceId: deps.actor.deviceId,
        expiresAt,
        licenseId: deps.actor.licenseId,
        pageCount: input.pages.length,
        requestedOcrProvider: providers.requestedOcrProvider,
        requestedTranslationProvider: providers.requestedTranslationProvider,
        resolvedOcrProvider: providers.resolvedOcrProvider,
        resolvedTranslationProvider: providers.resolvedTranslationProvider,
        sourceLanguage: input.sourceLanguage,
        status: 'awaiting_upload',
        targetLanguage: input.targetLanguage,
      },
      select: {
        id: true,
      },
    });

    await tx.jobAsset.createMany({
      data: input.pages.map((page, index) => ({
        checksumSha256: page.checksumSha256 ?? null,
        jobId: createdJob.id,
        kind: 'page_upload',
        metadata: {
          uploadStatus: 'pending',
        },
        mimeType: page.mimeType,
        originalFileName: page.fileName,
        pageNumber: index + 1,
        sizeBytes: page.sizeBytes,
      })),
    });

    return await tx.translationJob.findUniqueOrThrow({
      where: { id: createdJob.id },
      select: translationJobSelect,
    });
  });

  const uploadAssets = job.assets
    .filter((asset) => asset.kind === 'page_upload')
    .sort((left, right) => (left.pageNumber ?? 0) - (right.pageNumber ?? 0));
  const cacheKey = buildTranslationResultCacheKey({
    job,
    uploadAssets,
  });
  const cached = await getCachedTranslationResultManifest({
    cacheKey,
    dbClient,
    job,
    log: logger,
    now,
    uploadAssets,
  });
  const cachedManifest = cached?.manifest ?? null;
  const cacheHitKey = cached?.cacheKey ?? cacheKey;

  if (cacheHitKey && cachedManifest) {
    const completedJob = await completeTranslationJobFromCachedManifest({
      cacheKey: cacheHitKey,
      dbClient,
      job,
      manifest: cachedManifest,
      now,
      spentTokens: reservedTokens,
    });

    logger.info({
      cacheKey: cacheHitKey,
      jobId: job.id,
      pageCount: job.pageCount,
      scope: 'jobs',
      status: 'created_from_cache',
    });

    return zCreateTranslationJobResponse.parse({
      job: buildTranslationJobSummary(completedJob),
      upload: {
        expiresAt: completedJob.expiresAt,
        method: 'PUT',
        mode: 'server_multipart',
      },
    });
  }

  return zCreateTranslationJobResponse.parse({
    job: buildTranslationJobSummary(job),
    upload: {
      expiresAt: job.expiresAt,
      method: 'PUT',
      mode: 'server_multipart',
    },
  });
}

export async function uploadTranslationJobPage(
  rawInput: unknown,
  deps: {
    actor: MobileJobActor;
    body: Uint8Array;
    contentLength?: number | null;
    contentType: string | null;
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'error' | 'info'>;
    now?: Date;
  }
) {
  const input = zTranslationJobPageUploadInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();
  const startedAt = Date.now();

  if (deps.contentLength && deps.contentLength > envServer.JOB_MAX_PAGE_BYTES) {
    throw new TranslationJobError('payload_too_large', 413);
  }

  if (deps.body.byteLength > envServer.JOB_MAX_PAGE_BYTES) {
    throw new TranslationJobError('payload_too_large', 413);
  }

  const job = await getAuthorizedJob(input.jobId, deps.actor, {
    dbClient,
  });

  if (job.status !== 'awaiting_upload' && job.status !== 'created') {
    throw new TranslationJobError('invalid_job_state', 409);
  }

  if (job.expiresAt && job.expiresAt <= now) {
    await dbClient.translationJob.update({
      where: { id: job.id },
      data: {
        errorCode: 'upload_expired',
        errorMessage: 'The upload window has expired for this job.',
        failedAt: now,
        status: 'expired',
      },
    });

    throw new TranslationJobError('upload_expired', 410);
  }

  const pageAsset = job.assets.find(
    (asset) =>
      asset.kind === 'page_upload' && asset.pageNumber === input.pageNumber
  );

  if (!pageAsset?.originalFileName) {
    throw new TranslationJobError('invalid_upload', 404);
  }

  const contentType = deps.contentType?.trim() || pageAsset.mimeType || '';

  if (!/^image\/[a-z0-9.+-]+$/i.test(contentType)) {
    throw new TranslationJobError('invalid_upload', 400);
  }

  const checksumSha256 = createHash('sha256').update(deps.body).digest('hex');

  if (
    pageAsset.checksumSha256 &&
    pageAsset.checksumSha256.toLowerCase() !== checksumSha256
  ) {
    throw new TranslationJobError('checksum_mismatch', 409);
  }

  const putObjectStartedAt = Date.now();
  let upload;

  try {
    upload = await putTranslationJobPageUpload({
      body: deps.body,
      contentType,
      fileName: pageAsset.originalFileName,
      jobId: job.id,
      pageNumber: input.pageNumber,
    });
  } catch (error) {
    log.error({
      contentLengthHeader: deps.contentLength,
      contentType,
      err: error,
      jobId: job.id,
      message: 'Failed to store mobile job page upload',
      objectStorageDurationMs: Date.now() - putObjectStartedAt,
      pageNumber: input.pageNumber,
      sizeBytes: deps.body.byteLength,
      totalDurationMs: Date.now() - startedAt,
      type: 'mutation',
    });

    throw error;
  }

  log.info({
    bucketName: upload.bucketName,
    contentLengthHeader: deps.contentLength,
    contentType,
    jobId: job.id,
    message: 'Stored mobile job page upload',
    objectKey: upload.objectKey,
    objectStorageDurationMs: Date.now() - putObjectStartedAt,
    pageNumber: input.pageNumber,
    sizeBytes: deps.body.byteLength,
    totalDurationMs: Date.now() - startedAt,
    type: 'mutation',
  });

  const updatedJob = await dbClient.$transaction(async (tx) => {
    await tx.jobAsset.update({
      where: {
        id: pageAsset.id,
      },
      data: {
        bucketName: upload.bucketName,
        checksumSha256,
        metadata: mergeAssetMetadata(pageAsset.metadata, {
          uploadedAt: now.toISOString(),
          uploadStatus: 'uploaded',
        }) as Prisma.InputJsonValue,
        mimeType: contentType,
        objectKey: upload.objectKey,
        sizeBytes: deps.body.byteLength,
      },
    });

    return await tx.translationJob.findUniqueOrThrow({
      where: {
        id: job.id,
      },
      select: translationJobSelect,
    });
  });

  return zTranslationJobSummary.parse(buildTranslationJobSummary(updatedJob));
}

export async function completeTranslationJobUpload(
  rawInput: unknown,
  deps: {
    actor: MobileJobActor;
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'error' | 'info'>;
    now?: Date;
    scheduleProcessing?: (jobId: string) => void;
  }
) {
  const input = zTranslationJobControlInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();
  const job = await getAuthorizedJob(input.jobId, deps.actor, {
    dbClient,
  });

  if (
    job.status === 'queued' ||
    job.status === 'processing' ||
    job.status === 'completed'
  ) {
    return zTranslationJobSummary.parse(buildTranslationJobSummary(job));
  }

  const isFailedJobRetry = job.status === 'failed';

  if (
    job.status !== 'awaiting_upload' &&
    job.status !== 'created' &&
    !isFailedJobRetry
  ) {
    throw new TranslationJobError('invalid_job_state', 409);
  }

  if (!isFailedJobRetry && job.expiresAt && job.expiresAt <= now) {
    await dbClient.translationJob.update({
      where: { id: job.id },
      data: {
        errorCode: 'upload_expired',
        errorMessage: 'The upload window has expired for this job.',
        failedAt: now,
        status: 'expired',
      },
    });

    throw new TranslationJobError('upload_expired', 410);
  }

  const uploadAssets = job.assets
    .filter((asset) => asset.kind === 'page_upload')
    .sort((left, right) => (left.pageNumber ?? 0) - (right.pageNumber ?? 0));

  if (
    uploadAssets.length !== job.pageCount ||
    uploadAssets.some((asset) => !asset.objectKey || !asset.bucketName)
  ) {
    throw new TranslationJobError('invalid_upload', 409);
  }

  const reservedTokens = calculateReservedTokens(job.pageCount);
  const availableTokens = await getAvailableLicenseTokenBalance(
    {
      licenseId: job.licenseId,
    },
    {
      dbClient,
    }
  );

  if (availableTokens < reservedTokens) {
    throw new TranslationJobError('insufficient_tokens', 409, {
      details: {
        availableTokens,
        requiredTokens: reservedTokens,
      },
    });
  }

  const cacheKey = buildTranslationResultCacheKey({
    job,
    uploadAssets,
  });
  const cached = await getCachedTranslationResultManifest({
    cacheKey,
    dbClient,
    job,
    log,
    now,
    uploadAssets,
  });
  const cachedManifest = cached?.manifest ?? null;
  const cacheHitKey = cached?.cacheKey ?? cacheKey;

  if (cacheHitKey && cachedManifest) {
    const completedJob = await completeTranslationJobFromCachedManifest({
      cacheKey: cacheHitKey,
      dbClient,
      job,
      manifest: cachedManifest,
      now,
      spentTokens: reservedTokens,
    });

    log.info({
      cacheKey: cacheHitKey,
      jobId: job.id,
      pageCount: job.pageCount,
      scope: 'jobs',
      status: 'completed_from_cache',
    });

    await cleanupCompletedJobPageUploads({
      dbClient,
      jobId: job.id,
      log,
      now,
      uploadAssets,
    });

    return zTranslationJobSummary.parse(
      buildTranslationJobSummary(completedJob)
    );
  }

  const queuedJob = await dbClient.$transaction(async (tx) => {
    await tx.translationJob.update({
      where: { id: job.id },
      data: {
        errorCode: null,
        errorMessage: null,
        failedAt: null,
        queuedAt: now,
        startedAt: null,
        status: 'queued',
        uploadCompletedAt: job.uploadCompletedAt ?? now,
      },
    });

    return await tx.translationJob.findUniqueOrThrow({
      where: { id: job.id },
      select: translationJobSelect,
    });
  });

  const scheduleProcessing =
    deps.scheduleProcessing ??
    ((jobId: string) => {
      if (envServer.JOB_RUNTIME_MODE !== 'inline') {
        return;
      }

      void processTranslationJob(
        { jobId },
        {
          dbClient,
          log,
        }
      ).catch((error) => {
        log.error({
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          jobId,
          scope: 'jobs',
        });
      });
    });

  scheduleProcessing(job.id);

  return zTranslationJobSummary.parse(buildTranslationJobSummary(queuedJob));
}

export async function getTranslationJobSummary(
  rawInput: unknown,
  deps: {
    actor: MobileJobActor;
    dbClient?: typeof db;
    now?: Date;
  }
) {
  const input = zTranslationJobControlInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const now = deps.now ?? new Date();
  let job = await getAuthorizedJob(input.jobId, deps.actor, { dbClient });

  if (isStaleJob(job, now)) {
    const failedAt = now;
    await dbClient.translationJob.update({
      where: { id: job.id },
      data: {
        errorCode: 'processing_failed',
        errorMessage:
          'The translation job did not complete within the allowed time.',
        failedAt,
        status: 'failed',
      },
    });

    await dbClient.tokenLedger.updateMany({
      where: {
        idempotencyKey: `job-reserve:${job.id}`,
        status: 'pending',
      },
      data: { status: 'voided' },
    });

    job = await getAuthorizedJob(input.jobId, deps.actor, { dbClient });
  }

  return zTranslationJobSummary.parse(buildTranslationJobSummary(job));
}

const STALE_JOB_TIMEOUT_MS = 15 * 60 * 1_000; // 15 minutes

function isStaleJob(job: JobRecord, now: Date): boolean {
  if (job.status !== 'processing' && job.status !== 'queued') {
    return false;
  }

  const referenceTime =
    job.status === 'processing' ? job.startedAt : job.queuedAt;

  if (!referenceTime) {
    return false;
  }

  return now.getTime() - referenceTime.getTime() > STALE_JOB_TIMEOUT_MS;
}

export async function getTranslationJobResult(
  rawInput: unknown,
  deps: {
    actor: MobileJobActor;
    dbClient?: typeof db;
  }
) {
  const input = zTranslationJobControlInput.parse(rawInput);
  const job = await getAuthorizedJob(input.jobId, deps.actor, {
    dbClient: deps.dbClient,
  });

  if (job.status !== 'completed') {
    throw new TranslationJobError('result_not_ready', 409);
  }

  const resultAsset = job.assets.find(
    (asset) => asset.kind === 'result_manifest'
  );

  if (!resultAsset?.bucketName || !resultAsset.objectKey) {
    throw new TranslationJobError('result_not_ready', 404);
  }

  const manifest = await getTranslationJobResultManifest({
    bucketName: resultAsset.bucketName,
    objectKey: resultAsset.objectKey,
  });

  return zTranslationJobResultManifest.parse(manifest);
}

export async function processTranslationJob(
  rawInput: unknown,
  deps: {
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'error' | 'info'>;
    now?: Date;
  } = {}
) {
  const input = zTranslationJobControlInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();

  const startedJob = await dbClient.$transaction(async (tx) => {
    const updated = await tx.translationJob.updateMany({
      where: {
        id: input.jobId,
        status: 'queued',
      },
      data: {
        startedAt: now,
        status: 'processing',
      },
    });

    if (updated.count === 0) {
      return null;
    }

    return await tx.translationJob.findUnique({
      where: { id: input.jobId },
      select: translationJobSelect,
    });
  });

  if (!startedJob) {
    return null;
  }

  const uploadAssets = startedJob.assets
    .filter((asset) => asset.kind === 'page_upload')
    .sort((left, right) => (left.pageNumber ?? 0) - (right.pageNumber ?? 0));

  try {
    const uploadedOcrPages: UploadedOcrPage[] = [];

    for (const asset of uploadAssets) {
      if (!asset.bucketName || !asset.objectKey || !asset.originalFileName) {
        throw new TranslationJobError('invalid_upload', 409);
      }

      const uploadedPage = await getTranslationJobPageUpload({
        bucketName: asset.bucketName,
        objectKey: asset.objectKey,
      });
      const imageBytes = new Uint8Array(await uploadedPage.blob.arrayBuffer());
      uploadedOcrPages.push({
        fileName: asset.originalFileName,
        imageBytes,
      });
    }

    const ocrPages = await performHostedOcrForUploadedPages({
      jobId: startedJob.id,
      pages: uploadedOcrPages,
    });
    const detectedLanguages = ocrPages.map(
      (page) => page.ocrPage.sourceLanguage
    );

    const sourceLanguage = resolveEffectiveSourceLanguage(
      startedJob.sourceLanguage,
      detectedLanguages
    );
    const layoutPages = ocrPages.map((page) => ({
      ...page,
      ocrPage: coalesceOcrLineBlocks(page.ocrPage),
    }));

    const translationProvider = toGatewayTranslationProvider(
      startedJob.resolvedTranslationProvider
    );
    const translatablePages = layoutPages
      .filter((page) => page.ocrPage.blocks.length > 0)
      .map((page) => ({
        blocks: page.ocrPage.blocks.map((block) => ({ text: block.text })),
        pageKey: page.fileName,
      }));
    const translationBatch =
      translatablePages.length > 0
        ? await performHostedTranslation({
            jobId: startedJob.id,
            pages: translatablePages,
            preferredProvider: translationProvider,
            sourceLanguage,
            targetLanguage: startedJob.targetLanguage,
          })
        : null;

    const translationsByPage = new Map(
      translationBatch?.pages.map((page) => [page.pageKey, page]) ?? []
    );
    const pages: Record<string, HostedPageTranslation> = {};

    for (const page of layoutPages) {
      const translationPage =
        translationsByPage.get(page.fileName) ??
        (page.ocrPage.blocks.length === 0
          ? {
              blocks: [],
              pageKey: page.fileName,
            }
          : null);

      if (!translationPage) {
        throw new Error(`Missing translation page for ${page.fileName}`);
      }

      pages[page.fileName] = mergeHostedPageTranslation({
        ocrPage: page.ocrPage,
        targetLanguage: startedJob.targetLanguage,
        translationPage,
        translatorType:
          translationBatch?.provider ?? translationProvider ?? 'openai',
      });
    }

    const completedAt = new Date();
    const manifest = zTranslationJobResultManifest.parse({
      completedAt,
      deviceId: startedJob.deviceId,
      jobId: startedJob.id,
      licenseId: startedJob.licenseId,
      pageCount: startedJob.pageCount,
      pageOrder: layoutPages.map((page) => page.fileName),
      pages,
      sourceLanguage,
      targetLanguage: startedJob.targetLanguage,
      translatorType:
        translationBatch?.provider ?? translationProvider ?? 'openai',
      version: JOB_RESULT_VERSION,
    });
    const manifestJson = JSON.stringify(manifest);
    const storedResult = await putTranslationJobResultManifest(manifest);
    const spentTokens = calculateReservedTokens(startedJob.pageCount);
    const cacheKey = buildTranslationResultCacheKey({
      job: startedJob,
      uploadAssets,
      sourceLanguage,
    });

    await dbClient.$transaction(async (tx) => {
      await tx.tokenLedger.updateMany({
        where: {
          idempotencyKey: `job-reserve:${startedJob.id}`,
          status: 'pending',
        },
        data: {
          status: 'voided',
        },
      });

      await tx.tokenLedger.create({
        data: {
          deltaTokens: -spentTokens,
          description: `Spent tokens for completed job ${startedJob.id}`,
          deviceId: startedJob.deviceId,
          idempotencyKey: `job-spend:${startedJob.id}`,
          jobId: startedJob.id,
          licenseId: startedJob.licenseId,
          metadata: {
            completedAt: completedAt.toISOString(),
            pageCount: startedJob.pageCount,
            translatorType:
              translationBatch?.provider ?? translationProvider ?? 'openai',
          },
          status: 'posted',
          type: 'job_spend',
        },
      });

      const existingResultAsset = await tx.jobAsset.findFirst({
        where: {
          jobId: startedJob.id,
          kind: 'result_manifest',
        },
        select: {
          id: true,
        },
      });

      if (existingResultAsset) {
        await tx.jobAsset.update({
          where: {
            id: existingResultAsset.id,
          },
          data: {
            bucketName: storedResult.bucketName,
            metadata: {
              pageCount: startedJob.pageCount,
              version: JOB_RESULT_VERSION,
            },
            mimeType: 'application/json',
            objectKey: storedResult.objectKey,
            sizeBytes: Buffer.byteLength(manifestJson),
          },
        });
      } else {
        await tx.jobAsset.create({
          data: {
            bucketName: storedResult.bucketName,
            jobId: startedJob.id,
            kind: 'result_manifest',
            metadata: {
              pageCount: startedJob.pageCount,
              version: JOB_RESULT_VERSION,
            },
            mimeType: 'application/json',
            objectKey: storedResult.objectKey,
            sizeBytes: Buffer.byteLength(manifestJson),
          },
        });
      }

      await tx.translationJob.update({
        where: {
          id: startedJob.id,
        },
        data: {
          completedAt,
          errorCode: null,
          errorMessage: null,
          expiresAt: new Date(
            completedAt.getTime() +
              envServer.JOB_RESULT_RETENTION_HOURS * 60 * 60 * 1000
          ),
          resultPayloadVersion: JOB_RESULT_VERSION,
          sourceLanguage,
          spentTokens,
          status: 'completed',
          uploadCompletedAt: startedJob.uploadCompletedAt ?? completedAt,
        },
      });
    });

    if (cacheKey) {
      try {
        await storeTranslationResultCache({
          cacheKey,
          dbClient,
          job: startedJob,
          manifest,
          providerSignature: buildTranslationCacheProviderSignature(startedJob),
        });
      } catch (cacheError) {
        log.error({
          cacheKey,
          err: cacheError,
          jobId: startedJob.id,
          message: 'Failed to store translation result cache',
          scope: 'jobs',
        });
      }
    }

    await cleanupCompletedJobPageUploads({
      dbClient,
      jobId: startedJob.id,
      log,
      now: completedAt,
      uploadAssets,
    });

    log.info({
      jobId: startedJob.id,
      pageCount: startedJob.pageCount,
      scope: 'jobs',
      status: 'completed',
    });

    return manifest;
  } catch (error) {
    const failedAt = new Date();
    const errorCode =
      error instanceof TranslationJobError ? error.code : 'processing_failed';
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown processing failure';

    await dbClient.$transaction(async (tx) => {
      await tx.tokenLedger.updateMany({
        where: {
          idempotencyKey: `job-reserve:${startedJob.id}`,
          status: 'pending',
        },
        data: {
          status: 'voided',
        },
      });

      await tx.translationJob.update({
        where: {
          id: startedJob.id,
        },
        data: {
          errorCode,
          errorMessage,
          failedAt,
          status: 'failed',
        },
      });
    });

    log.error({
      errorCode,
      errorMessage,
      jobId: startedJob.id,
      scope: 'jobs',
    });

    throw error;
  }
}

const translationJobSelect = {
  assets: {
    orderBy: {
      pageNumber: 'asc',
    },
    select: {
      bucketName: true,
      checksumSha256: true,
      createdAt: true,
      id: true,
      kind: true,
      metadata: true,
      mimeType: true,
      objectKey: true,
      originalFileName: true,
      pageNumber: true,
      sizeBytes: true,
    },
  },
  chapterCacheKey: true,
  chapterIdentity: true,
  completedAt: true,
  createdAt: true,
  deviceId: true,
  errorCode: true,
  errorMessage: true,
  expiresAt: true,
  failedAt: true,
  id: true,
  licenseId: true,
  pageCount: true,
  queuedAt: true,
  reservedTokens: true,
  resolvedOcrProvider: true,
  resolvedTranslationProvider: true,
  sourceLanguage: true,
  spentTokens: true,
  startedAt: true,
  status: true,
  targetLanguage: true,
  uploadCompletedAt: true,
} as const;

async function getAuthorizedJob(
  jobId: string,
  actor: MobileJobActor,
  deps: {
    dbClient?: typeof db;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const job = await dbClient.translationJob.findUnique({
    where: {
      id: jobId,
    },
    select: translationJobSelect,
  });

  if (
    !job ||
    job.deviceId !== actor.deviceId ||
    job.licenseId !== actor.licenseId
  ) {
    throw new TranslationJobError('invalid_job', 404);
  }

  return job;
}

function buildTranslationJobSummary(job: JobRecord) {
  const pages = job.assets
    .filter((asset) => asset.kind === 'page_upload')
    .filter(
      (
        asset
      ): asset is JobAssetRecord & {
        originalFileName: string;
        pageNumber: number;
      } => Boolean(asset.originalFileName) && Boolean(asset.pageNumber)
    )
    .map((asset) => ({
      checksumSha256: asset.checksumSha256,
      fileName: asset.originalFileName,
      mimeType: asset.mimeType,
      pageNumber: asset.pageNumber,
      sizeBytes: asset.sizeBytes,
      uploadedAt: getUploadedAt(asset.metadata),
      uploadedBytes: asset.objectKey ? asset.sizeBytes : null,
      uploadPath: `/api/mobile/jobs/${job.id}/pages/${asset.pageNumber}`,
      uploadStatus: asset.objectKey
        ? ('uploaded' as const)
        : ('pending' as const),
    }));
  const uploadedPageCount = pages.filter(
    (page) => page.uploadStatus === 'uploaded'
  ).length;
  const resultPath =
    job.status === 'completed' ? `/api/mobile/jobs/${job.id}/result` : null;

  return {
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    failedAt: job.failedAt,
    id: job.id,
    pageCount: job.pageCount,
    pages,
    progressPercent: calculateJobProgress(job.status, {
      pageCount: job.pageCount,
      uploadedPageCount,
    }),
    queuedAt: job.queuedAt,
    reservedTokens: job.reservedTokens,
    resultPath,
    sourceLanguage: job.sourceLanguage,
    spentTokens: job.spentTokens,
    startedAt: job.startedAt,
    status: job.status,
    targetLanguage: job.targetLanguage,
    uploadCompletedAt: job.uploadCompletedAt,
    uploadedPageCount,
  };
}

function calculateJobProgress(
  status: JobRecord['status'],
  input: {
    pageCount: number;
    uploadedPageCount: number;
  }
) {
  switch (status) {
    case 'created':
      return 0;
    case 'awaiting_upload':
      return input.pageCount > 0
        ? Math.min(
            40,
            Math.floor((input.uploadedPageCount / input.pageCount) * 40)
          )
        : 0;
    case 'queued':
      return 45;
    case 'processing':
      return 80;
    case 'completed':
      return 100;
    case 'failed':
    case 'canceled':
    case 'expired':
      return input.uploadedPageCount > 0 ? 40 : 0;
  }
}

async function resolveProviderSelection(
  input: {
    ocrProvider?: 'google_cloud_vision';
    translationProvider?: 'anthropic' | 'gemini' | 'openai';
  },
  deps?: {
    dbClient?: typeof db;
  }
) {
  const manifest = await getProviderGatewayManifestWithRuntimeConfig({
    dbClient: deps?.dbClient,
  });
  const requestedOcrProvider =
    input.ocrProvider === 'google_cloud_vision'
      ? ProviderType.google_cloud_vision
      : null;
  const requestedTranslationProvider = input.translationProvider
    ? toPrismaTranslationProvider(input.translationProvider)
    : null;
  const resolvedOcrProvider =
    requestedOcrProvider ??
    (manifest.ocr.defaultProvider === ProviderType.google_cloud_vision
      ? manifest.ocr.defaultProvider
      : null);
  const resolvedTranslationProvider =
    requestedTranslationProvider ??
    (manifest.translation.defaultProvider
      ? toPrismaTranslationProvider(manifest.translation.defaultProvider)
      : null);

  if (!resolvedOcrProvider) {
    throw new TranslationJobError('invalid_provider', 503);
  }

  if (
    requestedTranslationProvider &&
    !manifest.translation.providers.some(
      (provider) =>
        provider.provider === requestedTranslationProvider &&
        provider.enabled &&
        provider.supportedByGateway
    )
  ) {
    throw new TranslationJobError('invalid_provider', 409);
  }

  if (!resolvedTranslationProvider) {
    throw new TranslationJobError('invalid_provider', 503);
  }

  return {
    requestedOcrProvider,
    requestedTranslationProvider,
    resolvedOcrProvider,
    resolvedTranslationProvider,
  };
}

function mergeAssetMetadata(
  current: unknown,
  next: Record<string, unknown>
): Prisma.InputJsonValue {
  return {
    ...(current && typeof current === 'object' ? current : {}),
    ...next,
  } as Prisma.InputJsonValue;
}

async function cleanupCompletedJobPageUploads(input: {
  dbClient: typeof db;
  jobId: string;
  log: Pick<typeof logger, 'error' | 'info'>;
  now: Date;
  uploadAssets: JobAssetRecord[];
}) {
  const uploadedAssets = input.uploadAssets.filter(
    (
      asset
    ): asset is JobAssetRecord & {
      bucketName: string;
      objectKey: string;
    } =>
      asset.kind === 'page_upload' &&
      Boolean(asset.bucketName && asset.objectKey)
  );

  if (uploadedAssets.length === 0) {
    return;
  }

  try {
    await deleteTranslationJobPageUploads({
      objects: uploadedAssets.map((asset) => ({
        bucketName: asset.bucketName,
        objectKey: asset.objectKey,
      })),
    });

    await Promise.all(
      uploadedAssets.map((asset) =>
        input.dbClient.jobAsset.update({
          where: {
            id: asset.id,
          },
          data: {
            metadata: mergeAssetMetadata(asset.metadata, {
              deletedAt: input.now.toISOString(),
              storageStatus: 'deleted',
            }),
          },
        })
      )
    );

    input.log.info({
      deletedPageCount: uploadedAssets.length,
      jobId: input.jobId,
      message: 'Deleted completed job page uploads',
      scope: 'jobs',
    });
  } catch (error) {
    input.log.error({
      err: error,
      jobId: input.jobId,
      message: 'Failed to delete completed job page uploads',
      scope: 'jobs',
    });
  }
}

function getUploadedAt(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const uploadedAt = (metadata as { uploadedAt?: unknown }).uploadedAt;

  return typeof uploadedAt === 'string' ? new Date(uploadedAt) : null;
}

function calculateReservedTokens(_pageCount: number) {
  return envServer.JOB_TOKENS_PER_CHAPTER;
}

function buildTranslationCacheProviderSignature(job: JobRecord) {
  return JSON.stringify({
    ocrProvider: job.resolvedOcrProvider,
    promptVersion: envServer.TRANSLATION_PROMPT_VERSION ?? null,
    resultVersion: JOB_RESULT_VERSION,
    translationProvider: job.resolvedTranslationProvider,
  });
}

function normalizeChapterIdentity(rawIdentity: unknown) {
  const identity = zTranslationChapterIdentity.safeParse(rawIdentity);

  if (!identity.success) {
    return null;
  }

  return {
    chapterName: identity.data.chapterName?.trim() || null,
    chapterUrl: identity.data.chapterUrl.trim(),
    mangaTitle: identity.data.mangaTitle?.trim() || null,
    mangaUrl: identity.data.mangaUrl?.trim() || null,
    sourceId: identity.data.sourceId?.trim() || null,
    sourceName: identity.data.sourceName?.trim() || null,
  };
}

function buildChapterCacheKey(rawIdentity: unknown) {
  const identity = normalizeChapterIdentity(rawIdentity);

  if (!identity) {
    return null;
  }

  return createHash('sha256')
    .update(
      JSON.stringify({
        algorithm: '2026-04-24.chapter-url.v1',
        chapterUrl: identity.chapterUrl,
        sourceId: identity.sourceId,
        sourceName: identity.sourceName,
      })
    )
    .digest('hex');
}

function buildTranslationResultCacheKey(input: {
  job: JobRecord;
  sourceLanguage?: string;
  uploadAssets: JobAssetRecord[];
}) {
  const pageFingerprints = input.uploadAssets
    .map((asset) => {
      if (!asset.checksumSha256 || !asset.pageNumber) {
        return null;
      }

      return {
        checksumSha256: asset.checksumSha256.toLowerCase(),
        pageNumber: asset.pageNumber,
      };
    })
    .filter((page): page is NonNullable<typeof page> => Boolean(page));

  if (pageFingerprints.length !== input.job.pageCount) {
    return null;
  }

  return createHash('sha256')
    .update(
      JSON.stringify({
        algorithm: '2026-04-24.v1',
        pageCount: input.job.pageCount,
        pages: pageFingerprints,
        providerSignature: buildTranslationCacheProviderSignature(input.job),
        sourceLanguage: input.sourceLanguage ?? input.job.sourceLanguage,
        targetLanguage: input.job.targetLanguage,
      })
    )
    .digest('hex');
}

async function getCachedTranslationResultManifest(input: {
  cacheKey: string | null;
  dbClient: typeof db;
  job: JobRecord;
  log: Pick<typeof logger, 'error' | 'info'>;
  now: Date;
  uploadAssets: JobAssetRecord[];
}) {
  const cachedResult = input.job.chapterCacheKey
    ? await input.dbClient.translationResultCache.findFirst({
        where: {
          chapterCacheKey: input.job.chapterCacheKey,
          providerSignature: buildTranslationCacheProviderSignature(input.job),
          targetLanguage: input.job.targetLanguage,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    : input.cacheKey
      ? await input.dbClient.translationResultCache.findUnique({
          where: {
            cacheKey: input.cacheKey,
          },
        })
      : null;

  if (!cachedResult) {
    return null;
  }

  try {
    const cachedManifest =
      cachedResult.resultManifest == null
        ? await getTranslationJobResultManifest({
            bucketName: cachedResult.bucketName,
            objectKey: cachedResult.objectKey,
          })
        : parseCachedResultManifest(cachedResult.resultManifest);

    const manifest = rebindCachedManifestToJob({
      job: input.job,
      manifest: cachedManifest,
      now: input.now,
      uploadAssets: input.uploadAssets,
    });

    return manifest
      ? {
          cacheKey: cachedResult.cacheKey,
          manifest,
        }
      : null;
  } catch (error) {
    input.log.error({
      cacheKey: cachedResult.cacheKey,
      err: error,
      jobId: input.job.id,
      message: 'Failed to read translation result cache',
      scope: 'jobs',
    });

    return null;
  }
}

function rebindCachedManifestToJob(input: {
  job: JobRecord;
  manifest: TranslationJobResultManifest;
  now: Date;
  uploadAssets: JobAssetRecord[];
}) {
  if (
    input.manifest.targetLanguage !== input.job.targetLanguage ||
    input.uploadAssets.length !== input.job.pageCount
  ) {
    return null;
  }

  const pages: Record<string, HostedPageTranslation> = {};
  const pageOrder: string[] = [];
  const cachedPagesByFileName = new Map(
    input.manifest.pageOrder
      .map((pageKey) => [pageKey, input.manifest.pages[pageKey]] as const)
      .filter((entry): entry is [string, HostedPageTranslation] =>
        Boolean(entry[1])
      )
  );

  for (const [index, asset] of input.uploadAssets.entries()) {
    const cachedPage =
      (asset.originalFileName
        ? cachedPagesByFileName.get(asset.originalFileName)
        : null) ?? input.manifest.pages[input.manifest.pageOrder[index] ?? ''];

    if (!asset.originalFileName || !cachedPage) {
      return null;
    }

    pageOrder.push(asset.originalFileName);
    pages[asset.originalFileName] = cachedPage;
  }

  return zTranslationJobResultManifest.parse({
    ...input.manifest,
    completedAt: input.now,
    deviceId: input.job.deviceId,
    jobId: input.job.id,
    licenseId: input.job.licenseId,
    pageCount: input.job.pageCount,
    pageOrder,
    pages,
  });
}

async function completeTranslationJobFromCachedManifest(input: {
  cacheKey: string;
  dbClient: typeof db;
  job: JobRecord;
  manifest: TranslationJobResultManifest;
  now: Date;
  spentTokens: number;
}) {
  const manifestJson = JSON.stringify(input.manifest);
  const storedResult = await putTranslationJobResultManifest(input.manifest);

  return await input.dbClient.$transaction(async (tx) => {
    await tx.tokenLedger.create({
      data: {
        deltaTokens: -input.spentTokens,
        description: `Spent tokens for cached job ${input.job.id}`,
        deviceId: input.job.deviceId,
        idempotencyKey: `job-spend:${input.job.id}`,
        jobId: input.job.id,
        licenseId: input.job.licenseId,
        metadata: {
          cacheHit: true,
          cacheKey: input.cacheKey,
          completedAt: input.now.toISOString(),
          pageCount: input.job.pageCount,
          translatorType: input.manifest.translatorType,
        },
        status: 'posted',
        type: 'job_spend',
      },
    });

    const existingResultAsset = await tx.jobAsset.findFirst({
      where: {
        jobId: input.job.id,
        kind: 'result_manifest',
      },
      select: {
        id: true,
      },
    });

    const resultAssetData = {
      bucketName: storedResult.bucketName,
      metadata: {
        cacheHit: true,
        cacheKey: input.cacheKey,
        pageCount: input.job.pageCount,
        version: JOB_RESULT_VERSION,
      },
      mimeType: 'application/json',
      objectKey: storedResult.objectKey,
      sizeBytes: Buffer.byteLength(manifestJson),
    };

    if (existingResultAsset) {
      await tx.jobAsset.update({
        where: {
          id: existingResultAsset.id,
        },
        data: resultAssetData,
      });
    } else {
      await tx.jobAsset.create({
        data: {
          ...resultAssetData,
          jobId: input.job.id,
          kind: 'result_manifest',
        },
      });
    }

    await tx.translationResultCache.update({
      where: {
        cacheKey: input.cacheKey,
      },
      data: {
        hitCount: {
          increment: 1,
        },
        lastHitAt: input.now,
      },
    });

    await tx.translationJob.update({
      where: {
        id: input.job.id,
      },
      data: {
        completedAt: input.now,
        errorCode: null,
        errorMessage: null,
        expiresAt: new Date(
          input.now.getTime() +
            envServer.JOB_RESULT_RETENTION_HOURS * 60 * 60 * 1000
        ),
        resultPayloadVersion: JOB_RESULT_VERSION,
        resultSummary: {
          cacheHit: true,
          cacheKey: input.cacheKey,
          pageCount: input.job.pageCount,
        },
        sourceLanguage: input.manifest.sourceLanguage,
        spentTokens: input.spentTokens,
        status: 'completed',
        uploadCompletedAt: input.job.uploadCompletedAt ?? input.now,
      },
    });

    return await tx.translationJob.findUniqueOrThrow({
      where: {
        id: input.job.id,
      },
      select: translationJobSelect,
    });
  });
}

async function storeTranslationResultCache(input: {
  cacheKey: string;
  dbClient: typeof db;
  job: JobRecord;
  manifest: TranslationJobResultManifest;
  providerSignature: string;
}) {
  const storedCacheResult = await putTranslationResultCacheManifest({
    cacheKey: input.cacheKey,
    manifest: input.manifest,
  });
  const manifestJson = JSON.stringify(input.manifest);
  const manifestValue = JSON.parse(manifestJson) as Prisma.InputJsonValue;

  await input.dbClient.translationResultCache.upsert({
    where: {
      cacheKey: input.cacheKey,
    },
    create: {
      bucketName: storedCacheResult.bucketName,
      cacheKey: input.cacheKey,
      chapterCacheKey: input.job.chapterCacheKey,
      chapterIdentity: normalizeChapterIdentity(input.job.chapterIdentity) as
        | Prisma.InputJsonValue
        | undefined,
      objectKey: storedCacheResult.objectKey,
      pageCount: input.manifest.pageCount,
      providerSignature: input.providerSignature,
      resultManifest: manifestValue,
      resultPayloadVersion: input.manifest.version,
      sizeBytes: Buffer.byteLength(manifestJson),
      sourceLanguage: input.manifest.sourceLanguage,
      targetLanguage: input.manifest.targetLanguage,
    },
    update: {
      bucketName: storedCacheResult.bucketName,
      chapterCacheKey: input.job.chapterCacheKey,
      chapterIdentity: normalizeChapterIdentity(input.job.chapterIdentity) as
        | Prisma.InputJsonValue
        | undefined,
      objectKey: storedCacheResult.objectKey,
      pageCount: input.manifest.pageCount,
      providerSignature: input.providerSignature,
      resultManifest: manifestValue,
      resultPayloadVersion: input.manifest.version,
      sizeBytes: Buffer.byteLength(manifestJson),
      sourceLanguage: input.manifest.sourceLanguage,
      targetLanguage: input.manifest.targetLanguage,
    },
  });
}

function parseCachedResultManifest(rawManifest: unknown) {
  const record =
    rawManifest &&
    typeof rawManifest === 'object' &&
    !Array.isArray(rawManifest)
      ? (rawManifest as Record<string, unknown>)
      : null;

  return zTranslationJobResultManifest.parse({
    ...record,
    completedAt:
      typeof record?.completedAt === 'string'
        ? new Date(record.completedAt)
        : record?.completedAt,
  });
}

async function performHostedOcrForUploadedPages(input: {
  jobId: string;
  pages: UploadedOcrPage[];
}): Promise<
  Array<{
    fileName: string;
    ocrPage: Awaited<ReturnType<typeof performHostedOcr>>;
  }>
> {
  const dimensionedPages: UploadedOcrPageWithDimensions[] = [];
  const fallbackPages: UploadedOcrPage[] = [];

  for (const page of input.pages) {
    const dimensions = await getUploadedPageImageDimensions(page.imageBytes);
    if (!dimensions) {
      fallbackPages.push(page);
      continue;
    }

    dimensionedPages.push({
      ...page,
      imageHeight: dimensions.height,
      imageWidth: dimensions.width,
    });
  }

  const ocrPages: Array<{
    fileName: string;
    ocrPage: Awaited<ReturnType<typeof performHostedOcr>>;
  }> = [];

  for (const batch of await buildHostedOcrBatches(dimensionedPages)) {
    const batchOcrPage = await performHostedOcr({
      imageBytes: batch.imageBytes,
      imageHeight: batch.height,
      imageWidth: batch.width,
      jobId: input.jobId,
      pageCount: batch.placements.length,
    });
    ocrPages.push(...mapBatchOcrPageToOriginalPages(batch, batchOcrPage));
  }

  for (const page of fallbackPages) {
    ocrPages.push({
      fileName: page.fileName,
      ocrPage: await performHostedOcr({
        imageBytes: page.imageBytes,
        jobId: input.jobId,
      }),
    });
  }

  const byFileName = new Map(ocrPages.map((page) => [page.fileName, page]));

  return input.pages.map((page) => {
    const ocrPage = byFileName.get(page.fileName);
    if (!ocrPage) {
      throw new Error(`Missing OCR page for ${page.fileName}`);
    }
    return ocrPage;
  });
}

async function getUploadedPageImageDimensions(imageBytes: Uint8Array) {
  try {
    const sharp = await loadSharp();
    const metadata = await sharp(imageBytes).metadata();
    if (!metadata.width || !metadata.height) {
      return null;
    }

    return {
      height: metadata.height,
      width: metadata.width,
    };
  } catch {
    return null;
  }
}

async function loadSharp() {
  return (await import('sharp')).default;
}

async function buildHostedOcrBatches(
  pages: UploadedOcrPageWithDimensions[]
): Promise<OcrBatch[]> {
  const batches: UploadedOcrPageWithDimensions[][] = [];
  let currentBatch: UploadedOcrPageWithDimensions[] = [];

  for (const page of pages) {
    const candidate = [...currentBatch, page];
    if (currentBatch.length > 0 && !canFitHostedOcrBatch(candidate)) {
      batches.push(currentBatch);
      currentBatch = [page];
      continue;
    }

    currentBatch = candidate;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  const encodedBatches: OcrBatch[] = [];
  for (const batch of batches) {
    encodedBatches.push(...(await encodeHostedOcrBatchSafely(batch)));
  }

  return encodedBatches;
}

function canFitHostedOcrBatch(pages: UploadedOcrPageWithDimensions[]) {
  const width = Math.max(...pages.map((page) => page.imageWidth));
  const height = pages.reduce((sum, page) => sum + page.imageHeight, 0);
  const pixels = width * height;

  return (
    height <= HOSTED_OCR_MAX_BATCH_HEIGHT &&
    pixels <= HOSTED_OCR_MAX_BATCH_PIXELS
  );
}

async function encodeHostedOcrBatchSafely(
  pages: UploadedOcrPageWithDimensions[]
): Promise<OcrBatch[]> {
  if (pages.length === 0) {
    return [];
  }

  const batch = await encodeHostedOcrBatch(pages);
  if (
    batch.imageBytes.byteLength <= HOSTED_OCR_MAX_INLINE_IMAGE_BYTES ||
    pages.length === 1
  ) {
    return [batch];
  }

  const splitAt = Math.ceil(pages.length / 2);
  return [
    ...(await encodeHostedOcrBatchSafely(pages.slice(0, splitAt))),
    ...(await encodeHostedOcrBatchSafely(pages.slice(splitAt))),
  ];
}

async function encodeHostedOcrBatch(
  pages: UploadedOcrPageWithDimensions[]
): Promise<OcrBatch> {
  const sharp = await loadSharp();
  const width = Math.max(...pages.map((page) => page.imageWidth));
  const height = pages.reduce((sum, page) => sum + page.imageHeight, 0);
  const placements: OcrBatchPlacement[] = [];
  let offsetY = 0;

  for (const page of pages) {
    placements.push({
      fileName: page.fileName,
      height: page.imageHeight,
      offsetX: Math.max(Math.floor((width - page.imageWidth) / 2), 0),
      offsetY,
      width: page.imageWidth,
    });
    offsetY += page.imageHeight;
  }

  const imageBytes = await sharp({
    create: {
      background: '#ffffff',
      channels: 3,
      height,
      width,
    },
  })
    .composite(
      pages.map((page, index) => ({
        input: Buffer.from(page.imageBytes),
        left: placements[index]?.offsetX ?? 0,
        top: placements[index]?.offsetY ?? 0,
      }))
    )
    .jpeg({
      mozjpeg: true,
      quality: HOSTED_OCR_JPEG_QUALITY,
    })
    .toBuffer();

  return {
    height,
    imageBytes,
    placements,
    width,
  };
}

function mapBatchOcrPageToOriginalPages(
  batch: OcrBatch,
  ocrPage: Awaited<ReturnType<typeof performHostedOcr>>
) {
  const pages = new Map<string, Awaited<ReturnType<typeof performHostedOcr>>>();

  for (const placement of batch.placements) {
    pages.set(placement.fileName, {
      ...ocrPage,
      blocks: [],
      imgHeight: placement.height,
      imgWidth: placement.width,
    });
  }

  for (const block of ocrPage.blocks) {
    const placement = findPlacementForOcrBlock(batch.placements, block);
    if (!placement) {
      continue;
    }

    const mappedBlock = mapOcrBlockToPlacement(block, placement);
    if (!mappedBlock) {
      continue;
    }

    pages.get(placement.fileName)?.blocks.push(mappedBlock);
  }

  return batch.placements.map((placement) => ({
    fileName: placement.fileName,
    ocrPage: pages.get(placement.fileName)!,
  }));
}

function findPlacementForOcrBlock(
  placements: OcrBatchPlacement[],
  block: NormalizedOcrPage['blocks'][number]
) {
  const centerY = block.y + block.height / 2;
  const containingPlacement = placements.find(
    (placement) =>
      centerY >= placement.offsetY &&
      centerY <= placement.offsetY + placement.height
  );

  if (containingPlacement) {
    return containingPlacement;
  }

  return placements
    .map((placement) => ({
      overlap: verticalOverlap(
        block.y,
        block.y + block.height,
        placement.offsetY,
        placement.offsetY + placement.height
      ),
      placement,
    }))
    .sort((left, right) => right.overlap - left.overlap)[0]?.placement;
}

function mapOcrBlockToPlacement(
  block: NormalizedOcrPage['blocks'][number],
  placement: OcrBatchPlacement
): NormalizedOcrPage['blocks'][number] | null {
  const localLeft = block.x - placement.offsetX;
  const localTop = block.y - placement.offsetY;
  const left = Math.max(localLeft, 0);
  const top = Math.max(localTop, 0);
  const right = Math.min(localLeft + block.width, placement.width);
  const bottom = Math.min(localTop + block.height, placement.height);
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    ...block,
    height,
    width,
    x: left,
    y: top,
  };
}

function verticalOverlap(
  topA: number,
  bottomA: number,
  topB: number,
  bottomB: number
) {
  return Math.max(0, Math.min(bottomA, bottomB) - Math.max(topA, topB));
}

function coalesceOcrLineBlocks(ocrPage: NormalizedOcrPage): NormalizedOcrPage {
  if (ocrPage.blocks.length < 2) {
    return ocrPage;
  }

  const sortedBlocks = [...ocrPage.blocks].sort(
    (left, right) => left.y - right.y || left.x - right.x
  );
  const groups: Array<NormalizedOcrPage['blocks']> = [];

  for (const block of sortedBlocks) {
    const currentGroup = groups[groups.length - 1];
    const previousBlock = currentGroup?.[currentGroup.length - 1];

    if (
      currentGroup &&
      previousBlock &&
      shouldCoalesceOcrBlocks(previousBlock, block)
    ) {
      currentGroup.push(block);
      continue;
    }

    groups.push([block]);
  }

  return {
    ...ocrPage,
    blocks: groups.map(mergeOcrBlockGroup),
  };
}

function shouldCoalesceOcrBlocks(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number]
) {
  const previousBottom = previousBlock.y + previousBlock.height;
  const verticalGap = nextBlock.y - previousBottom;
  const averageSymbolHeight =
    (previousBlock.symHeight + nextBlock.symHeight) / 2;
  const maxVerticalGap = Math.max(14, Math.min(36, averageSymbolHeight * 1.4));
  const maxVerticalOverlap = Math.max(10, averageSymbolHeight * 1.2);
  const previousCenterY = previousBlock.y + previousBlock.height / 2;
  const nextCenterY = nextBlock.y + nextBlock.height / 2;
  const centerYDistance = nextCenterY - previousCenterY;
  const maxLineStep = Math.max(
    42,
    averageSymbolHeight * 3,
    Math.min(previousBlock.height, nextBlock.height) * 0.9
  );

  if (verticalGap > maxVerticalGap) {
    return false;
  }

  if (Math.abs(previousBlock.angle - nextBlock.angle) > 8) {
    return false;
  }

  if (verticalGap < -maxVerticalOverlap && centerYDistance > maxLineStep) {
    return false;
  }

  const overlap =
    Math.min(
      previousBlock.x + previousBlock.width,
      nextBlock.x + nextBlock.width
    ) - Math.max(previousBlock.x, nextBlock.x);
  const minWidth = Math.min(previousBlock.width, nextBlock.width);
  const overlapRatio = minWidth > 0 ? overlap / minWidth : 0;
  const previousCenter = previousBlock.x + previousBlock.width / 2;
  const nextCenter = nextBlock.x + nextBlock.width / 2;
  const maxCenterDistance = Math.max(
    48,
    averageSymbolHeight * 4,
    Math.min(previousBlock.width, nextBlock.width) * 0.55
  );

  return (
    overlapRatio >= 0.25 ||
    Math.abs(previousCenter - nextCenter) <= maxCenterDistance
  );
}

function mergeOcrBlockGroup(
  blocks: NormalizedOcrPage['blocks']
): NormalizedOcrPage['blocks'][number] {
  if (blocks.length === 1) {
    return blocks[0]!;
  }

  const left = Math.min(...blocks.map((block) => block.x));
  const top = Math.min(...blocks.map((block) => block.y));
  const right = Math.max(...blocks.map((block) => block.x + block.width));
  const bottom = Math.max(...blocks.map((block) => block.y + block.height));

  return {
    angle: blocks[0]?.angle ?? 0,
    height: bottom - top,
    symHeight:
      blocks.reduce((sum, block) => sum + block.symHeight, 0) / blocks.length,
    symWidth:
      blocks.reduce((sum, block) => sum + block.symWidth, 0) / blocks.length,
    text: blocks.map((block) => block.text).join(' '),
    width: right - left,
    x: left,
    y: top,
  };
}

function resolveEffectiveSourceLanguage(
  requestedSourceLanguage: string,
  detectedLanguages: string[]
) {
  if (requestedSourceLanguage !== 'auto') {
    return requestedSourceLanguage;
  }

  const counts = detectedLanguages
    .filter((language) => language && language !== 'auto')
    .reduce<Record<string, number>>((accumulator, language) => {
      accumulator[language] = (accumulator[language] ?? 0) + 1;
      return accumulator;
    }, {});

  const dominantLanguage = Object.entries(counts).sort(
    (left, right) => right[1] - left[1]
  )[0]?.[0];

  return dominantLanguage ?? 'auto';
}

function toPrismaTranslationProvider(
  provider: 'anthropic' | 'gemini' | 'openai'
) {
  switch (provider) {
    case 'anthropic':
      return ProviderType.anthropic;
    case 'gemini':
      return ProviderType.gemini;
    case 'openai':
      return ProviderType.openai;
  }
}

function toGatewayTranslationProvider(provider: ProviderType | null) {
  switch (provider) {
    case ProviderType.anthropic:
      return 'anthropic' as const;
    case ProviderType.gemini:
      return 'gemini' as const;
    case ProviderType.openai:
      return 'openai' as const;
    default:
      return undefined;
  }
}
