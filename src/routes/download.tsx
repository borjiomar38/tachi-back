import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { androidApkDownload } from '@/features/public/download-assets';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';
import { getPublicAndroidApkDownload } from '@/features/public/server';

const downloadStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/download');
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

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': `${url}#apk`,
      name: 'Nayovi Android Manhwa and Manga Translator',
      alternateName: ['TachiyomiAT APK', 'Tachiyomi AT APK'],
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Android',
      downloadUrl: buildPublicAbsoluteUrl(androidApkDownload.href),
      fileSize: androidApkDownload.sizeLabel,
      softwareVersion: androidApkDownload.buildLabel,
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

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  loader: () => getPublicAndroidApkDownload(),
  head: () =>
    buildPublicPageHead(
      'TachiyomiAT APK Download - Manhwa & Manga Translator',
      'Download the official Nayovi manhwa and manga translator APK for Android. Install it, open a chapter, and try about two average chapters free.',
      '/download',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT APK',
          'Tachiyomi AT APK',
          'TachiyomiAT download',
          'Tachiyomi AT download',
          'Tachiyomi download',
          'Mihon Android reader',
          'Nayovi APK download',
          'manga translator APK',
          'Android manga translator app',
          'manhwa translator Android',
          'manhua translator Android',
        ],
        structuredDataGraph: downloadStructuredData(),
        titleSuffix: 'Nayovi',
      }
    ),
});

function RouteComponent() {
  const apkDownload = Route.useLoaderData();

  return <PageDownload androidApkDownload={apkDownload} />;
}
