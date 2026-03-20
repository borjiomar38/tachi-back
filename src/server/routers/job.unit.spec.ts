import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import jobRouter from '@/server/routers/job';
import {
  mockDb,
  mockGetSession,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const now = new Date('2026-03-19T21:00:00.000Z');

describe('job router', () => {
  describe('list', () => {
    it('returns operational job summaries', async () => {
      mockDb.translationJob.findMany.mockResolvedValue([
        {
          assets: [{ id: 'asset-1', objectKey: 'jobs/job-1/uploads/0001.png' }],
          completedAt: null,
          createdAt: now,
          device: {
            installationId: 'install-123',
          },
          errorCode: null,
          errorMessage: null,
          failedAt: null,
          id: 'job-1',
          license: {
            key: 'LIC-123',
          },
          pageCount: 1,
          providerUsages: [{ id: 'usage-1' }],
          queuedAt: now,
          requestedOcrProvider: 'google_cloud_vision',
          requestedTranslationProvider: 'gemini',
          reservedTokens: 10,
          resolvedOcrProvider: 'google_cloud_vision',
          resolvedTranslationProvider: 'gemini',
          sourceLanguage: 'ja',
          spentTokens: 0,
          startedAt: null,
          status: 'queued',
          targetLanguage: 'en',
          updatedAt: now,
          uploadCompletedAt: now,
        },
      ]);
      mockDb.translationJob.count.mockResolvedValue(1);

      const result = await call(jobRouter.list, {
        limit: 25,
        searchTerm: '',
        status: 'all',
      });

      expect(result).toEqual({
        items: [
          {
            completedAt: null,
            createdAt: now,
            durationMs: null,
            errorCode: null,
            errorMessage: null,
            failedAt: null,
            id: 'job-1',
            installationId: 'install-123',
            licenseKey: 'LIC-123',
            pageCount: 1,
            providerUsageCount: 1,
            queuedAt: now,
            requestedOcrProvider: 'google_cloud_vision',
            requestedTranslationProvider: 'gemini',
            reservedTokens: 10,
            resolvedOcrProvider: 'google_cloud_vision',
            resolvedTranslationProvider: 'gemini',
            sourceLanguage: 'ja',
            spentTokens: 0,
            startedAt: null,
            status: 'queued',
            targetLanguage: 'en',
            uploadedPageCount: 1,
          },
        ],
        total: 1,
      });
    });

    it('requires job read permission', async () => {
      mockDb.translationJob.findMany.mockResolvedValue([]);
      mockDb.translationJob.count.mockResolvedValue(0);

      await call(jobRouter.list, {
        limit: 25,
        searchTerm: '',
        status: 'all',
      });

      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: {
            job: ['read'],
          },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('getById', () => {
    it('returns detailed job operations data', async () => {
      mockDb.translationJob.findUnique.mockResolvedValue({
        assets: [
          {
            bucketName: 'uploads',
            createdAt: now,
            id: 'asset-1',
            kind: 'page_upload',
            metadata: null,
            mimeType: 'image/png',
            objectKey: 'jobs/job-1/uploads/0001.png',
            originalFileName: '0001.png',
            pageNumber: 1,
            sizeBytes: 1024,
          },
        ],
        completedAt: now,
        createdAt: now,
        device: {
          appBuild: '120',
          appVersion: '1.2.0',
          id: 'device-1',
          installationId: 'install-123',
          lastSeenAt: now,
          platform: 'android',
          status: 'active',
        },
        errorCode: null,
        errorMessage: null,
        failedAt: null,
        id: 'job-1',
        ledgerEntries: [
          {
            createdAt: now,
            deltaTokens: -10,
            description: 'Spent tokens',
            id: 'ledger-1',
            status: 'posted',
            type: 'job_spend',
          },
        ],
        license: {
          id: 'license-1',
          key: 'LIC-123',
          ownerEmail: 'customer@example.com',
          status: 'active',
        },
        pageCount: 1,
        providerUsages: [
          {
            costMicros: 2500n,
            createdAt: now,
            errorCode: null,
            id: 'usage-1',
            inputTokens: 100,
            latencyMs: 1200,
            metadata: null,
            modelName: 'gemini-test',
            outputTokens: 200,
            pageCount: 1,
            provider: 'gemini',
            requestCount: 1,
            stage: 'translation',
            success: true,
          },
        ],
        queuedAt: now,
        requestedOcrProvider: 'google_cloud_vision',
        requestedTranslationProvider: 'gemini',
        reservedTokens: 10,
        resolvedOcrProvider: 'google_cloud_vision',
        resolvedTranslationProvider: 'gemini',
        resultPayloadVersion: '2026-03-20.phase11.v1',
        resultSummary: {
          pageCount: 1,
        },
        sourceLanguage: 'ja',
        spentTokens: 10,
        startedAt: now,
        status: 'completed',
        targetLanguage: 'en',
        updateAt: now,
        updatedAt: now,
        uploadCompletedAt: now,
      });

      const result = await call(jobRouter.getById, {
        id: 'job-1',
      });

      expect(result.id).toBe('job-1');
      expect(result.license.key).toBe('LIC-123');
      expect(result.device.installationId).toBe('install-123');
      expect(result.providerUsages[0]).toMatchObject({
        costMicros: '2500',
        provider: 'gemini',
        stage: 'translation',
        success: true,
      });
      expect(result.lifecycleEvents.map((event) => event.type)).toContain(
        'completed'
      );
    });

    it('throws NOT_FOUND when the job does not exist', async () => {
      mockDb.translationJob.findUnique.mockResolvedValue(null);

      await expect(
        call(jobRouter.getById, {
          id: 'missing-job',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  it('throws UNAUTHORIZED when job routes are called without a session', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(
      call(jobRouter.list, {
        limit: 25,
        searchTerm: '',
        status: 'all',
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});
