import { call } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';

const mockGetPublicMobileAppUpdatePolicy = vi.hoisted(() => vi.fn());

vi.mock('@/server/mobile-update-policy', () => ({
  getPublicMobileAppUpdatePolicy: mockGetPublicMobileAppUpdatePolicy,
}));

import deviceRouter from '@/server/routers/device';
import {
  mockDb,
  mockGetSession,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const now = new Date('2026-03-19T20:00:00.000Z');

describe('device router', () => {
  describe('getVersionSummary', () => {
    it('summarizes installed version groups against the update policy', async () => {
      mockGetPublicMobileAppUpdatePolicy.mockResolvedValue({
        channel: 'standard-release',
        checkedAt: '2026-05-12T07:00:00.000Z',
        currentVersionCode: 0,
        currentVersionName: null,
        forceUpdate: true,
        latestVersionCode: 27,
        latestVersionName: '0.17.17',
        message: 'Update to continue.',
        minimumSupportedVersionCode: 25,
        platform: 'android',
        releaseUrl: 'https://example.com/releases',
        requiresUpdate: false,
        updateUrl: 'https://example.com/app.apk',
      });
      mockDb.device.groupBy
        .mockResolvedValueOnce([
          {
            appBuild: '27',
            appVersion: '0.17.17',
            _count: {
              _all: 3,
            },
            _max: {
              lastSeenAt: now,
            },
            _min: {
              createdAt: new Date('2026-05-11T12:00:00.000Z'),
            },
          },
          {
            appBuild: '20',
            appVersion: '0.17.10',
            _count: {
              _all: 2,
            },
            _max: {
              lastSeenAt: new Date('2026-05-10T12:00:00.000Z'),
            },
            _min: {
              createdAt: new Date('2026-05-09T12:00:00.000Z'),
            },
          },
          {
            appBuild: null,
            appVersion: null,
            _count: {
              _all: 1,
            },
            _max: {
              lastSeenAt: null,
            },
            _min: {
              createdAt: new Date('2026-05-08T12:00:00.000Z'),
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            appBuild: '27',
            appVersion: '0.17.17',
            _count: {
              _all: 2,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            appBuild: '27',
            appVersion: '0.17.17',
            _count: {
              _all: 1,
            },
          },
          {
            appBuild: '20',
            appVersion: '0.17.10',
            _count: {
              _all: 1,
            },
          },
        ]);

      const result = await call(deviceRouter.getVersionSummary, undefined);

      expect(result.stats).toEqual({
        activeInstallCount: 2,
        latestInstallCount: 3,
        linkedInstallCount: 2,
        outdatedInstallCount: 2,
        totalInstallCount: 6,
        unknownVersionInstallCount: 1,
        unsupportedInstallCount: 2,
        versionCount: 3,
      });
      expect(
        result.versions.map((version) => ({
          appBuild: version.appBuild,
          appVersion: version.appVersion,
          installCount: version.installCount,
          status: version.status,
        }))
      ).toEqual([
        {
          appBuild: '27',
          appVersion: '0.17.17',
          installCount: 3,
          status: 'latest',
        },
        {
          appBuild: '20',
          appVersion: '0.17.10',
          installCount: 2,
          status: 'unsupported',
        },
        {
          appBuild: null,
          appVersion: null,
          installCount: 1,
          status: 'unknown',
        },
      ]);
      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: {
            device: ['read'],
          },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('getById', () => {
    it('returns the device detail with active and historical license bindings', async () => {
      mockDb.device.findUnique.mockResolvedValue({
        appBuild: '120',
        appVersion: '1.2.0',
        createdAt: now,
        id: 'device-1',
        installationId: 'install-123',
        lastIpAddress: '127.0.0.1',
        lastSeenAt: now,
        jobs: [
          {
            chapterIdentity: {
              chapterName: 'Chapter 97',
              chapterUrl: '/manga/absolute-regression/chapter-97',
              mangaTitle: 'Absolute Regression',
              mangaUrl: '/manga/absolute-regression',
              sourceName: 'Asura',
            },
            completedAt: now,
            createdAt: new Date('2026-03-19T19:45:00.000Z'),
            failedAt: null,
            id: 'job-1',
            pageCount: 12,
            sourceLanguage: 'ko',
            spentTokens: 100,
            startedAt: new Date('2026-03-19T19:50:00.000Z'),
            status: 'completed',
            targetLanguage: 'en',
            updatedAt: now,
          },
        ],
        ledgerEntries: [
          {
            createdAt: new Date('2026-03-19T19:30:00.000Z'),
            deltaTokens: -5,
            id: 'ledger-1',
            metadata: {
              chapterCount: 2,
              chapters: [
                {
                  name: 'Chapter 4',
                  number: '4',
                  url: '/chapter-4',
                },
              ],
              mangaTitle: 'Omniscient Reader',
              mangaUrl: '/manga/omniscient-reader',
              sourceLanguage: 'ko',
              sourceName: 'Webtoon',
              targetLanguage: 'fr',
            },
            status: 'posted',
            type: 'job_spend',
          },
        ],
        licenseBindings: [
          {
            boundAt: now,
            id: 'binding-1',
            license: {
              id: 'license-1',
              key: 'LIC-123',
              ownerEmail: 'customer@example.com',
              status: 'active',
            },
            status: 'active',
            unboundAt: null,
          },
          {
            boundAt: new Date('2026-03-18T20:00:00.000Z'),
            id: 'binding-2',
            license: {
              id: 'license-2',
              key: 'LIC-OLD',
              ownerEmail: null,
              status: 'revoked',
            },
            status: 'revoked',
            unboundAt: now,
          },
        ],
        locale: 'en-US',
        metadata: {
          manufacturer: 'Google',
        },
        platform: 'android',
        status: 'active',
      });

      const result = await call(deviceRouter.getById, {
        deviceId: 'device-1',
      });

      expect(result).toEqual({
        activeLicense: {
          boundAt: now,
          id: 'license-1',
          key: 'LIC-123',
          ownerEmail: 'customer@example.com',
          status: 'active',
        },
        appBuild: '120',
        appVersion: '1.2.0',
        bindings: [
          {
            boundAt: now,
            key: 'LIC-123',
            licenseBindingId: 'binding-1',
            licenseId: 'license-1',
            licenseStatus: 'active',
            ownerEmail: 'customer@example.com',
            status: 'active',
            unboundAt: null,
          },
          {
            boundAt: new Date('2026-03-18T20:00:00.000Z'),
            key: 'LIC-OLD',
            licenseBindingId: 'binding-2',
            licenseId: 'license-2',
            licenseStatus: 'revoked',
            ownerEmail: null,
            status: 'revoked',
            unboundAt: now,
          },
        ],
        readingActivity: [
          {
            activityAt: now,
            chapterCount: 1,
            chapterName: 'Chapter 97',
            chapterNumber: '97',
            chapterUrl: '/manga/absolute-regression/chapter-97',
            chapters: [
              {
                name: 'Chapter 97',
                number: '97',
                url: '/manga/absolute-regression/chapter-97',
              },
            ],
            completedAt: now,
            createdAt: new Date('2026-03-19T19:45:00.000Z'),
            id: 'job:job-1',
            jobId: 'job-1',
            ledgerEntryId: null,
            mangaTitle: 'Absolute Regression',
            mangaUrl: '/manga/absolute-regression',
            pageCount: 12,
            sourceLanguage: 'ko',
            sourceName: 'Asura',
            sourceType: 'chapter_translation',
            spentTokens: 100,
            status: 'completed',
            targetLanguage: 'en',
          },
          {
            activityAt: new Date('2026-03-19T19:30:00.000Z'),
            chapterCount: 2,
            chapterName: 'Chapter 4',
            chapterNumber: '4',
            chapterUrl: '/chapter-4',
            chapters: [
              {
                name: 'Chapter 4',
                number: '4',
                url: '/chapter-4',
              },
            ],
            completedAt: new Date('2026-03-19T19:30:00.000Z'),
            createdAt: new Date('2026-03-19T19:30:00.000Z'),
            id: 'ledger:ledger-1',
            jobId: null,
            ledgerEntryId: 'ledger-1',
            mangaTitle: 'Omniscient Reader',
            mangaUrl: '/manga/omniscient-reader',
            pageCount: null,
            sourceLanguage: 'ko',
            sourceName: 'Webtoon',
            sourceType: 'manga_page_translation',
            spentTokens: 5,
            status: 'posted',
            targetLanguage: 'fr',
          },
        ],
        createdAt: now,
        id: 'device-1',
        installationId: 'install-123',
        lastIpAddress: '127.0.0.1',
        lastSeenAt: now,
        locale: 'en-US',
        metadata: {
          manufacturer: 'Google',
        },
        platform: 'android',
        status: 'active',
      });
    });

    it('requires device read permission', async () => {
      mockDb.device.findUnique.mockResolvedValue({
        appBuild: null,
        appVersion: null,
        createdAt: now,
        id: 'device-1',
        installationId: 'install-123',
        lastIpAddress: null,
        lastSeenAt: null,
        jobs: [],
        ledgerEntries: [],
        licenseBindings: [],
        locale: null,
        metadata: null,
        platform: 'android',
        status: 'pending',
      });

      await call(deviceRouter.getById, {
        deviceId: 'device-1',
      });

      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: {
            device: ['read'],
          },
          userId: mockUser.id,
        },
      });
    });

    it('throws NOT_FOUND when the device does not exist', async () => {
      mockDb.device.findUnique.mockResolvedValue(null);

      await expect(
        call(deviceRouter.getById, {
          deviceId: 'missing-device',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  it('throws UNAUTHORIZED for device reads when there is no staff session', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(
      call(deviceRouter.getById, {
        deviceId: 'device-1',
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});
