export const androidApkDownload = {
  href: '/api/download/apk',
  filename: 'nayovi-latest.apk',
  label: 'Download Android APK',
  sizeLabel: '64 MB',
  buildLabel: 'Android arm64 signed release 0.17.20',
  sha256:
    '2ed1c271c01aff57c375c64b3ec42d7b7f643556c3c13263243a105c705ddb03',
  // Keep the existing blob key until the signed APK is reuploaded under the Nayovi name.
  objectKey: 'public/downloads/tachiyomiat-latest.apk',
} as const;

export const demoVideo = {
  label: 'Nayovi narrated translation demo',
  posterUrl: '/videos/nayovi-translation-demo-narrated-poster.jpg',
  src: '/videos/nayovi-translation-demo-narrated.mp4',
} as const;
