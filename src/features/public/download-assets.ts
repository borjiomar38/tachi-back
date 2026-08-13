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
  href: "/api/download/apk",
  filename: "nayovi-latest.apk",
  label: "Download Android APK",
  sizeLabel: "65.14 MB",
  buildLabel: "Android arm64 signed release 0.17.38",
  sha256: "a43788e5c5b21366d7b1c82c1a92b58ef9dcba9fbd4b2300dfcd427073dc8793",
  objectKey: "android/latest/TachiyomiAT-arm64-v8a.apk",
} as const satisfies AndroidApkDownload;

export function getAndroidApkDownloadMetadata(input?: {
  sha256?: null | string;
  sizeBytes?: null | number;
  variant?: "arm64-v8a" | "universal";
  versionName?: null | string;
}): AndroidApkDownload {
  // The public website intentionally advertises the compact ARM64 artifact.
  // The mobile updater has a separate endpoint and must resolve ABI itself.
  if (input?.variant === "universal") {
    return androidApkDownload;
  }

  const versionName = input?.versionName?.trim();

  return {
    ...androidApkDownload,
    buildLabel: `Android arm64 signed release${versionName ? ` ${versionName}` : ""}`,
    sha256: input?.sha256 ?? androidApkDownload.sha256,
    sizeLabel: input?.sizeBytes
      ? `${(input.sizeBytes / 1024 / 1024).toFixed(2)} MB`
      : androidApkDownload.sizeLabel,
  };
}

export const demoVideo = {
  embedUrl: "https://www.youtube-nocookie.com/embed/8_5sqq7Yl7g?rel=0",
  label: "How to Translate Korean Manhwa to English on Android with Nayovi",
  watchUrl: "https://www.youtube.com/shorts/8_5sqq7Yl7g",
} as const;
