export const androidApkDownload = {
  href: '/api/download/apk',
  filename: 'nayovi-latest.apk',
  label: 'Download Android APK',
  sizeLabel: '64 MB',
  buildLabel: 'Android arm64 signed release 0.17.20',
  sha256:
    '3ca6d69973da325f8ec03ef1c71d7cd8f4b63b8958498ef7bb8633cc9dc62bef',
  // Keep the existing blob key until the signed APK is reuploaded under the Nayovi name.
  objectKey: 'public/downloads/tachiyomiat-latest.apk',
} as const;

export const demoVideo = {
  label: 'Nayovi narrated translation demo',
  posterUrl: '/videos/nayovi-translation-demo-narrated-poster.jpg',
  src: '/videos/nayovi-translation-demo-narrated.mp4',
} as const;
