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
  zNormalizedOcrPage,
} from '@/server/provider-gateway/schema';
import {
  mergeHostedPageTranslation,
  performHostedOcr,
  performHostedTranslation,
} from '@/server/provider-gateway/service';
import {
  cleanProviderTranslationText,
  shouldDropProviderTranslationBlock,
} from '@/server/provider-gateway/translation-cleanup';

import {
  coalesceOcrLineBlocks,
  coalesceOcrPageContinuations,
} from './ocr-block-grouping';
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
  resultSummary: unknown;
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

type LayoutOcrPage = {
  fileName: string;
  ocrPage: NormalizedOcrPage;
};

type ReusableCachedOcrSource = {
  cacheKey: string;
  layoutPages: LayoutOcrPage[];
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

type JobProgressStage =
  | 'created'
  | 'uploading'
  | 'queued'
  | 'starting'
  | 'ocr'
  | 'translation'
  | 'finalizing'
  | 'completed'
  | 'failed';

type JobProgressSnapshot = {
  message: string;
  percent: number;
  stage: JobProgressStage;
  updatedAt: string;
};

export const JOB_RESULT_VERSION = '2026-05-03.ocr-grouping.v1' as const;
const HOSTED_OCR_MAX_BATCH_HEIGHT = 30_000;
const HOSTED_OCR_MAX_BATCH_PIXELS = 40_000_000;
const HOSTED_OCR_MAX_INLINE_IMAGE_BYTES = 7 * 1024 * 1024;
const HOSTED_OCR_JPEG_QUALITY = 88;
const QUEUE_DRAIN_ADVISORY_LOCK_KEY = 74_224_301;

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
    log?: Pick<typeof logger, 'error' | 'info'>;
    now?: Date;
    scheduleProcessing?: (jobId: string) => void;
  }
) {
  const input = zCreateTranslationJobInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
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

  const reusableOcrSource = await getReusableCachedOcrSource({
    dbClient,
    job,
    log,
    uploadAssets,
  });

  if (reusableOcrSource) {
    const queuedJob = await queueTranslationJobFromReusableOcrSource({
      cacheKey: reusableOcrSource.cacheKey,
      dbClient,
      job,
      now,
    });

    scheduleTranslationJobProcessing({
      dbClient,
      jobId: job.id,
      log,
      scheduleProcessing: deps.scheduleProcessing,
    });

    log.info({
      cacheKey: reusableOcrSource.cacheKey,
      jobId: job.id,
      pageCount: job.pageCount,
      scope: 'jobs',
      status: 'queued_from_cached_ocr',
    });

    return zCreateTranslationJobResponse.parse({
      job: buildTranslationJobSummary(queuedJob),
      upload: {
        expiresAt: queuedJob.expiresAt,
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
        resultSummary: buildProgressResultSummary(job.resultSummary, {
          message: 'Waiting for a server translation slot.',
          percent: 40,
          stage: 'queued',
          updatedAt: now.toISOString(),
        }),
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

  scheduleTranslationJobProcessing({
    dbClient,
    jobId: job.id,
    log,
    scheduleProcessing: deps.scheduleProcessing,
  });

  return zTranslationJobSummary.parse(buildTranslationJobSummary(queuedJob));
}

async function queueTranslationJobFromReusableOcrSource(input: {
  cacheKey: string;
  dbClient: typeof db;
  job: JobRecord;
  now: Date;
}) {
  return await input.dbClient.$transaction(async (tx) => {
    await tx.translationJob.update({
      where: { id: input.job.id },
      data: {
        errorCode: null,
        errorMessage: null,
        failedAt: null,
        queuedAt: input.now,
        resultSummary: {
          ...buildProgressResultSummary(input.job.resultSummary, {
            message: 'Waiting to retranslate saved chapter OCR.',
            percent: 40,
            stage: 'queued',
            updatedAt: input.now.toISOString(),
          }),
          sourceCache: {
            cacheKey: input.cacheKey,
            reusedAt: input.now.toISOString(),
          },
        },
        startedAt: null,
        status: 'queued',
        uploadCompletedAt: input.job.uploadCompletedAt ?? input.now,
      },
    });

    return await tx.translationJob.findUniqueOrThrow({
      where: { id: input.job.id },
      select: translationJobSelect,
    });
  });
}

function scheduleTranslationJobProcessing(input: {
  dbClient: typeof db;
  jobId: string;
  log: Pick<typeof logger, 'error' | 'info'>;
  scheduleProcessing?: (jobId: string) => void;
}) {
  const scheduleProcessing =
    input.scheduleProcessing ??
    ((jobId: string) => {
      if (envServer.JOB_RUNTIME_MODE !== 'inline') {
        return;
      }

      void drainTranslationJobQueue({
        dbClient: input.dbClient,
        log: input.log,
      }).catch((error) => {
        input.log.error({
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          jobId,
          scope: 'jobs',
        });
      });
    });

  scheduleProcessing(input.jobId);
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
  if (job.status !== 'processing') {
    return false;
  }

  const referenceTime = job.startedAt;

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
        resultSummary: buildProgressResultSummary(null, {
          message: 'Starting hosted processing.',
          percent: 42,
          stage: 'starting',
          updatedAt: now.toISOString(),
        }),
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

  return await processStartedTranslationJob(startedJob, {
    dbClient,
    log,
  });
}

export async function drainTranslationJobQueue(
  deps: {
    continueDraining?: boolean;
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'error' | 'info'>;
    now?: Date;
    remainingCycles?: number;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();
  const remainingCycles = deps.remainingCycles ?? 20;

  if (remainingCycles <= 0) {
    return {
      startedJobIds: [],
    };
  }

  const startedJobs = await claimQueuedTranslationJobs({
    dbClient,
    now,
  });

  if (startedJobs.length === 0) {
    return {
      startedJobIds: [],
    };
  }

  await Promise.all(
    startedJobs.map(async (job) => {
      try {
        await processStartedTranslationJob(job, {
          dbClient,
          log,
        });
      } catch (error) {
        log.error({
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          jobId: job.id,
          scope: 'jobs',
        });
      } finally {
        if (deps.continueDraining ?? true) {
          await drainTranslationJobQueue({
            continueDraining: true,
            dbClient,
            log,
            remainingCycles: remainingCycles - 1,
          });
        }
      }
    })
  );

  return {
    startedJobIds: startedJobs.map((job) => job.id),
  };
}

async function claimQueuedTranslationJobs(input: {
  dbClient: typeof db;
  now: Date;
}) {
  return await input.dbClient.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_xact_lock(${QUEUE_DRAIN_ADVISORY_LOCK_KEY}) AS locked
    `;

    if (!lock?.locked) {
      return [];
    }

    const staleStartedBefore = new Date(
      input.now.getTime() - STALE_JOB_TIMEOUT_MS
    );

    await tx.translationJob.updateMany({
      where: {
        startedAt: {
          lt: staleStartedBefore,
        },
        status: 'processing',
      },
      data: {
        errorCode: 'processing_failed',
        errorMessage:
          'The translation job did not complete within the allowed time.',
        failedAt: input.now,
        status: 'failed',
      },
    });

    const processingCount = await tx.translationJob.count({
      where: {
        status: 'processing',
      },
    });
    const availableSlots = Math.max(
      0,
      envServer.JOB_MAX_CONCURRENCY - processingCount
    );

    if (availableSlots <= 0) {
      return [];
    }

    const queuedJobs = await tx.translationJob.findMany({
      where: {
        status: 'queued',
      },
      orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
      },
      take: availableSlots,
    });
    const jobIds = queuedJobs.map((job) => job.id);

    if (jobIds.length === 0) {
      return [];
    }

    await tx.translationJob.updateMany({
      where: {
        id: {
          in: jobIds,
        },
        status: 'queued',
      },
      data: {
        resultSummary: buildProgressResultSummary(null, {
          message: 'Starting hosted processing.',
          percent: 42,
          stage: 'starting',
          updatedAt: input.now.toISOString(),
        }),
        startedAt: input.now,
        status: 'processing',
      },
    });

    return await tx.translationJob.findMany({
      where: {
        id: {
          in: jobIds,
        },
        status: 'processing',
      },
      orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
      select: translationJobSelect,
    });
  });
}

async function processStartedTranslationJob(
  startedJob: JobRecord,
  deps: {
    dbClient: typeof db;
    log: Pick<typeof logger, 'error' | 'info'>;
  }
) {
  const { dbClient, log } = deps;
  const uploadAssets = startedJob.assets
    .filter((asset) => asset.kind === 'page_upload')
    .sort((left, right) => (left.pageNumber ?? 0) - (right.pageNumber ?? 0));

  try {
    const reusableOcrSource = await getReusableCachedOcrSource({
      dbClient,
      job: startedJob,
      log,
      uploadAssets,
    });
    let layoutPages: LayoutOcrPage[];

    if (reusableOcrSource) {
      await updateTranslationJobProgress({
        dbClient,
        jobId: startedJob.id,
        progress: {
          message: 'Reusing saved OCR blocks for this chapter.',
          percent: 60,
          stage: 'ocr',
          updatedAt: new Date().toISOString(),
        },
      });

      layoutPages = reusableOcrSource.layoutPages;
      log.info({
        cacheKey: reusableOcrSource.cacheKey,
        jobId: startedJob.id,
        pageCount: startedJob.pageCount,
        scope: 'jobs',
        status: 'reused_cached_ocr',
      });
    } else {
      if (uploadAssets.length !== startedJob.pageCount) {
        throw new TranslationJobError('invalid_upload', 409);
      }

      const uploadedOcrPages: UploadedOcrPage[] = [];

      for (const asset of uploadAssets) {
        if (!asset.bucketName || !asset.objectKey || !asset.originalFileName) {
          throw new TranslationJobError('invalid_upload', 409);
        }

        const uploadedPage = await getTranslationJobPageUpload({
          bucketName: asset.bucketName,
          objectKey: asset.objectKey,
        });
        const imageBytes = new Uint8Array(
          await uploadedPage.blob.arrayBuffer()
        );
        uploadedOcrPages.push({
          fileName: asset.originalFileName,
          imageBytes,
        });
      }

      await updateTranslationJobProgress({
        dbClient,
        jobId: startedJob.id,
        progress: {
          message: 'Reading text from uploaded pages.',
          percent: 45,
          stage: 'ocr',
          updatedAt: new Date().toISOString(),
        },
      });

      const ocrPages = await performHostedOcrForUploadedPages({
        jobId: startedJob.id,
        onProgress: async ({ completedPages, totalPages }) => {
          const progressRatio =
            totalPages > 0 ? completedPages / totalPages : 1;
          await updateTranslationJobProgress({
            dbClient,
            jobId: startedJob.id,
            progress: {
              message: `Reading text from pages ${completedPages}/${totalPages}.`,
              percent: Math.min(65, 45 + Math.floor(progressRatio * 20)),
              stage: 'ocr',
              updatedAt: new Date().toISOString(),
            },
          });
        },
        pages: uploadedOcrPages,
      });

      layoutPages = ocrPages.map((page) => ({
        ...page,
        ocrPage: coalesceOcrLineBlocks(page.ocrPage),
      }));
    }

    layoutPages = coalesceOcrPageContinuations(layoutPages);

    const detectedLanguages = layoutPages.map(
      (page) => page.ocrPage.sourceLanguage
    );

    const sourceLanguage = resolveEffectiveSourceLanguage(
      startedJob.sourceLanguage,
      detectedLanguages
    );

    const translationProvider = toGatewayTranslationProvider(
      startedJob.resolvedTranslationProvider
    );
    const translatableBlockIndexesByPage = new Map<string, number[]>();
    const translatablePages = layoutPages.flatMap((page) => {
      const translatableBlockIndexes: number[] = [];
      const blocks = page.ocrPage.blocks.flatMap((block, index) => {
        if (isMaskOnlyOcrBlock(block)) {
          return [];
        }

        translatableBlockIndexes.push(index);
        return [
          {
            angle: block.angle,
            height: block.height,
            symHeight: block.symHeight,
            symWidth: block.symWidth,
            text: block.text,
            width: block.width,
            x: block.x,
            y: block.y,
          },
        ];
      });

      translatableBlockIndexesByPage.set(
        page.fileName,
        translatableBlockIndexes
      );

      return blocks.length > 0
        ? [
            {
              blocks,
              pageKey: page.fileName,
            },
          ]
        : [];
    });
    const translationBatch =
      translatablePages.length > 0
        ? await performHostedTranslation({
            jobId: startedJob.id,
            onProgress: async ({ completedBatches, totalBatches }) => {
              const progressRatio =
                totalBatches > 0 ? completedBatches / totalBatches : 1;
              await updateTranslationJobProgress({
                dbClient,
                jobId: startedJob.id,
                progress: {
                  message: `Translating text with AI ${completedBatches}/${totalBatches}.`,
                  percent: Math.min(95, 65 + Math.floor(progressRatio * 30)),
                  stage: 'translation',
                  updatedAt: new Date().toISOString(),
                },
              });
            },
            pages: translatablePages,
            preferredProvider: translationProvider,
            sourceLanguage,
            targetLanguage: startedJob.targetLanguage,
          })
        : null;

    await updateTranslationJobProgress({
      dbClient,
      jobId: startedJob.id,
      progress: {
        message: 'Finalizing translated chapter.',
        percent: 97,
        stage: 'finalizing',
        updatedAt: new Date().toISOString(),
      },
    });

    const translationsByPage = new Map(
      translationBatch?.pages.map((page) => [page.pageKey, page]) ?? []
    );
    const pages: Record<string, HostedPageTranslation> = {};

    for (const page of layoutPages) {
      const translatableBlockIndexes =
        translatableBlockIndexesByPage.get(page.fileName) ?? [];
      const translationPage =
        translationsByPage.get(page.fileName) ??
        (translatableBlockIndexes.length === 0
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
        translationPage: mapTranslationPageToOcrBlocks({
          ocrPage: page.ocrPage,
          pageKey: page.fileName,
          translatableBlockIndexes,
          translationPage,
        }),
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
          resultSummary: buildProgressResultSummary(startedJob.resultSummary, {
            message: 'Translation completed.',
            percent: 100,
            stage: 'completed',
            updatedAt: completedAt.toISOString(),
          }),
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
          resultSummary: buildProgressResultSummary(startedJob.resultSummary, {
            message: errorMessage,
            percent: getStoredJobProgress(startedJob)?.percent ?? 40,
            stage: 'failed',
            updatedAt: failedAt.toISOString(),
          }),
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
  resultSummary: true,
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
  const storedProgress = getStoredJobProgress(job);
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
    progressMessage: calculateJobProgressMessage(job.status, storedProgress),
    progressPercent: calculateJobProgress(job.status, {
      pageCount: job.pageCount,
      storedProgress,
      uploadedPageCount,
    }),
    progressStage: calculateJobProgressStage(job.status, storedProgress),
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
    storedProgress: JobProgressSnapshot | null;
    uploadedPageCount: number;
  }
) {
  if (
    input.storedProgress &&
    (status === 'processing' || status === 'queued' || status === 'failed')
  ) {
    return input.storedProgress.percent;
  }

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
      return 40;
    case 'processing':
      return 42;
    case 'completed':
      return 100;
    case 'failed':
    case 'canceled':
    case 'expired':
      return input.uploadedPageCount > 0 ? 40 : 0;
  }
}

function calculateJobProgressStage(
  status: JobRecord['status'],
  storedProgress: JobProgressSnapshot | null
) {
  if (
    storedProgress &&
    (status === 'processing' || status === 'queued' || status === 'failed')
  ) {
    return storedProgress.stage;
  }

  switch (status) {
    case 'created':
      return 'created';
    case 'awaiting_upload':
      return 'uploading';
    case 'queued':
      return 'queued';
    case 'processing':
      return 'starting';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'canceled':
    case 'expired':
      return 'failed';
  }
}

function calculateJobProgressMessage(
  status: JobRecord['status'],
  storedProgress: JobProgressSnapshot | null
) {
  if (
    storedProgress &&
    (status === 'processing' || status === 'queued' || status === 'failed')
  ) {
    return storedProgress.message;
  }

  switch (status) {
    case 'created':
      return 'Preparing hosted translation.';
    case 'awaiting_upload':
      return 'Uploading chapter pages.';
    case 'queued':
      return 'Waiting for a server translation slot.';
    case 'processing':
      return 'Starting hosted processing.';
    case 'completed':
      return 'Translation completed.';
    case 'failed':
    case 'canceled':
    case 'expired':
      return 'Hosted translation stopped.';
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

function getStoredJobProgress(job: Pick<JobRecord, 'resultSummary'>) {
  const summary =
    job.resultSummary &&
    typeof job.resultSummary === 'object' &&
    !Array.isArray(job.resultSummary)
      ? (job.resultSummary as Record<string, unknown>)
      : null;
  const progress =
    summary?.progress &&
    typeof summary.progress === 'object' &&
    !Array.isArray(summary.progress)
      ? (summary.progress as Record<string, unknown>)
      : null;

  if (!progress) {
    return null;
  }

  const stage = progress.stage;
  const message = progress.message;
  const percent = progress.percent;
  const updatedAt = progress.updatedAt;

  if (
    typeof stage !== 'string' ||
    !isJobProgressStage(stage) ||
    typeof message !== 'string' ||
    typeof percent !== 'number' ||
    typeof updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    message,
    percent: clampProgressPercent(percent),
    stage,
    updatedAt,
  } satisfies JobProgressSnapshot;
}

function buildProgressResultSummary(
  current: unknown,
  progress: JobProgressSnapshot
): Prisma.InputJsonObject {
  return {
    ...(current && typeof current === 'object' && !Array.isArray(current)
      ? current
      : {}),
    progress: {
      message: progress.message,
      percent: clampProgressPercent(progress.percent),
      stage: progress.stage,
      updatedAt: progress.updatedAt,
    },
  };
}

async function updateTranslationJobProgress(input: {
  dbClient: typeof db;
  jobId: string;
  progress: JobProgressSnapshot;
}) {
  const currentJob = await input.dbClient.translationJob.findUnique({
    where: {
      id: input.jobId,
    },
    select: {
      resultSummary: true,
    },
  });

  await input.dbClient.translationJob.update({
    where: {
      id: input.jobId,
    },
    data: {
      resultSummary: buildProgressResultSummary(
        currentJob?.resultSummary ?? null,
        input.progress
      ),
    },
  });
}

function clampProgressPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isJobProgressStage(stage: string): stage is JobProgressStage {
  return [
    'created',
    'uploading',
    'queued',
    'starting',
    'ocr',
    'translation',
    'finalizing',
    'completed',
    'failed',
  ].includes(stage);
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

function mapTranslationPageToOcrBlocks(input: {
  ocrPage: NormalizedOcrPage;
  pageKey: string;
  translatableBlockIndexes: number[];
  translationPage: {
    blocks: Array<{ translation?: string }>;
    pageKey: string;
  };
}) {
  const translationsByOcrBlockIndex = new Map<number, string>();

  for (const [
    translationBlockIndex,
    ocrBlockIndex,
  ] of input.translatableBlockIndexes.entries()) {
    translationsByOcrBlockIndex.set(
      ocrBlockIndex,
      input.translationPage.blocks[translationBlockIndex]?.translation ?? ''
    );
  }

  return {
    blocks: input.ocrPage.blocks.map((block, index) => ({
      index,
      sourceText: block.text,
      translation: isMaskOnlyOcrBlock(block)
        ? ''
        : (translationsByOcrBlockIndex.get(index) ?? ''),
    })),
    pageKey: input.pageKey,
  };
}

function isMaskOnlyOcrBlock(block: NormalizedOcrPage['blocks'][number]) {
  return block.renderMode === 'mask_only';
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

async function getReusableCachedOcrSource(input: {
  dbClient: typeof db;
  job: JobRecord;
  log: Pick<typeof logger, 'error' | 'info'>;
  uploadAssets: JobAssetRecord[];
}): Promise<ReusableCachedOcrSource | null> {
  const cached = await getCachedTranslationSourceManifest(input);

  if (!cached) {
    return null;
  }

  const layoutPages = mapCachedManifestToOcrLayoutPages({
    cacheKey: cached.cacheKey,
    job: input.job,
    manifest: cached.manifest,
    uploadAssets: input.uploadAssets,
  });

  if (!layoutPages) {
    return null;
  }

  return {
    cacheKey: cached.cacheKey,
    layoutPages,
  };
}

async function getCachedTranslationSourceManifest(input: {
  dbClient: typeof db;
  job: JobRecord;
  log: Pick<typeof logger, 'error' | 'info'>;
}) {
  if (!input.job.chapterCacheKey) {
    return null;
  }

  const cachedResult = await input.dbClient.translationResultCache.findFirst({
    where: {
      chapterCacheKey: input.job.chapterCacheKey,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  if (!cachedResult) {
    return null;
  }

  try {
    const manifest =
      cachedResult.resultManifest == null
        ? await getTranslationJobResultManifest({
            bucketName: cachedResult.bucketName,
            objectKey: cachedResult.objectKey,
          })
        : parseCachedResultManifest(cachedResult.resultManifest);

    return {
      cacheKey: cachedResult.cacheKey,
      manifest,
    };
  } catch (error) {
    input.log.error({
      cacheKey: cachedResult.cacheKey,
      err: error,
      jobId: input.job.id,
      message: 'Failed to read reusable OCR source cache',
      scope: 'jobs',
    });

    return null;
  }
}

function mapCachedManifestToOcrLayoutPages(input: {
  cacheKey: string;
  job: JobRecord;
  manifest: TranslationJobResultManifest;
  uploadAssets: JobAssetRecord[];
}): LayoutOcrPage[] | null {
  if (input.uploadAssets.length !== input.job.pageCount) {
    return null;
  }

  const cachedPagesByFileName = new Map(
    input.manifest.pageOrder
      .map((pageKey) => [pageKey, input.manifest.pages[pageKey]] as const)
      .filter((entry): entry is [string, HostedPageTranslation] =>
        Boolean(entry[1])
      )
  );
  const layoutPages: LayoutOcrPage[] = [];

  for (const [index, asset] of input.uploadAssets.entries()) {
    const cachedPage =
      (asset.originalFileName
        ? cachedPagesByFileName.get(asset.originalFileName)
        : null) ?? input.manifest.pages[input.manifest.pageOrder[index] ?? ''];

    if (!asset.originalFileName || !cachedPage) {
      return null;
    }

    const sanitizedPage = sanitizeHostedPageTranslation(cachedPage);
    const ocrPage = zNormalizedOcrPage.parse({
      blocks: sanitizedPage.blocks.map(
        ({ translation: _translation, ...block }) => block
      ),
      imgHeight: sanitizedPage.imgHeight,
      imgWidth: sanitizedPage.imgWidth,
      provider: toGatewayOcrProvider(input.job.resolvedOcrProvider),
      providerModel: 'cached_result_manifest',
      providerRequestId: input.cacheKey,
      sourceLanguage:
        sanitizedPage.sourceLanguage || input.manifest.sourceLanguage,
      usage: {
        inputTokens: null,
        latencyMs: 0,
        outputTokens: null,
        pageCount: 1,
        providerRequestId: input.cacheKey,
        requestCount: 1,
      },
    });

    layoutPages.push({
      fileName: asset.originalFileName,
      ocrPage: coalesceOcrLineBlocks(ocrPage),
    });
  }

  return layoutPages;
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
    pages[asset.originalFileName] = sanitizeHostedPageTranslation(cachedPage);
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
          progress: {
            message: 'Translation loaded from cache.',
            percent: 100,
            stage: 'completed',
            updatedAt: input.now.toISOString(),
          },
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

function sanitizeHostedPageTranslation(
  page: HostedPageTranslation
): HostedPageTranslation {
  return {
    ...page,
    blocks: page.blocks
      .map((block) => {
        const rawTranslation = block.translation;

        return {
          ...block,
          rawTranslation,
          translation: cleanProviderTranslationText(rawTranslation),
        };
      })
      .filter(
        (block) =>
          !shouldDropProviderTranslationBlock({
            sourceText: block.text,
            translation: block.rawTranslation,
          })
      )
      .map(({ rawTranslation: _rawTranslation, ...block }) => block),
  };
}

async function performHostedOcrForUploadedPages(input: {
  jobId: string;
  onProgress?: (progress: {
    completedPages: number;
    totalPages: number;
  }) => Promise<void>;
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

  let completedPages = 0;
  const totalPages = input.pages.length;
  const ocrBatches = await buildHostedOcrBatches(dimensionedPages);

  for (const batch of ocrBatches) {
    const batchOcrPage = await performHostedOcr({
      imageBytes: batch.imageBytes,
      imageHeight: batch.height,
      imageWidth: batch.width,
      jobId: input.jobId,
      pageCount: batch.placements.length,
    });
    ocrPages.push(...mapBatchOcrPageToOriginalPages(batch, batchOcrPage));
    completedPages += batch.placements.length;
    await input.onProgress?.({ completedPages, totalPages });
  }

  for (const page of fallbackPages) {
    ocrPages.push({
      fileName: page.fileName,
      ocrPage: await performHostedOcr({
        imageBytes: page.imageBytes,
        jobId: input.jobId,
      }),
    });
    completedPages += 1;
    await input.onProgress?.({ completedPages, totalPages });
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

function toGatewayOcrProvider(provider: ProviderType | null) {
  switch (provider) {
    case ProviderType.gemini:
      return 'gemini' as const;
    case ProviderType.google_cloud_vision:
    default:
      return 'google_cloud_vision' as const;
  }
}
