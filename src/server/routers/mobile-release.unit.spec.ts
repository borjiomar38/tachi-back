import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import { mobileReleaseRouter } from '@/server/routers/mobile-release';
import {
  mockDb,
  mockGetSession,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const release = (code: number) => ({
  id: `release-${code}`,
  versionCode: code,
  versionName: `1.0.${code}`,
  platform: 'android',
  channel: 'standard-release',
  createdAt: new Date(),
  publishedAt: null,
  releaseInfo: {
    schemaVersion: 1,
    versionCode: code,
    versionName: `1.0.${code}`,
    defaultLocale: 'en',
    locales: {
      en: {
        title: 'Approved title',
        summary: 'Approved summary',
        highlights: [],
      },
    },
  },
});

describe('backoffice release history', () => {
  it('uses bounded descending keyset pagination and returns archived copy', async () => {
    mockDb.mobileAppRelease.findMany.mockResolvedValue([
      release(54),
      release(53),
      release(52),
    ]);
    const result = await call(mobileReleaseRouter.list, {
      limit: 2,
      beforeVersionCode: 55,
    });
    expect(result.items.map((item) => item.versionCode)).toEqual([54, 53]);
    expect(result.nextCursor).toBe(53);
    expect(mockDb.mobileAppRelease.findMany).toHaveBeenCalledWith({
      where: {
        platform: 'android',
        channel: 'standard-release',
        versionCode: { lt: 55 },
      },
      orderBy: { versionCode: 'desc' },
      take: 3,
    });
    expect(result.items[0]?.releaseInfo.locales.en?.title).toBe(
      'Approved title'
    );
  });

  it('returns a final empty page', async () => {
    mockDb.mobileAppRelease.findMany.mockResolvedValue([]);
    expect(await call(mobileReleaseRouter.list, {})).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('rejects unauthenticated access', async () => {
    mockGetSession.mockResolvedValue(null);
    await expect(call(mobileReleaseRouter.list, {})).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(mockDb.mobileAppRelease.findMany).not.toHaveBeenCalled();
  });

  it('requires device read permission', async () => {
    mockUserHasPermission.mockResolvedValue({ success: false, error: false });
    await expect(call(mobileReleaseRouter.list, {})).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockDb.mobileAppRelease.findMany).not.toHaveBeenCalled();
  });

  it('rejects unbounded pages', async () => {
    await expect(
      call(mobileReleaseRouter.list, { limit: 1000 })
    ).rejects.toThrow();
  });
});
