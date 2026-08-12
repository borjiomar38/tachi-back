export interface AndroidApkDownload {
  buildLabel: string;
  filename: string;
  href: string;
  label: string;
  objectKey: string;
  sha256: string;
  sizeLabel: string;
}

export const androidApkDownload = {
  href: '/api/download/apk',
  filename: 'nayovi-latest.apk',
  label: 'Download Android APK',
  sizeLabel: '64.32 MB',
  buildLabel: 'Android arm64 signed release',
  sha256:
    '44bd5ebb96af5c81403290b09cc4edd242267d2d418aec5b330bcfb028b19b93',
  // Keep the existing blob key until the signed APK is reuploaded under the Nayovi name.
  objectKey: 'public/downloads/tachiyomiat-latest.apk',
} as const satisfies AndroidApkDownload;

export function getAndroidApkDownloadMetadata(input?: {
  sha256?: null | string;
  sizeBytes?: null | number;
  variant?: 'arm64-v8a' | 'universal';
  versionName?: null | string;
}): AndroidApkDownload {
  const versionName = input?.versionName?.trim();
  const variantLabel =
    input?.variant === 'universal' ? 'Android universal' : 'Android arm64';

  return {
    ...androidApkDownload,
    buildLabel: `${variantLabel} signed release${versionName ? ` ${versionName}` : ''}`,
    sha256: input?.sha256 ?? androidApkDownload.sha256,
    sizeLabel: input?.sizeBytes
      ? `${(input.sizeBytes / 1024 / 1024).toFixed(2)} MB`
      : androidApkDownload.sizeLabel,
  };
}

export const demoVideo = {
  embedUrl: 'https://www.youtube-nocookie.com/embed/8_5sqq7Yl7g?rel=0',
  label: 'How to Translate Korean Manhwa to English on Android with Nayovi',
  watchUrl: 'https://www.youtube.com/shorts/8_5sqq7Yl7g',
} as const;
