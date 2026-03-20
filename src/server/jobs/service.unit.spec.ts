import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDb,
  mockGetProviderGatewayManifest,
  mockGetTranslationJobPageUpload,
  mockLogger,
  mockPerformHostedOcr,
  mockPerformHostedTranslation,
  mockPutTranslationJobPageUpload,
  mockPutTranslationJobResultManifest,
} = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    tokenLedger: {
      aggregate: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    translationJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockGetProviderGatewayManifest: vi.fn(),
  mockGetTranslationJobPageUpload: vi.fn(),
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  mockPerformHostedOcr: vi.fn(),
  mockPerformHostedTranslation: vi.fn(),
  mockPutTranslationJobPageUpload: vi.fn(),
  mockPutTranslationJobResultManifest: vi.fn(),
}));

vi.mock('@/env/server', () => ({
  envServer: {
    JOB_MAX_PAGE_BYTES: 20_000_000,
    JOB_PAGE_UPLOAD_URL_TTL_SECONDS: 900,
    JOB_RESULT_RETENTION_HOURS: 24,
    JOB_RUNTIME_MODE: 'inline',
    JOB_TOKENS_PER_PAGE: 5,
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/server/provider-gateway/manifest', () => ({
  getProviderGatewayManifest: mockGetProviderGatewayManifest,
}));

vi.mock('@/server/provider-gateway/service', () => ({
  mergeHostedPageTranslation: vi.fn(
    ({ ocrPage, targetLanguage, translationPage, translatorType }) => ({
      blocks: ocrPage.blocks.map(
        (block: Record<string, unknown>, index: number) => ({
          ...block,
          translation: translationPage.blocks[index]?.translation ?? '',
        })
      ),
      imgHeight: ocrPage.imgHeight,
      imgWidth: ocrPage.imgWidth,
      sourceLanguage: ocrPage.sourceLanguage,
      targetLanguage,
      translatorType,
    })
  ),
  performHostedOcr: mockPerformHostedOcr,
  performHostedTranslation: mockPerformHostedTranslation,
}));

vi.mock('@/server/jobs/storage', () => ({
  getTranslationJobPageUpload: mockGetTranslationJobPageUpload,
  getTranslationJobResultManifest: vi.fn(),
  putTranslationJobPageUpload: mockPutTranslationJobPageUpload,
  putTranslationJobResultManifest: mockPutTranslationJobResultManifest,
}));

import {
  completeTranslationJobUpload,
  createTranslationJob,
  processTranslationJob,
} from '@/server/jobs/service';

describe('job service', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
    mockDb.tokenLedger.aggregate.mockReset();
    mockDb.tokenLedger.create.mockReset();
    mockDb.tokenLedger.updateMany.mockReset();
    mockDb.translationJob.findUnique.mockReset();
    mockDb.translationJob.update.mockReset();
    mockGetProviderGatewayManifest.mockReset();
    mockGetTranslationJobPageUpload.mockReset();
    mockLogger.error.mockReset();
    mockLogger.info.mockReset();
    mockPerformHostedOcr.mockReset();
    mockPerformHostedTranslation.mockReset();
    mockPutTranslationJobPageUpload.mockReset();
    mockPutTranslationJobResultManifest.mockReset();

    mockGetProviderGatewayManifest.mockReturnValue({
      ocr: {
        defaultProvider: 'google_cloud_vision',
        providers: [],
      },
      requestPolicy: {
        retryMaxAttempts: 2,
        timeoutMs: 60000,
      },
      translation: {
        defaultProvider: 'gemini',
        promptVersion: '2026-03-20.v1',
        providers: [
          {
            enabled: true,
            isDefault: true,
            launchStage: 'primary',
            modelName: 'gemini-test',
            provider: 'gemini',
            supportedByGateway: true,
          },
        ],
      },
    });
  });

  it('creates an awaiting-upload job with page placeholders', async () => {
    mockDb.$transaction.mockImplementation(async (callback) => {
      const tx = {
        jobAsset: {
          createMany: vi.fn(),
        },
        translationJob: {
          create: vi.fn().mockResolvedValue({
            id: 'job-1',
          }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(
            buildJobRecord({
              id: 'job-1',
              objectKeys: [null, null],
              pageCount: 2,
              status: 'awaiting_upload',
            })
          ),
        },
      };

      return await callback(tx);
    });

    const result = await createTranslationJob(
      {
        pages: [
          {
            fileName: '001.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
          },
          {
            fileName: '002.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 2048,
          },
        ],
        targetLanguage: 'en',
      },
      {
        actor: {
          deviceId: 'device-1',
          licenseId: 'license-1',
        },
        dbClient: mockDb as never,
      }
    );

    expect(result.job.id).toBe('job-1');
    expect(result.job.status).toBe('awaiting_upload');
    expect(result.job.pages).toHaveLength(2);
    expect(result.job.pages[0]?.uploadStatus).toBe('pending');
  });

  it('queues a fully uploaded job and reserves tokens', async () => {
    mockDb.translationJob.findUnique.mockResolvedValue(
      buildJobRecord({
        id: 'job-2',
        objectKeys: [
          'jobs/job/uploads/0001-001.jpg',
          'jobs/job/uploads/0002-002.jpg',
        ],
        pageCount: 2,
        status: 'awaiting_upload',
      })
    );
    mockDb.tokenLedger.aggregate.mockResolvedValue({
      _sum: {
        deltaTokens: 100,
      },
    });
    mockDb.$transaction.mockImplementation(async (callback) => {
      const tx = {
        tokenLedger: {
          create: mockDb.tokenLedger.create,
        },
        translationJob: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(
            buildJobRecord({
              id: 'job-2',
              objectKeys: [
                'jobs/job/uploads/0001-001.jpg',
                'jobs/job/uploads/0002-002.jpg',
              ],
              pageCount: 2,
              queuedAt: new Date('2026-03-20T10:05:00.000Z'),
              reservedTokens: 10,
              status: 'queued',
              uploadCompletedAt: new Date('2026-03-20T10:05:00.000Z'),
            })
          ),
          update: vi.fn(),
        },
      };

      return await callback(tx);
    });

    const scheduleProcessing = vi.fn();
    const result = await completeTranslationJobUpload(
      { jobId: 'job-2' },
      {
        actor: {
          deviceId: 'device-1',
          licenseId: 'license-1',
        },
        dbClient: mockDb as never,
        scheduleProcessing,
      }
    );

    expect(result.status).toBe('queued');
    expect(result.reservedTokens).toBe(10);
    expect(mockDb.tokenLedger.create).toHaveBeenCalledOnce();
    expect(scheduleProcessing).toHaveBeenCalledWith('job-2');
  });

  it('processes a queued job and stores the manifest', async () => {
    mockDb.$transaction
      .mockImplementationOnce(async (callback) => {
        const tx = {
          translationJob: {
            findUnique: vi.fn().mockResolvedValue(
              buildJobRecord({
                id: 'job-3',
                pageCount: 1,
                reservedTokens: 5,
                startedAt: new Date('2026-03-20T10:10:00.000Z'),
                status: 'processing',
                uploadCompletedAt: new Date('2026-03-20T10:09:00.000Z'),
              })
            ),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };

        return await callback(tx);
      })
      .mockImplementationOnce(async (callback) => {
        const tx = {
          jobAsset: {
            create: vi.fn(),
            findFirst: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
          tokenLedger: {
            create: mockDb.tokenLedger.create,
            updateMany: mockDb.tokenLedger.updateMany,
          },
          translationJob: {
            update: vi.fn(),
          },
        };

        return await callback(tx);
      });

    mockGetTranslationJobPageUpload.mockResolvedValue({
      blob: new Blob([new Uint8Array([1, 2, 3])]),
    });
    mockPerformHostedOcr.mockResolvedValue({
      blocks: [
        {
          angle: 0,
          height: 10,
          symHeight: 5,
          symWidth: 5,
          text: 'hello',
          width: 20,
          x: 1,
          y: 2,
        },
      ],
      imgHeight: 100,
      imgWidth: 80,
      provider: 'google_cloud_vision',
      providerModel: 'TEXT_DETECTION',
      providerRequestId: 'ocr-1',
      sourceLanguage: 'ja',
      usage: {
        inputTokens: null,
        latencyMs: 100,
        outputTokens: null,
        pageCount: 1,
        providerRequestId: 'ocr-1',
        requestCount: 1,
      },
    });
    mockPerformHostedTranslation.mockResolvedValue({
      pages: [
        {
          blocks: [
            {
              index: 0,
              sourceText: 'hello',
              translation: 'bonjour',
            },
          ],
          pageKey: '001.jpg',
        },
      ],
      promptProfile: 'manga',
      promptVersion: '2026-03-20.v1',
      provider: 'gemini',
      providerModel: 'gemini-test',
      sourceLanguage: 'ja',
      targetLanguage: 'fr',
      usage: {
        finishReason: 'stop',
        inputTokens: 10,
        latencyMs: 200,
        outputTokens: 5,
        pageCount: 1,
        providerRequestId: 'tr-1',
        requestCount: 1,
        stopReason: 'stop',
      },
    });
    mockPutTranslationJobResultManifest.mockResolvedValue({
      bucketName: 'results',
      objectKey: 'jobs/job-3/results/translation-manifest.json',
    });

    const result = await processTranslationJob(
      { jobId: 'job-3' },
      {
        dbClient: mockDb as never,
        log: mockLogger,
      }
    );

    expect(result?.jobId).toBe('job-3');
    expect(result?.pages['001.jpg']?.blocks[0]?.translation).toBe('bonjour');
    expect(mockDb.tokenLedger.create).toHaveBeenCalledOnce();
    expect(mockPutTranslationJobResultManifest).toHaveBeenCalledOnce();
  });
});

