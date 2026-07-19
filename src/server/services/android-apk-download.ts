import { presignGetObject } from '@better-upload/server/helpers';

import { androidApkDownload } from '@/features/public/download-assets';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

const ANDROID_APK_DOWNLOAD_URL_TTL_SECONDS = 60 * 10;

export const createAndroidApkDownloadResponse = async (): Promise<Response> => {
  const url = await presignGetObject(uploadClient, {
    bucket: objectStorageBuckets.legacyPublic,
    expiresIn: ANDROID_APK_DOWNLOAD_URL_TTL_SECONDS,
    key: androidApkDownload.objectKey,
  });

  return Response.redirect(url, 302);
};
