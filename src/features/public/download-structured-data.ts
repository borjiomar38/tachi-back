import {
  type AndroidApkDownload,
  androidApkDownload,
} from '@/features/public/download-assets';
import { buildPublicAbsoluteUrl } from '@/features/public/head';

const installSteps = [
  {
    name: 'Download the official Nayovi APK',
    description: 'Use the download button on tachiyomiat.com.',
  },
  {
    name: 'Allow installation when Android asks',
    description:
      'Approve installation from your browser or file manager when prompted.',
  },
  {
    name: 'Open Nayovi',
    description:
      'Launch the app, open a manhwa or manga chapter, and choose your reading language.',
  },
] as const;

export const buildDownloadStructuredData = (
  apkDownload: AndroidApkDownload = androidApkDownload
) => {
  const url = buildPublicAbsoluteUrl('/download');

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': `${url}#apk`,
      name: 'Nayovi Android Manhwa and Manga Translator',
      alternateName: ['TachiyomiAT APK', 'Tachiyomi AT APK'],
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Android',
      downloadUrl: buildPublicAbsoluteUrl(apkDownload.href),
      fileSize: apkDownload.sizeLabel,
      softwareVersion: apkDownload.buildLabel,
      url,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'One-time free trial before optional monthly plans.',
      },
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#install-howto`,
      name: 'How to install the Nayovi manhwa and manga translator APK on Android',
      description:
        'Download the official APK, approve the Android installation prompt, and open Nayovi.',
      step: installSteps.map((step) => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.description,
      })),
    },
  ];
};
