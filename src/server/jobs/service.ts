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
  zCreateTranslationJobInput,
  zCreateTranslationJobResponse,
  zTranslationJobControlInput,
  zTranslationJobPageUploadInput,
  zTranslationJobResultManifest,
  zTranslationJobSummary,
} from './schema';
import {
  getTranslationJobPageUpload,
  getTranslationJobResultManifest,
  putTranslationJobPageUpload,
  putTranslationJobResultManifest,
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

const JOB_RESULT_VERSION = '2026-03-20.phase11.v1' as const;

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
    message?: string
  ) {
    super(message ?? code);
    this.name = 'TranslationJobError';
  }
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
    throw new TranslationJobError('insufficient_tokens', 409);
  }

  const expiresAt = new Date(
    now.getTime() + envServer.JOB_PAGE_UPLOAD_URL_TTL_SECONDS * 1000
  );

  const job = await dbClient.$transaction(async (tx) => {
    const createdJob = await tx.translationJob.create({
      data: {
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
    throw new TranslationJobError('insufficient_tokens', 409);
  }

  const queuedJob = await dbClient.$transaction(async (tx) => {
    await tx.tokenLedger.create({
      data: {
        deltaTokens: -reservedTokens,
        description: `Reserved tokens for job ${job.id}`,
        deviceId: job.deviceId,
        idempotencyKey: `job-reserve:${job.id}`,
        jobId: job.id,
        licenseId: job.licenseId,
        metadata: {
          pageCount: job.pageCount,
          reservedAt: now.toISOString(),
        },
        status: 'pending',
        type: 'job_reserve',
      },
    });

    await tx.translationJob.update({
      where: { id: job.id },
      data: {
        queuedAt: now,
        reservedTokens,
        status: 'queued',
        uploadCompletedAt: now,
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
          sourceLanguage,
          spentTokens,
          status: 'completed',
          uploadCompletedAt: startedJob.uploadCompletedAt ?? completedAt,
        },
      });
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

function getUploadedAt(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const uploadedAt = (metadata as { uploadedAt?: unknown }).uploadedAt;

  return typeof uploadedAt === 'string' ? new Date(uploadedAt) : null;
}

function calculateReservedTokens(pageCount: number) {
  return pageCount * envServer.JOB_TOKENS_PER_PAGE;
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
  return await Promise.all(
    input.pages.map(async (page) => ({
      fileName: page.fileName,
      ocrPage: await performHostedOcr({
        imageBytes: page.imageBytes,
        jobId: input.jobId,
      }),
    }))
  );
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

  if (verticalGap < -8 || verticalGap > maxVerticalGap) {
    return false;
  }

  if (Math.abs(previousBlock.angle - nextBlock.angle) > 8) {
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
  const maxCenterDistance =
    Math.max(previousBlock.width, nextBlock.width) * 0.35;

  return (
    overlapRatio >= 0.35 ||
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
