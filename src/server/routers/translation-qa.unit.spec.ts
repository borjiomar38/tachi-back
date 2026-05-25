import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';

const mockGetTranslationJobJsonAsset = vi.hoisted(() => vi.fn());

vi.mock('@/server/jobs/storage', () => ({
  getTranslationJobJsonAsset: mockGetTranslationJobJsonAsset,
}));

import {
  mockDb,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';
import translationQaRouter from '@/server/routers/translation-qa';

const now = new Date('2026-05-25T02:00:00.000Z');

describe('translation QA router', () => {
  describe('list', () => {
    it('returns QA reports with aggregate statistics', async () => {
      mockDb.jobAsset.findMany.mockResolvedValue([
        {
          bucketName: 'test-results',
          createdAt: now,
          id: 'qa-asset-1',
          job: {
            chapterIdentity: {
              chapterName: 'Chapter 12',
              chapterUrl: 'https://example.com/manga/chapter-12',
              mangaTitle: 'Example Manhwa',
              sourceName: 'Example Source',
            },
            completedAt: now,
            createdAt: now,
            id: 'job-1',
            pageCount: 3,
            sourceLanguage: 'zh',
            targetLanguage: 'en',
          },
          objectKey: 'jobs/job-1/debug/translation-qa-report.json',
        },
        {
          bucketName: null,
          createdAt: now,
          id: 'qa-asset-2',
          job: {
            chapterIdentity: null,
            completedAt: now,
            createdAt: now,
            id: 'job-2',
            pageCount: 2,
            sourceLanguage: 'ko',
            targetLanguage: 'fr',
          },
          objectKey: null,
        },
      ]);
      mockDb.jobAsset.count.mockResolvedValue(2);
      mockGetTranslationJobJsonAsset.mockResolvedValue({
        codexReport: {
          cleanupDecision: {
            analysisCompleted: true,
            canDeleteOriginalUploads: false,
          },
          inspectionMode: 'visual_and_manifest',
          issues: [
            {
              evidence: 'Brand text translated into the wrong name.',
              kind: 'translation_quality',
              message: 'Tencent brand text was mistranslated.',
              pageKey: 'page-1',
              severity: 'critical',
            },
            {
              blockIndex: 4,
              kind: 'ocr_merge',
              message: 'A sentence was split across bubbles.',
              pageKey: 'page-2',
              severity: 'warning',
            },
          ],
          nextTrainingSignals: ['Keep publisher brand names untranslated.'],
          summary: {
            issueCount: 2,
            short: 'Two QA issues need review.',
            status: 'issues_found',
          },
          version: 'translation-qa-codex-report.v1',
        },
        createdAt: '2026-05-25T02:01:00.000Z',
        job: {
          id: 'job-1',
          pageCount: 3,
          sourceLanguage: 'zh',
          targetLanguage: 'en',
        },
        version: 'translation-qa-report.v1',
      });

      const result = await call(translationQaRouter.list, {
        limit: 50,
        status: 'all',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        assetId: 'qa-asset-1',
        cleanupCanDeleteOriginalUploads: false,
        criticalIssueCount: 1,
        issueCount: 2,
        jobId: 'job-1',
        status: 'issues_found',
        summary: 'Two QA issues need review.',
        warningIssueCount: 1,
      });
      expect(result.items[0]?.chapterIdentity).toMatchObject({
        chapterName: 'Chapter 12',
        mangaTitle: 'Example Manhwa',
      });
      expect(result.items[1]).toMatchObject({
        assetId: 'qa-asset-2',
        status: 'unavailable',
      });
      expect(result.stats).toMatchObject({
        cleanupBlockedCount: 1,
        criticalIssueCount: 1,
        issueReportCount: 1,
        totalIssues: 2,
        totalReports: 2,
        unavailableReportCount: 1,
        visualReportCount: 1,
        warningIssueCount: 1,
      });
      expect(result.stats.topIssueKinds).toEqual([
        {
          count: 1,
          value: 'ocr_merge',
        },
        {
          count: 1,
          value: 'translation_quality',
        },
      ]);
    });

    it('requires job read permission', async () => {
      mockDb.jobAsset.findMany.mockResolvedValue([]);
      mockDb.jobAsset.count.mockResolvedValue(0);

      await call(translationQaRouter.list, {
        limit: 50,
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
});