function buildJobRecord(
  overrides: Partial<{
    completedAt: Date | null;
    createdAt: Date;
    failedAt: Date | null;
    id: string;
    objectKeys: Array<string | null>;
    pageCount: number;
    queuedAt: Date | null;
    reservedTokens: number;
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
  }> = {}
) {
  const objectKeys = overrides.objectKeys ?? ['jobs/job/uploads/0001-001.jpg'];
  const assets = objectKeys.map((objectKey, index) => ({
    bucketName: objectKey ? 'uploads' : null,
    checksumSha256: null,
    createdAt: new Date('2026-03-20T09:59:00.000Z'),
    id: `asset-${index + 1}`,
    kind: 'page_upload' as const,
    metadata: objectKey
      ? {
          uploadedAt: '2026-03-20T10:00:00.000Z',
          uploadStatus: 'uploaded',
        }
      : {
          uploadStatus: 'pending',
        },
    mimeType: 'image/jpeg',
    objectKey,
    originalFileName: `${String(index + 1).padStart(3, '0')}.jpg`,
    pageNumber: index + 1,
    sizeBytes: 1024,
  }));

  return {
    assets,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-03-20T10:00:00.000Z'),
    deviceId: 'device-1',
    errorCode: null,
    errorMessage: null,
    expiresAt: new Date('2026-03-20T10:15:00.000Z'),
    failedAt: overrides.failedAt ?? null,
    id: overrides.id ?? 'job-default',
    licenseId: 'license-1',
    pageCount: overrides.pageCount ?? assets.length,
    queuedAt: overrides.queuedAt ?? null,
    reservedTokens: overrides.reservedTokens ?? 0,
    resolvedTranslationProvider: 'gemini',
    sourceLanguage: overrides.sourceLanguage ?? 'auto',
    spentTokens: overrides.spentTokens ?? 0,
    startedAt: overrides.startedAt ?? null,
    status: overrides.status ?? 'awaiting_upload',
    targetLanguage: overrides.targetLanguage ?? 'fr',
    uploadCompletedAt: overrides.uploadCompletedAt ?? null,
  };
}
