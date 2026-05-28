import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { androidApkDownload } from '@/features/public/download-assets';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';

const buildDownloadStructuredData = (): readonly Record<string, unknown>[] => {
  const downloadUrl = buildPublicAbsoluteUrl(androidApkDownload.href);
  const pageUrl = buildPublicAbsoluteUrl('/download');

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': `${pageUrl}#downloadable-android-app`,
      name: 'Nayovi Android APK',
      alternateName: ['TachiyomiAT APK', 'Tachiyomi AT APK'],
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Android',
      downloadUrl,
      fileSize: androidApkDownload.sizeLabel,
      softwareVersion: androidApkDownload.buildLabel,
      installUrl: pageUrl,
      description:
        'Official Nayovi Android APK for hosted OCR and AI translation support in TachiyomiAT, Tachiyomi, and Mihon-style reading workflows.',
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        price: '0',
        priceCurrency: 'USD',
        url: pageUrl,
      },
      releaseNotes:
        'Directory editors and reviewers should verify the official tachiyomiat.com download page, SHA-256 value, pricing, support, privacy, terms, and responsible-use guidance before listing the APK.',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Nayovi',
          item: buildPublicAbsoluteUrl('/'),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Download Android APK',
          item: pageUrl,
        },
      ],
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
        structuredDataGraph: buildDownloadStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
