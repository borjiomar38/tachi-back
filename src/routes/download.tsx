import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { androidApkDownload } from '@/features/public/download-assets';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';

const downloadStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/download');
  const steps = [
    {
      name: 'Download the official Nayovi APK',
      description:
        'Use the official tachiyomiat.com download endpoint for the current Nayovi Android APK.',
    },
    {
      name: 'Verify the APK metadata',
      description: `Compare the APK filename, build label, size, and SHA-256 hash before reviewing or listing the app. Current SHA-256: ${androidApkDownload.sha256}.`,
    },
    {
      name: 'Activate hosted translation',
      description:
        'Open the Android app, enter a redeem code, and use hosted OCR and AI translation for approved manga, manhwa, or manhua content.',
    },
    {
      name: 'Check official updates',
      description:
        'Return to the official Nayovi download page before updating so the APK URL, build label, size, hash, support links, and responsible-use notes stay attached.',
    },
  ] as const;

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': `${url}#apk`,
      name: 'Nayovi Android APK',
      alternateName: ['TachiyomiAT APK', 'Tachiyomi AT APK'],
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Android',
      downloadUrl: buildPublicAbsoluteUrl(androidApkDownload.href),
      fileSize: androidApkDownload.sizeLabel,
      softwareVersion: androidApkDownload.buildLabel,
      url,
      offers: [
        {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description:
            'Free trial access before monthly hosted OCR and AI translation token plans.',
          url: buildPublicAbsoluteUrl('/pricing'),
        },
      ],
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#install-howto`,
      name: 'How to install and activate the Nayovi Android APK',
      description:
        'Download the official Nayovi APK, verify source-of-truth metadata, then activate hosted OCR and AI translation with a redeem code.',
      step: steps.map((step) => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'TachiyomiAT APK Download for Android',
      'Download the TachiyomiAT-style Nayovi APK for Android, then activate hosted OCR and free manga, manhwa, or manhua AI translation with a redeem code.',
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
          'download free manga ai translator',
          'download free manhwa ai translator',
          'Nayovi APK download',
          'Android manga translator APK',
        ],
        structuredDataGraph: downloadStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
