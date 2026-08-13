import { presignGetObject } from '@better-upload/server/helpers';

import { androidApkDownload } from '@/features/public/download-assets';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

const ANDROID_APK_DOWNLOAD_URL_TTL_SECONDS = 60 * 10;
const LEGACY_MOBILE_UPDATE_OBJECT_KEY =
  'public/downloads/tachiyomiat-latest.apk';

const createAndroidApkDownloadResponseForKey = async (
  key: string
): Promise<Response> => {
  const url = await presignGetObject(uploadClient, {
    bucket: objectStorageBuckets.legacyPublic,
    expiresIn: ANDROID_APK_DOWNLOAD_URL_TTL_SECONDS,
    key,
  });

  return Response.redirect(url, 302);
};

export const createWebsiteAndroidApkDownloadResponse =
  async (): Promise<Response> =>
    createAndroidApkDownloadResponseForKey(androidApkDownload.objectKey);

export const createLegacyMobileUpdateDownloadResponse =
  async (): Promise<Response> =>
    createAndroidApkDownloadResponseForKey(LEGACY_MOBILE_UPDATE_OBJECT_KEY);
