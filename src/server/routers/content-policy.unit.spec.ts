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
