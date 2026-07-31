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
  sizeLabel: '64 MB',
  buildLabel: 'Android arm64 signed release',
  sha256:
    '06c029b34a27fb1a151f15cba2b7cd3f460f1da7ff7be3c0af43fb6ea0af6328',
  // Keep the existing blob key until the signed APK is reuploaded under the Nayovi name.
  objectKey: 'public/downloads/tachiyomiat-latest.apk',
} as const satisfies AndroidApkDownload;

export function getAndroidApkDownloadMetadata(input?: {
  versionName?: null | string;
}): AndroidApkDownload {
  const versionName = input?.versionName?.trim();

  return {
    ...androidApkDownload,
    buildLabel: versionName
      ? `Android arm64 signed release ${versionName}`
      : androidApkDownload.buildLabel,
  };
}

export const demoVideo = {
  embedUrl: 'https://www.youtube-nocookie.com/embed/8_5sqq7Yl7g?rel=0',
  label: 'How to Translate Korean Manhwa to English on Android with Nayovi',
  watchUrl: 'https://www.youtube.com/shorts/8_5sqq7Yl7g',
} as const;
