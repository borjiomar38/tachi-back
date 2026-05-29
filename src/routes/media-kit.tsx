import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageMediaKit } from '@/features/public/page-ethical-guides';

const mediaKitStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/media-kit');

  return [
    {
      '@type': 'AboutPage',
      '@id': `${url}#media-kit`,
      name: 'Nayovi media kit',
      description:
        'Official Nayovi source-of-truth packet for Android reviewers, app directories, podcasts, newsletters, creator platforms, partners, and investors.',
      mainEntity: {
        '@type': 'SoftwareApplication',
        name: 'Nayovi',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Android',
        url: buildPublicAbsoluteUrl('/download'),
      },
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#source-links`,
      name: 'Nayovi official source links',
      itemListElement: [
        ['Official website', 'https://nayovi.com'],
        ['Official APK download', buildPublicAbsoluteUrl('/download')],
        ['Pricing', buildPublicAbsoluteUrl('/pricing')],
        ['Support', buildPublicAbsoluteUrl('/support')],
        [
          'Comic OCR checklist',
          buildPublicAbsoluteUrl('/guides/comic-ocr-translation-checklist'),
        ],
        [
          'Approved-sample pilot',
          buildPublicAbsoluteUrl(
            '/guides/permission-safe-manga-translation-pilot'
          ),
        ],
      ].map(([name, item], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        item,
      })),
    },
  ];
};

export const Route = createFileRoute('/media-kit')({
  component: PageMediaKit,
  head: () =>
    buildPublicPageHead(
      'Nayovi Media Kit',
      'Official Nayovi media kit for reviewers, directories, podcasts, newsletters, partners, and investors covering APK access, OCR workflow, responsible-use boundaries, and approved-sample review links.',
      '/media-kit',
      {
        keywords: [
          ...publicSeoKeywords,
          'Nayovi media kit',
          'Nayovi press kit',
          'Android OCR app review',
          'manga translator APK media kit',
          'AI manga translation press kit',
        ],
        structuredDataGraph: mediaKitStructuredData(),
      }
    ),
});
