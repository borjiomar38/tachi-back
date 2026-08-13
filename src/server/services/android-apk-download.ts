import { presignGetObject } from '@better-upload/server/helpers';

import { androidApkDownload } from '@/features/public/download-assets';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

const ANDROID_APK_DOWNLOAD_URL_TTL_SECONDS = 60 * 10;
const LEGACY_MOBILE_UPDATE_OBJECT_KEY =
  'public/downloads/tachiyomiat-latest.apk';

const SUPPORTED_ANDROID_APK_RELEASE_VERSIONS = [
  'v0.17.38',
  'v0.17.40',
] as const;
const SUPPORTED_ANDROID_APK_ABIS = [
  'arm64-v8a',
  'armeabi-v7a',
  'x86',
  'x86_64',
] as const;

type SupportedAndroidApkReleaseVersion =
  (typeof SUPPORTED_ANDROID_APK_RELEASE_VERSIONS)[number];
type SupportedAndroidApkAbi = (typeof SUPPORTED_ANDROID_APK_ABIS)[number];

const isSupportedAndroidApkReleaseVersion = (
  version: string
): version is SupportedAndroidApkReleaseVersion =>
  SUPPORTED_ANDROID_APK_RELEASE_VERSIONS.some(
    (supportedVersion) => supportedVersion === version
  );

const isSupportedAndroidApkAbi = (abi: string): abi is SupportedAndroidApkAbi =>
  SUPPORTED_ANDROID_APK_ABIS.some((supportedAbi) => supportedAbi === abi);

export const resolveVersionedAndroidAbiApkObjectKey = ({
  filename,
  version,
}: {
  filename: string;
  version: string;
}): string | null => {
  if (!isSupportedAndroidApkReleaseVersion(version)) {
    return null;
  }

  const prefix = 'TachiyomiAT-';
  const suffix = `-${version}.apk`;
  if (!filename.startsWith(prefix) || !filename.endsWith(suffix)) {
    return null;
  }

  const abi = filename.slice(prefix.length, -suffix.length);
  if (!isSupportedAndroidApkAbi(abi)) {
    return null;
  }

  const expectedFilename = `TachiyomiAT-${abi}-${version}.apk`;
  if (filename !== expectedFilename) {
    return null;
  }

  return `android/releases/${version}/${expectedFilename}`;
};

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

export const createVersionedAndroidAbiApkDownloadResponse = async (input: {
  filename: string;
  version: string;
}): Promise<Response> => {
  const objectKey = resolveVersionedAndroidAbiApkObjectKey(input);
  if (!objectKey) {
    return new Response('Android APK not found.', {
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
      },
      status: 404,
    });
  }

  return createAndroidApkDownloadResponseForKey(objectKey);
};
