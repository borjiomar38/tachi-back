import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  buildPublicFreeTokenPack,
  type PublicTokenPack,
} from '@/features/public/data';
import {
  type AndroidApkDownload,
  getAndroidApkDownloadMetadata,
} from '@/features/public/download-assets';
import { getPublicMobileAbiAppUpdatePolicy } from '@/server/mobile-abi-update-policy';
import { getPublicMobileAppUpdatePolicy } from '@/server/mobile-update-policy';
import { getTokenCatalog } from '@/server/payments/token-catalog';

const loadPublicTokenPacks = async (): Promise<PublicTokenPack[]> => {
  const catalog = await getTokenCatalog();
  return [
    ...(catalog.freeTrial.enabled
      ? [buildPublicFreeTokenPack(catalog.freeTrial.tokenAmount)]
      : []),
    ...catalog.packs.map((pack) => ({
      ...pack,
      marketingSummary: pack.description ?? '',
    })),
  ];
};
export const getPublicTokenPacks = createServerFn({ method: 'GET' }).handler(
  loadPublicTokenPacks
);
export const getPublicTokenPackByKey = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tokenPackKey: z.string().trim().min(1).max(64) }))
  .handler(
    async ({ data }): Promise<PublicTokenPack | null> =>
      (await loadPublicTokenPacks()).find(
        (pack) => pack.key === data.tokenPackKey && pack.key !== 'free'
      ) ?? null
  );

export const getPublicAndroidApkDownload = createServerFn({
  method: 'GET',
}).handler(async (): Promise<AndroidApkDownload> => {
  const abiPolicy = await getPublicMobileAbiAppUpdatePolicy();

  if (abiPolicy) {
    const arm64Apk = abiPolicy.apkByAbi['arm64-v8a'];

    return getAndroidApkDownloadMetadata({
      sha256: arm64Apk.sha256,
      sizeBytes: arm64Apk.sizeBytes,
      variant: 'arm64-v8a',
      versionName: abiPolicy.latestVersionName,
    });
  }

  const legacyPolicy = await getPublicMobileAppUpdatePolicy();

  return getAndroidApkDownloadMetadata({
    sha256: legacyPolicy.apkSha256,
    sizeBytes: legacyPolicy.apkSizeBytes,
    variant: legacyPolicy.apkVariant,
    versionName:
      legacyPolicy.currentVersionName ?? legacyPolicy.latestVersionName,
  });
});
