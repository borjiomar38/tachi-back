import { isDeepStrictEqual } from 'node:util';

import { db } from '@/server/db';
import type { MobileAbiAppUpdatePolicy } from '@/server/mobile-abi-update-policy';
import { zMobileReleaseInformation } from '@/server/mobile-release-information';

export class MobileReleaseInformationConflict extends Error {
  constructor() {
    super(
      'This version already has different release information. Publish a new version instead of overwriting history.'
    );
  }
}

/** Register before promotion; a failed R2 write leaves an explicitly unpublished record. */
export const registerMobileRelease = async (
  policy: Pick<
    MobileAbiAppUpdatePolicy,
    | 'platform'
    | 'channel'
    | 'latestVersionCode'
    | 'latestVersionName'
    | 'releaseInfo'
  >
): Promise<string | null> => {
  if (!policy.releaseInfo) return null; // Historical policies remain valid rollback payloads.
  const identity = {
    platform: policy.platform,
    channel: policy.channel,
    versionCode: policy.latestVersionCode,
  };
  // PostgreSQL ON CONFLICT DO NOTHING also handles simultaneous identical retries.
  await db.mobileAppRelease.createMany({
    data: [
      {
        ...identity,
        versionName: policy.latestVersionName,
        releaseInfo: policy.releaseInfo,
      },
    ],
    skipDuplicates: true,
  });
  const release = await db.mobileAppRelease.findUnique({
    where: { platform_channel_versionCode: identity },
  });
  if (
    !release ||
    release.versionName !== policy.latestVersionName ||
    !isDeepStrictEqual(
      zMobileReleaseInformation().parse(release.releaseInfo),
      policy.releaseInfo
    )
  ) {
    throw new MobileReleaseInformationConflict();
  }
  return release.id;
};

export const markMobileReleasePublished = async (
  id: string | null
): Promise<void> => {
  if (!id) return;
  // Preserve the first successful publication timestamp on retries and rollbacks.
  await db.mobileAppRelease.updateMany({
    where: { id, publishedAt: null },
    data: { publishedAt: new Date() },
  });
};
