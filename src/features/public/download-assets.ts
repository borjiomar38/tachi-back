export const androidApkDownload = {
  href: '/api/download/apk',
  filename: 'nayovi-latest.apk',
  label: 'Download Android APK',
  sizeLabel: '64 MB',
  buildLabel: 'Android arm64 signed release 0.17.14',
  sha256:
    '0b2e4598a7ce477885a0c1047747ca1b7eb2d81962acdc46b3eb4ceef3feceed',
  // Keep the existing blob key until the signed APK is reuploaded under the Nayovi name.
  objectKey: 'public/downloads/tachiyomiat-latest.apk',
} as const;

export const youtubeDemo = {
  watchUrl: 'https://www.youtube.com/shorts/8To9Cx8lDdc',
  embedUrl: 'https://www.youtube.com/embed/8To9Cx8lDdc',
} as const;
