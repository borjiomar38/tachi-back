import { beforeEach, describe, expect, it } from 'vitest';

import type { MobileAbiAppUpdatePolicy } from '@/server/mobile-abi-update-policy';
import { mockDb } from '@/server/routers/test-utils';
import {
  markMobileReleasePublished,
  registerMobileRelease,
} from '@/server/services/mobile-release-history';

const info = {
  schemaVersion: 1 as const,
  versionCode: 54,
  versionName: '0.17.44',
  defaultLocale: 'en',
  locales: {
    en: {
      title: 'Approved title',
      summary: 'Approved summary',
      highlights: [],
    },
  },
};
// Registration only consumes release identity and information; APK validation belongs to the caller.
const policy = {
  platform: 'android',
  channel: 'standard-release',
  latestVersionCode: 54,
  latestVersionName: '0.17.44',
  releaseInfo: info,
} satisfies Pick<
  MobileAbiAppUpdatePolicy,
  | 'platform'
  | 'channel'
  | 'latestVersionCode'
  | 'latestVersionName'
  | 'releaseInfo'
>;

describe('immutable mobile release history', () => {
  beforeEach(() => {
    mockDb.mobileAppRelease.createMany.mockReset();
    mockDb.mobileAppRelease.findUnique.mockReset();
    mockDb.mobileAppRelease.updateMany.mockReset();
  });

  it('registers once without ever updating an existing version', async () => {
    mockDb.mobileAppRelease.findUnique.mockResolvedValue({
      id: 'release-54',
      versionName: '0.17.44',
      releaseInfo: info,
    });
    expect(await registerMobileRelease(policy)).toBe('release-54');
    expect(mockDb.mobileAppRelease.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [expect.objectContaining({ releaseInfo: info, versionCode: 54 })],
      })
    );
  });

  it('rejects changed copy for the same version', async () => {
    mockDb.mobileAppRelease.findUnique.mockResolvedValue({
      id: 'release-54',
      versionName: '0.17.44',
      releaseInfo: {
        ...info,
        locales: { en: { ...info.locales.en, title: 'Different' } },
      },
    });
    await expect(registerMobileRelease(policy)).rejects.toThrow(
      'already has different'
    );
  });

  it('preserves the first publication date across retries', async () => {
    await markMobileReleasePublished('release-54');
    expect(mockDb.mobileAppRelease.updateMany).toHaveBeenCalledWith({
      where: { id: 'release-54', publishedAt: null },
      data: { publishedAt: expect.any(Date) },
    });
  });

  it('allows legacy rollback policies without inventing release notes', async () => {
    expect(
      await registerMobileRelease({ ...policy, releaseInfo: undefined })
    ).toBeNull();
    await markMobileReleasePublished(null);
    expect(mockDb.mobileAppRelease.createMany).not.toHaveBeenCalled();
    expect(mockDb.mobileAppRelease.findUnique).not.toHaveBeenCalled();
    expect(mockDb.mobileAppRelease.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a version name already registered under a different build', async () => {
    mockDb.mobileAppRelease.findUnique.mockResolvedValue(null);
    await expect(registerMobileRelease(policy)).rejects.toThrow(
      'already has different'
    );
  });
});
