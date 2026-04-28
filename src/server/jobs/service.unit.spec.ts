import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDb,
  mockDeleteTranslationJobPageUploads,
  mockGetProviderGatewayManifestWithRuntimeConfig,
  mockGetTranslationJobPageUpload,
  mockGetTranslationJobResultManifest,
  mockLogger,
  mockPerformHostedOcr,
  mockPerformHostedTranslation,
  mockPutTranslationJobPageUpload,
  mockPutTranslationJobResultManifest,
  mockPutTranslationResultCacheManifest,
} = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    jobAsset: {
      update: vi.fn(),
    },
    tokenLedger: {
      aggregate: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    translationJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    translationResultCache: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
  mockDeleteTranslationJobPageUploads: vi.fn(),
  mockGetProviderGatewayManifestWithRuntimeConfig: vi.fn(),
  mockGetTranslationJobPageUpload: vi.fn(),
  mockGetTranslationJobResultManifest: vi.fn(),
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  mockPerformHostedOcr: vi.fn(),
  mockPerformHostedTranslation: vi.fn(),
  mockPutTranslationJobPageUpload: vi.fn(),
  mockPutTranslationJobResultManifest: vi.fn(),
  mockPutTranslationResultCacheManifest: vi.fn(),
}));

vi.mock('@/env/server', () => ({
  envServer: {
    JOB_MAX_PAGE_BYTES: 20_000_000,
    JOB_PAGE_UPLOAD_URL_TTL_SECONDS: 900,
    JOB_RESULT_RETENTION_HOURS: 24,
    JOB_RUNTIME_MODE: 'inline',
    JOB_TOKENS_PER_CHAPTER: 25,
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/server/provider-gateway/manifest', () => ({
  getProviderGatewayManifestWithRuntimeConfig:
    mockGetProviderGatewayManifestWithRuntimeConfig,
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
  deleteTranslationJobPageUploads: mockDeleteTranslationJobPageUploads,
  getTranslationJobPageUpload: mockGetTranslationJobPageUpload,
  getTranslationJobResultManifest: mockGetTranslationJobResultManifest,
  putTranslationJobPageUpload: mockPutTranslationJobPageUpload,
  putTranslationJobResultManifest: mockPutTranslationJobResultManifest,
  putTranslationResultCacheManifest: mockPutTranslationResultCacheManifest,
}));

import sharp from 'sharp';

import {
  completeTranslationJobUpload,
  createTranslationJob,
  processTranslationJob,
} from '@/server/jobs/service';

describe('job service', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
    mockDb.jobAsset.update.mockReset();
    mockDb.tokenLedger.aggregate.mockReset();
    mockDb.tokenLedger.create.mockReset();
    mockDb.tokenLedger.updateMany.mockReset();
    mockDb.translationJob.findUnique.mockReset();
    mockDb.translationJob.update.mockReset();
    mockDb.translationResultCache.findUnique.mockReset();
    mockDb.translationResultCache.findFirst.mockReset();
    mockDb.translationResultCache.update.mockReset();
    mockDb.translationResultCache.upsert.mockReset();
    mockDeleteTranslationJobPageUploads.mockReset();
    mockGetProviderGatewayManifestWithRuntimeConfig.mockReset();
    mockGetTranslationJobPageUpload.mockReset();
    mockGetTranslationJobResultManifest.mockReset();
    mockLogger.error.mockReset();
    mockLogger.info.mockReset();
    mockPerformHostedOcr.mockReset();
    mockPerformHostedTranslation.mockReset();
    mockPutTranslationJobPageUpload.mockReset();
    mockPutTranslationJobResultManifest.mockReset();
    mockPutTranslationResultCacheManifest.mockReset();

    mockGetProviderGatewayManifestWithRuntimeConfig.mockResolvedValue({
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
    mockDb.tokenLedger.aggregate.mockResolvedValue({
      _sum: {
        deltaTokens: 100,
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

  it('creates a completed job immediately when a cached result matches the page checksums', async () => {
    mockDb.$transaction
      .mockImplementationOnce(async (callback) => {
        const tx = {
          jobAsset: {
            createMany: vi.fn(),
          },
          translationJob: {
            create: vi.fn().mockResolvedValue({
              id: 'job-create-cache-hit',
            }),
            findUniqueOrThrow: vi.fn().mockResolvedValue(
              buildJobRecord({
                id: 'job-create-cache-hit',
                objectChecksums: ['a'.repeat(64), 'b'.repeat(64)],
                objectKeys: [null, null],
                pageCount: 2,
                status: 'awaiting_upload',
              })
            ),
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
          },
          translationJob: {
            findUniqueOrThrow: vi.fn().mockResolvedValue(
              buildJobRecord({
                completedAt: new Date('2026-03-20T10:00:00.000Z'),
                id: 'job-create-cache-hit',
                objectChecksums: ['a'.repeat(64), 'b'.repeat(64)],
                objectKeys: [null, null],
                pageCount: 2,
                spentTokens: 25,
                status: 'completed',
                uploadCompletedAt: new Date('2026-03-20T10:00:00.000Z'),
              })
            ),
            update: vi.fn(),
          },
          translationResultCache: {
            update: mockDb.translationResultCache.update,
          },
        };

        return await callback(tx);
      });
    mockDb.translationResultCache.findUnique.mockResolvedValue({
      bucketName: 'results',
      cacheKey: 'cache-key',
      objectKey:
        'cache/translation-results/cache-key/translation-manifest.json',
    });
    mockGetTranslationJobResultManifest.mockResolvedValue({
      completedAt: new Date('2026-03-20T09:00:00.000Z'),
      deviceId: 'device-original',
      jobId: 'job-original',
      licenseId: 'license-original',
      pageCount: 2,
      pageOrder: ['old-001.jpg', 'old-002.jpg'],
      pages: {
        'old-001.jpg': {
          blocks: [],
          imgHeight: 100,
          imgWidth: 80,
          sourceLanguage: 'ja',
          targetLanguage: 'fr',
          translatorType: 'gemini',
        },
        'old-002.jpg': {
          blocks: [],
          imgHeight: 100,
          imgWidth: 80,
          sourceLanguage: 'ja',
          targetLanguage: 'fr',
          translatorType: 'gemini',
        },
      },
      sourceLanguage: 'ja',
      targetLanguage: 'fr',
      translatorType: 'gemini',
      version: '2026-03-20.phase11.v1',
    });
    mockPutTranslationJobResultManifest.mockResolvedValue({
      bucketName: 'results',
      objectKey: 'jobs/job-create-cache-hit/results/translation-manifest.json',
    });

    const result = await createTranslationJob(
      {
        pages: [
          {
            checksumSha256: 'a'.repeat(64),
            fileName: 'first.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
          },
          {
            checksumSha256: 'b'.repeat(64),
            fileName: 'second.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 2048,
          },
        ],
        targetLanguage: 'fr',
      },
      {
        actor: {
          deviceId: 'device-1',
          licenseId: 'license-1',
        },
        dbClient: mockDb as never,
      }
    );

    expect(result.job.status).toBe('completed');
    expect(result.job.spentTokens).toBe(25);
    expect(result.job.resultPath).toBe(
      '/api/mobile/jobs/job-create-cache-hit/result'
    );
    expect(mockPutTranslationJobResultManifest).toHaveBeenCalledOnce();
    expect(mockDb.translationResultCache.update).toHaveBeenCalledOnce();
  });

  it('creates a completed job from a chapter URL cache when the client sees fewer pages', async () => {
    mockDb.$transaction
      .mockImplementationOnce(async (callback) => {
        const tx = {
          jobAsset: {
            createMany: vi.fn(),
          },
          translationJob: {
            create: vi.fn().mockResolvedValue({
              id: 'job-chapter-url-cache-hit',
            }),
            findUniqueOrThrow: vi.fn().mockResolvedValue(
              buildJobRecord({
                chapterCacheKey: 'chapter-cache-key',
                chapterIdentity: {
                  chapterUrl: '/manga/absolute-regression/chapter-97',
                  sourceId: '1234',
                },
                id: 'job-chapter-url-cache-hit',
                objectChecksums: ['a'.repeat(64), 'b'.repeat(64)],
                objectKeys: [null, null],
                pageCount: 2,
                status: 'awaiting_upload',
              })
            ),
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
          },
          translationJob: {
            findUniqueOrThrow: vi.fn().mockResolvedValue(
              buildJobRecord({
                chapterCacheKey: 'chapter-cache-key',
                chapterIdentity: {
                  chapterUrl: '/manga/absolute-regression/chapter-97',
                  sourceId: '1234',
                },
                completedAt: new Date('2026-03-20T10:00:00.000Z'),
                id: 'job-chapter-url-cache-hit',
                objectChecksums: ['a'.repeat(64), 'b'.repeat(64)],
                objectKeys: [null, null],
                pageCount: 2,
                spentTokens: 25,
                status: 'completed',
                uploadCompletedAt: new Date('2026-03-20T10:00:00.000Z'),
              })
            ),
            update: vi.fn(),
          },
          translationResultCache: {
            update: mockDb.translationResultCache.update,
          },
        };

        return await callback(tx);
      });
    mockDb.translationResultCache.findFirst.mockResolvedValue({
      bucketName: 'results',
      cacheKey: 'chapter-url-cache-key',
      objectKey:
        'cache/translation-results/chapter-url-cache-key/translation-manifest.json',
      resultManifest: {
        completedAt: new Date('2026-03-20T09:00:00.000Z'),
        deviceId: 'device-original',
        jobId: 'job-original',
        licenseId: 'license-original',
        pageCount: 3,
        pageOrder: ['001.jpg', '002.jpg', '003.jpg'],
        pages: {
          '001.jpg': {
            blocks: [],
            imgHeight: 100,
            imgWidth: 80,
            sourceLanguage: 'ja',
            targetLanguage: 'fr',
            translatorType: 'gemini',
          },
          '002.jpg': {
            blocks: [],
            imgHeight: 100,
            imgWidth: 80,
            sourceLanguage: 'ja',
            targetLanguage: 'fr',
            translatorType: 'gemini',
          },
          '003.jpg': {
            blocks: [],
            imgHeight: 100,
            imgWidth: 80,
            sourceLanguage: 'ja',
            targetLanguage: 'fr',
            translatorType: 'gemini',
          },
        },
        sourceLanguage: 'ja',
        targetLanguage: 'fr',
        translatorType: 'gemini',
        version: '2026-03-20.phase11.v1',
      },
    });
    mockPutTranslationJobResultManifest.mockResolvedValue({
      bucketName: 'results',
      objectKey:
        'jobs/job-chapter-url-cache-hit/results/translation-manifest.json',
    });

    const result = await createTranslationJob(
      {
        chapterIdentity: {
          chapterUrl: '/manga/absolute-regression/chapter-97',
          sourceId: '1234',
        },
        pages: [
          {
            checksumSha256: 'a'.repeat(64),
            fileName: '001.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
          },
          {
            checksumSha256: 'b'.repeat(64),
            fileName: '002.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 2048,
          },
        ],
        targetLanguage: 'fr',
      },
      {
        actor: {
          deviceId: 'device-1',
          licenseId: 'license-1',
        },
        dbClient: mockDb as never,
      }
    );

    expect(result.job.status).toBe('completed');
    expect(mockDb.translationResultCache.findFirst).toHaveBeenCalledOnce();
    expect(mockDb.translationResultCache.update).toHaveBeenCalledOnce();
  });

  it('rejects job creation before upload when tokens are insufficient', async () => {
    mockDb.tokenLedger.aggregate.mockResolvedValue({
      _sum: {
        deltaTokens: 4,
      },
    });

    await expect(
      createTranslationJob(
        {
          pages: [
            {
              fileName: '001.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 1024,
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
      )
    ).rejects.toMatchObject({
      code: 'insufficient_tokens',
      statusCode: 409,
    });

    expect(mockDb.$transaction).not.toHaveBeenCalled();
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
              reservedTokens: 25,
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
        now: new Date('2026-03-20T10:05:00.000Z'),
        scheduleProcessing,
      }
    );

    expect(result.status).toBe('queued');
    expect(result.reservedTokens).toBe(25);
    expect(mockDb.tokenLedger.create).toHaveBeenCalledOnce();
    expect(scheduleProcessing).toHaveBeenCalledWith('job-2');
  });

  it('completes a fully uploaded job immediately when a cached result exists', async () => {
    mockDb.translationJob.findUnique.mockResolvedValue(
      buildJobRecord({
        id: 'job-cache-hit',
        objectChecksums: ['a'.repeat(64), 'b'.repeat(64)],
        objectKeys: [
          'jobs/job-cache-hit/uploads/0001-first.jpg',
          'jobs/job-cache-hit/uploads/0002-second.jpg',
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
    mockDb.translationResultCache.findUnique.mockResolvedValue({
      bucketName: 'results',
      cacheKey: 'cache-key',
      objectKey:
        'cache/translation-results/cache-key/translation-manifest.json',
    });
    mockGetTranslationJobResultManifest.mockResolvedValue({
      completedAt: new Date('2026-03-20T09:00:00.000Z'),
      deviceId: 'device-original',
      jobId: 'job-original',
      licenseId: 'license-original',
      pageCount: 2,
      pageOrder: ['old-001.jpg', 'old-002.jpg'],
      pages: {
        'old-001.jpg': {
          blocks: [],
          imgHeight: 100,
          imgWidth: 80,
          sourceLanguage: 'ja',
          targetLanguage: 'fr',
          translatorType: 'gemini',
        },
        'old-002.jpg': {
          blocks: [
            {
              angle: 0,
              height: 10,
              symHeight: 5,
              symWidth: 5,
              text: 'hello',
              translation: 'bonjour',
              width: 20,
              x: 1,
              y: 2,
            },
          ],
          imgHeight: 100,
          imgWidth: 80,
          sourceLanguage: 'ja',
          targetLanguage: 'fr',
          translatorType: 'gemini',
        },
      },
      sourceLanguage: 'ja',
      targetLanguage: 'fr',
      translatorType: 'gemini',
      version: '2026-03-20.phase11.v1',
    });
    mockPutTranslationJobResultManifest.mockResolvedValue({
      bucketName: 'results',
      objectKey: 'jobs/job-cache-hit/results/translation-manifest.json',
    });
    mockDb.$transaction.mockImplementation(async (callback) => {
      const tx = {
        jobAsset: {
          create: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
        tokenLedger: {
          create: mockDb.tokenLedger.create,
        },
        translationJob: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(
            buildJobRecord({
              completedAt: new Date('2026-03-20T10:05:00.000Z'),
              id: 'job-cache-hit',
              objectChecksums: ['a'.repeat(64), 'b'.repeat(64)],
              objectKeys: [
                'jobs/job-cache-hit/uploads/0001-first.jpg',
                'jobs/job-cache-hit/uploads/0002-second.jpg',
              ],
              pageCount: 2,
              sourceLanguage: 'ja',
              spentTokens: 25,
              status: 'completed',
              uploadCompletedAt: new Date('2026-03-20T10:05:00.000Z'),
            })
          ),
          update: vi.fn(),
        },
        translationResultCache: {
          update: mockDb.translationResultCache.update,
        },
      };

      return await callback(tx);
    });

    const scheduleProcessing = vi.fn();
    const result = await completeTranslationJobUpload(
      { jobId: 'job-cache-hit' },
      {
        actor: {
          deviceId: 'device-1',
          licenseId: 'license-1',
        },
        dbClient: mockDb as never,
        now: new Date('2026-03-20T10:05:00.000Z'),
        scheduleProcessing,
      }
    );

    expect(result.status).toBe('completed');
    expect(result.spentTokens).toBe(25);
    expect(scheduleProcessing).not.toHaveBeenCalled();
    expect(mockPerformHostedOcr).not.toHaveBeenCalled();
    expect(mockPerformHostedTranslation).not.toHaveBeenCalled();
    expect(mockPutTranslationJobResultManifest).toHaveBeenCalledOnce();
    expect(mockDb.translationResultCache.update).toHaveBeenCalledOnce();
  });

  it('processes a queued job and stores the manifest', async () => {
    mockDb.$transaction
      .mockImplementationOnce(async (callback) => {
        const tx = {
          translationJob: {
            findUnique: vi.fn().mockResolvedValue(
              buildJobRecord({
                id: 'job-3',
                objectChecksums: ['c'.repeat(64)],
                pageCount: 1,
                reservedTokens: 25,
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
    mockPutTranslationResultCacheManifest.mockResolvedValue({
      bucketName: 'results',
      objectKey:
        'cache/translation-results/cache-key/translation-manifest.json',
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
    expect(mockPutTranslationResultCacheManifest).toHaveBeenCalledOnce();
    expect(mockDb.translationResultCache.upsert).toHaveBeenCalledOnce();
  });

  it('keeps pages with no OCR blocks out of the translation request', async () => {
    mockDb.$transaction
      .mockImplementationOnce(async (callback) => {
        const tx = {
          translationJob: {
            findUnique: vi.fn().mockResolvedValue(
              buildJobRecord({
                id: 'job-empty-pages',
                objectKeys: [
                  'jobs/job/uploads/0001-001.jpg',
                  'jobs/job/uploads/0002-002.jpg',
                ],
                pageCount: 2,
                reservedTokens: 25,
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
    mockPerformHostedOcr
      .mockResolvedValueOnce({
        blocks: [],
        imgHeight: 100,
        imgWidth: 80,
        provider: 'google_cloud_vision',
        providerModel: 'TEXT_DETECTION',
        providerRequestId: 'ocr-empty',
        sourceLanguage: 'auto',
        usage: {
          inputTokens: null,
          latencyMs: 100,
          outputTokens: null,
          pageCount: 1,
          providerRequestId: 'ocr-empty',
          requestCount: 1,
        },
      })
      .mockResolvedValueOnce({
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
        providerRequestId: 'ocr-text',
        sourceLanguage: 'ja',
        usage: {
          inputTokens: null,
          latencyMs: 100,
          outputTokens: null,
          pageCount: 1,
          providerRequestId: 'ocr-text',
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
          pageKey: '002.jpg',
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
      objectKey: 'jobs/job-empty-pages/results/translation-manifest.json',
    });

    const result = await processTranslationJob(
      { jobId: 'job-empty-pages' },
      {
        dbClient: mockDb as never,
        log: mockLogger,
      }
    );

    expect(mockPerformHostedTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: [
          {
            blocks: [{ text: 'hello' }],
            pageKey: '002.jpg',
          },
        ],
      })
    );
    expect(result?.pages['001.jpg']?.blocks).toEqual([]);
    expect(result?.pages['002.jpg']?.blocks[0]?.translation).toBe('bonjour');
  });

  it('maps batched OCR blocks back to original page coordinates', async () => {
    mockDb.$transaction
      .mockImplementationOnce(async (callback) => {
        const tx = {
          translationJob: {
            findUnique: vi.fn().mockResolvedValue(
              buildJobRecord({
                id: 'job-batched-ocr',
                objectKeys: [
                  'jobs/job/uploads/0001-001.jpg',
                  'jobs/job/uploads/0002-002.jpg',
                ],
                pageCount: 2,
                reservedTokens: 25,
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

    const firstPage = await sharp({
      create: {
        background: '#ffffff',
        channels: 3,
        height: 20,
        width: 10,
      },
    })
      .png()
      .toBuffer();
    const secondPage = await sharp({
      create: {
        background: '#ffffff',
        channels: 3,
        height: 20,
        width: 20,
      },
    })
      .png()
      .toBuffer();

    mockGetTranslationJobPageUpload
      .mockResolvedValueOnce({ blob: new Blob([new Uint8Array(firstPage)]) })
      .mockResolvedValueOnce({ blob: new Blob([new Uint8Array(secondPage)]) });
    mockPerformHostedOcr.mockResolvedValue({
      blocks: [
        {
          angle: 0,
          height: 4,
          symHeight: 4,
          symWidth: 3,
          text: 'top',
          width: 5,
          x: 7,
          y: 5,
        },
        {
          angle: 0,
          height: 4,
          symHeight: 4,
          symWidth: 3,
          text: 'bottom',
          width: 5,
          x: 1,
          y: 25,
        },
      ],
      imgHeight: 40,
      imgWidth: 20,
      provider: 'google_cloud_vision',
      providerModel: 'TEXT_DETECTION',
      providerRequestId: 'ocr-batch',
      sourceLanguage: 'ja',
      usage: {
        inputTokens: null,
        latencyMs: 100,
        outputTokens: null,
        pageCount: 1,
        providerRequestId: 'ocr-batch',
        requestCount: 1,
      },
    });
    mockPerformHostedTranslation.mockResolvedValue({
      pages: [
        {
          blocks: [
            {
              index: 0,
              sourceText: 'top',
              translation: 'haut',
            },
          ],
          pageKey: '001.jpg',
        },
        {
          blocks: [
            {
              index: 0,
              sourceText: 'bottom',
              translation: 'bas',
            },
          ],
          pageKey: '002.jpg',
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
        providerRequestId: 'tr-batch',
        requestCount: 1,
        stopReason: 'stop',
      },
    });
    mockPutTranslationJobResultManifest.mockResolvedValue({
      bucketName: 'results',
      objectKey: 'jobs/job-batched-ocr/results/translation-manifest.json',
    });

    const result = await processTranslationJob(
      { jobId: 'job-batched-ocr' },
      {
        dbClient: mockDb as never,
        log: mockLogger,
      }
    );

    expect(mockPerformHostedOcr).toHaveBeenCalledOnce();
    expect(mockPerformHostedOcr).toHaveBeenCalledWith(
      expect.objectContaining({
        imageHeight: 40,
        imageWidth: 20,
        pageCount: 2,
      })
    );
    expect(mockPerformHostedTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: [
          {
            blocks: [{ text: 'top' }],
            pageKey: '001.jpg',
          },
          {
            blocks: [{ text: 'bottom' }],
            pageKey: '002.jpg',
          },
        ],
      })
    );
    expect(result?.pages['001.jpg']?.blocks[0]).toEqual(
      expect.objectContaining({
        text: 'top',
        translation: 'haut',
        x: 2,
        y: 5,
      })
    );
    expect(result?.pages['002.jpg']?.blocks[0]).toEqual(
      expect.objectContaining({
        text: 'bottom',
        translation: 'bas',
        x: 1,
        y: 5,
      })
    );
  });

  it('coalesces close OCR line fragments before translation and manifest merge', async () => {
    mockDb.$transaction
      .mockImplementationOnce(async (callback) => {
        const tx = {
          translationJob: {
            findUnique: vi.fn().mockResolvedValue(
              buildJobRecord({
                id: 'job-coalesce-lines',
                pageCount: 1,
                reservedTokens: 25,
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
          height: 43,
          symHeight: 17,
          symWidth: 10.625,
          text: 'WAS THAT LIGHTNING STRIKE IN',
          width: 191,
          x: 134,
          y: 0,
        },
        {
          angle: 0,
          height: 69,
          symHeight: 16.333334,
          symWidth: 11.4375,
          text: 'THE SOUTH OF THE CITY EARLIER CAUSED BY YOU?',
          width: 189,
          x: 135,
          y: 27,
        },
        {
          angle: 0,
          height: 120,
          symHeight: 17,
          symWidth: 11,
          text: 'FAINTLY, THERE WERE ACTUALLY RULES VAGUELY HIDDEN WITHIN IT. I AM VERY CURIOUS~',
          width: 208,
          x: 263,
          y: 129,
        },
      ],
      imgHeight: 1000,
      imgWidth: 800,
      provider: 'google_cloud_vision',
      providerModel: 'TEXT_DETECTION',
      providerRequestId: 'ocr-lines',
      sourceLanguage: 'en',
      usage: {
        inputTokens: null,
        latencyMs: 100,
        outputTokens: null,
        pageCount: 1,
        providerRequestId: 'ocr-lines',
        requestCount: 1,
      },
    });
    mockPerformHostedTranslation.mockResolvedValue({
      pages: [
        {
          blocks: [
            {
              index: 0,
              sourceText:
                'WAS THAT LIGHTNING STRIKE IN THE SOUTH OF THE CITY EARLIER CAUSED BY YOU?',
              translation: 'Arabic merged question',
            },
            {
              index: 1,
              sourceText:
                'FAINTLY, THERE WERE ACTUALLY RULES VAGUELY HIDDEN WITHIN IT. I AM VERY CURIOUS~',
              translation: 'Arabic second bubble',
            },
          ],
          pageKey: '001.jpg',
        },
      ],
      promptProfile: 'manga',
      promptVersion: '2026-03-20.v1',
      provider: 'gemini',
      providerModel: 'gemini-test',
      sourceLanguage: 'en',
      targetLanguage: 'ar',
      usage: {
        finishReason: 'stop',
        inputTokens: 10,
        latencyMs: 200,
        outputTokens: 5,
        pageCount: 1,
        providerRequestId: 'tr-lines',
        requestCount: 1,
        stopReason: 'stop',
      },
    });
    mockPutTranslationJobResultManifest.mockResolvedValue({
      bucketName: 'results',
      objectKey: 'jobs/job-coalesce-lines/results/translation-manifest.json',
    });

    const result = await processTranslationJob(
      { jobId: 'job-coalesce-lines' },
      {
        dbClient: mockDb as never,
        log: mockLogger,
      }
    );

    expect(mockPerformHostedTranslation).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: [
          {
            blocks: [
              {
                text: 'WAS THAT LIGHTNING STRIKE IN THE SOUTH OF THE CITY EARLIER CAUSED BY YOU?',
              },
              {
                text: 'FAINTLY, THERE WERE ACTUALLY RULES VAGUELY HIDDEN WITHIN IT. I AM VERY CURIOUS~',
              },
            ],
            pageKey: '001.jpg',
          },
        ],
      })
    );
    expect(result?.pages['001.jpg']?.blocks).toHaveLength(2);
    expect(result?.pages['001.jpg']?.blocks[0]).toEqual(
      expect.objectContaining({
        height: 96,
        text: 'WAS THAT LIGHTNING STRIKE IN THE SOUTH OF THE CITY EARLIER CAUSED BY YOU?',
        translation: 'Arabic merged question',
        width: 191,
        x: 134,
        y: 0,
      })
    );
    expect(result?.pages['001.jpg']?.blocks[1]).toEqual(
      expect.objectContaining({
        text: 'FAINTLY, THERE WERE ACTUALLY RULES VAGUELY HIDDEN WITHIN IT. I AM VERY CURIOUS~',
        translation: 'Arabic second bubble',
      })
    );
  });
});

function buildJobRecord(
  overrides: Partial<{
    completedAt: Date | null;
    chapterCacheKey: string | null;
    chapterIdentity: unknown;
    createdAt: Date;
    failedAt: Date | null;
    id: string;
    objectChecksums: Array<string | null>;
    objectKeys: Array<string | null>;
    pageCount: number;
    queuedAt: Date | null;
    reservedTokens: number;
    resolvedOcrProvider: 'google_cloud_vision' | null;
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
  const objectChecksums =
    overrides.objectChecksums ?? objectKeys.map(() => null);
  const assets = objectKeys.map((objectKey, index) => ({
    bucketName: objectKey ? 'uploads' : null,
    checksumSha256: objectChecksums[index] ?? null,
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
    chapterCacheKey: overrides.chapterCacheKey ?? null,
    chapterIdentity: overrides.chapterIdentity ?? null,
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
    resolvedOcrProvider: overrides.resolvedOcrProvider ?? 'google_cloud_vision',
    resolvedTranslationProvider: 'gemini',
    sourceLanguage: overrides.sourceLanguage ?? 'auto',
    spentTokens: overrides.spentTokens ?? 0,
    startedAt: overrides.startedAt ?? null,
    status: overrides.status ?? 'awaiting_upload',
    targetLanguage: overrides.targetLanguage ?? 'fr',
    uploadCompletedAt: overrides.uploadCompletedAt ?? null,
  };
}
