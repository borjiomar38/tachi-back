import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resolveExtensionAccess,
  setExtensionBlocked,
} from '@/server/services/extension-access-policy';

describe('extension access policy', () => {
  const findUnique = vi.fn();
  const upsert = vi.fn();
  const deleteMany = vi.fn();
  const dbClient = {
    extensionBlock: {
      deleteMany,
      findUnique,
      upsert,
    },
  };

  beforeEach(() => {
    deleteMany.mockReset();
    findUnique.mockReset();
    upsert.mockReset();
  });

  it('allows packages that have no global block', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      resolveExtensionAccess(
        { packageName: 'eu.kanade.tachiyomi.extension.en.webtoon' },
        { dbClient: dbClient as never }
      )
    ).resolves.toMatchObject({
      allowed: true,
      packageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
    });
  });

  it('creates a reusable global package block', async () => {
    const now = new Date('2026-07-19T15:00:00.000Z');
    upsert.mockResolvedValue({
      blockedAt: now,
      extensionName: 'Webtoon',
      packageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
      reason: null,
    });

    const result = await setExtensionBlocked(
      {
        blocked: true,
        extensionName: 'Webtoon',
        packageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
      },
      { dbClient: dbClient as never, now }
    );

    expect(result.blocked).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ blockedAt: now }),
        where: {
          packageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
        },
      })
    );
  });

  it('unblocks the whole package', async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      setExtensionBlocked(
        {
          blocked: false,
          packageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
        },
        { dbClient: dbClient as never }
      )
    ).resolves.toEqual({
      blocked: false,
      packageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
      removed: true,
    });
  });
});
