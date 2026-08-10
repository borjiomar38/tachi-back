import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import contentPolicyRouter from '@/server/routers/content-policy';
import {
  mockDb,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const now = new Date('2026-06-15T10:00:00.000Z');

describe('content policy router', () => {
  describe('pornography automation', () => {
    it('lists cached assessments with effective statuses and global counts', async () => {
      mockDb.mangaPornographyAssessment.findMany.mockResolvedValue([
        {
          attemptCount: 1,
          classifiedAt: now,
          extensionName: 'Example extension',
          extensionPackageName: 'com.example.extension',
          id: 'assessment-blocked',
          imageInputIncluded: true,
          lastErrorCode: null,
          lastSeenAt: now,
          mangaUrl: '/blocked',
          manualDecision: null,
          model: 'omni-moderation-2024-09-26',
          policyVersion: 'test-policy-v1',
          sexualScore: 0.98,
          sourceId: 'source-1',
          sourceName: 'Example source',
          status: 'completed',
          thumbnailUrl: 'https://cdn.example/blocked.jpg',
          title: 'Blocked example',
          updatedAt: now,
          verdict: 'block',
        },
        {
          attemptCount: 1,
          classifiedAt: now,
          extensionName: 'Example extension',
          extensionPackageName: 'com.example.extension',
          id: 'assessment-allowed',
          imageInputIncluded: true,
          lastErrorCode: null,
          lastSeenAt: now,
          mangaUrl: '/allowed',
          manualDecision: 'allow',
          model: 'omni-moderation-2024-09-26',
          policyVersion: 'test-policy-v1',
          sexualScore: 0.96,
          sourceId: 'source-1',
          sourceName: 'Example source',
          status: 'completed',
          thumbnailUrl: null,
          title: 'Manually allowed example',
          updatedAt: now,
          verdict: 'block',
        },
      ]);
      mockDb.mangaPornographyAssessment.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      const result = await call(contentPolicyRouter.pornographyAssessments, {
        limit: 50,
        status: 'all',
      });

      expect(result.counts).toEqual({
        allowed: 1,
        blocked: 1,
        errors: 0,
        pending: 0,
        review: 0,
        total: 2,
      });
      expect(result.items.map((item) => item.effectiveStatus)).toEqual([
        'blocked',
        'allowed',
      ]);
      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: { provider: ['read'] },
          userId: mockUser.id,
        },
      });
    });

    it('reads the environment default and persists a manager override', async () => {
      mockDb.appConfig.findUnique.mockResolvedValue(null);

      await expect(
        call(contentPolicyRouter.pornographyAutomationSettings, undefined)
      ).resolves.toEqual({
        defaultEnabled: true,
        enabled: true,
        updatedAt: null,
      });

      mockDb.appConfig.upsert.mockResolvedValue({ updatedAt: now });
      await expect(
        call(contentPolicyRouter.updatePornographyAutomationSettings, {
          enabled: false,
        })
      ).resolves.toEqual({
        defaultEnabled: true,
        enabled: false,
        updatedAt: now,
      });
      expect(mockDb.appConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            value: {
              enabled: false,
              updatedBy: mockUser.id,
            },
          },
        })
      );
      expect(mockUserHasPermission).toHaveBeenLastCalledWith({
        body: {
          permissions: { provider: ['update'] },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('context overviews', () => {
    it('returns license metadata with global blocked state', async () => {
      mockDb.appConfig.findUnique.mockResolvedValue({
        updatedAt: now,
        value: {
          blockedValues: [
            {
              field: 'genres',
              normalizedValue: 'action',
              value: 'Action',
            },
          ],
        },
      });
      mockDb.translationJob.findMany.mockResolvedValue([
        {
          chapterIdentity: {
            categories: ['Manhwa'],
            chapterUrl: 'https://example.test/chapter-1',
            genres: ['Action', 'Fantasy'],
            mangaTitle: 'Example',
          },
        },
        {
          chapterIdentity: {
            chapterUrl: 'https://example.test/chapter-2',
            genres: ['Action'],
            mangaTitle: 'Example',
            tags: ['Reincarnation'],
          },
        },
      ]);

      const result = await call(contentPolicyRouter.licenseOverview, {
        key: 'license-key',
      });

      expect(result.discoveredValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            count: 2,
            field: 'genres',
            isBlocked: true,
            value: 'Action',
          }),
          expect.objectContaining({
            field: 'tags',
            isBlocked: false,
            value: 'Reincarnation',
          }),
        ])
      );
      expect(result.manualMangaBlock).toBeNull();
    });
  });

  describe('metadataTranslationGate', () => {
    it('returns default explicit policy with discovered metadata values', async () => {
      mockDb.appConfig.findUnique.mockResolvedValue(null);
      mockDb.translationJob.findMany.mockResolvedValue([
        {
          chapterIdentity: {
            genres: ['Romance', 'Hentai'],
            tags: ['Martial Arts'],
          },
        },
      ]);
      mockDb.translationResultCache.findMany.mockResolvedValue([
        {
          chapterIdentity: {
            categories: ['Adventure'],
            contentRating: 'Teen',
          },
        },
      ]);
      mockDb.sourceDiscoveryResult.findMany.mockResolvedValue([
        {
          metadata: {
            rating: 'Mature',
            tags: ['Ecchi'],
          },
        },
      ]);

      const result = await call(
        contentPolicyRouter.metadataTranslationGate,
        undefined
      );

      expect(result.mode).toBe('default');
      expect(result.defaultValues).toEqual(result.blockedValues);
      expect(result.discoveredValues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'genres',
            isBlocked: true,
            normalizedValue: 'hentai',
            value: 'Hentai',
          }),
          expect.objectContaining({
            field: 'tags',
            isBlocked: false,
            normalizedValue: 'ecchi',
            value: 'Ecchi',
          }),
        ])
      );
      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: { provider: ['read'] },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('updateMetadataTranslationGate', () => {
    it('saves selected metadata values as the authoritative policy', async () => {
      mockDb.appConfig.findUnique.mockResolvedValue(null);
      mockDb.appConfig.upsert.mockResolvedValue({
        updatedAt: now,
        value: {
          blockedValues: [
            {
              field: 'genres',
              normalizedValue: 'publisher blocked',
              value: 'Publisher blocked',
            },
          ],
        },
      });
      mockDb.translationJob.findMany.mockResolvedValue([
        {
          chapterIdentity: {
            genres: ['Publisher blocked'],
          },
        },
      ]);
      mockDb.translationResultCache.findMany.mockResolvedValue([]);
      mockDb.sourceDiscoveryResult.findMany.mockResolvedValue([]);

      const result = await call(
        contentPolicyRouter.updateMetadataTranslationGate,
        {
          blockedValues: [
            {
              field: 'genres',
              normalizedValue: 'ignored-client-value',
              value: 'Publisher blocked',
            },
          ],
        }
      );

      expect(result.mode).toBe('saved');
      expect(result.blockedValues).toEqual([
        {
          field: 'genres',
          normalizedValue: 'publisher blocked',
          value: 'Publisher blocked',
        },
      ]);
      expect(mockDb.appConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            key: 'content_metadata_translation_block_policy',
          }),
          update: expect.objectContaining({
            value: {
              blockedValues: [
                {
                  field: 'genres',
                  normalizedValue: 'publisher blocked',
                  value: 'Publisher blocked',
                },
              ],
            },
          }),
        })
      );
      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: { provider: ['update'] },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('updateMetadataValueBlock', () => {
    it('unchecks a value in the authoritative global policy', async () => {
      mockDb.appConfig.findUnique.mockResolvedValue({
        updatedAt: now,
        value: {
          blockedValues: [
            {
              field: 'genres',
              normalizedValue: 'action',
              value: 'Action',
            },
            {
              field: 'tags',
              normalizedValue: 'publisher blocked',
              value: 'Publisher blocked',
            },
          ],
        },
      });
      mockDb.appConfig.upsert.mockResolvedValue({
        updatedAt: now,
        value: {
          blockedValues: [
            {
              field: 'tags',
              normalizedValue: 'publisher blocked',
              value: 'Publisher blocked',
            },
          ],
        },
      });
      mockDb.translationJob.findMany.mockResolvedValue([]);
      mockDb.translationResultCache.findMany.mockResolvedValue([]);
      mockDb.sourceDiscoveryResult.findMany.mockResolvedValue([]);

      const result = await call(contentPolicyRouter.updateMetadataValueBlock, {
        blocked: false,
        value: {
          field: 'genres',
          normalizedValue: 'action',
          value: 'Action',
        },
      });

      expect(result.blockedValues).toEqual([
        {
          field: 'tags',
          normalizedValue: 'publisher blocked',
          value: 'Publisher blocked',
        },
      ]);
      expect(mockDb.appConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            value: {
              blockedValues: [
                {
                  field: 'tags',
                  normalizedValue: 'publisher blocked',
                  value: 'Publisher blocked',
                },
              ],
            },
          },
        })
      );
    });
  });
});
