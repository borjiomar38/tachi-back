import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageBestAndroidMangaTranslatorApk } from '@/features/public/page-ethical-guides';

const androidTranslatorStructuredData = () => {
  const url = buildPublicAbsoluteUrl(
    '/guides/best-android-manga-translator-apk'
  );
  const criteria = [
    {
      name: 'Verify the official APK source',
      description:
        'Start from the official download page, confirm the app source, and avoid mirror-first APK listings without support or pricing context.',
    },
    {
      name: 'Test hosted OCR and translation',
      description:
        'Use permitted manga, manhwa, or manhua samples to check OCR coverage, reading order, glossary consistency, and translation readability.',
    },
    {
      name: 'Check activation and pricing',
      description:
        'Confirm whether the free trial, redeem-code activation, monthly token plans, and support path fit repeat reading or reviewer testing.',
    },
    {
      name: 'Confirm responsible-use boundaries',
      description:
        'Use tools that do not host chapters and that limit public examples to owned, public-domain, official-sample, or approved content.',
    },
  ] as const;

  return [
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: 'Best Android manga translator APK: what to check',
      description:
        'A practical guide for comparing Android manga, manhwa, and manhua translator APKs by official source, hosted OCR quality, activation path, pricing, and responsible-use boundaries.',
      mainEntityOfPage: {
        '@id': `${url}#webpage`,
      },
      about: [
        'Android manga translator APK',
        'manhwa translator app',
        'manga OCR translation',
        'AI manga translation app',
      ],
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#comparison-checklist`,
      name: 'Android manga translator APK comparison checklist',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: criteria.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute(
  '/guides/best-android-manga-translator-apk'
)({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Best Android Manga Translator APK',
      'Compare Android manga, manhwa, and manhua translator APKs by official download source, hosted OCR quality, redeem-code activation, free trial, token plans, and responsible-use boundaries.',
      '/guides/best-android-manga-translator-apk',
      {
        keywords: [
          ...publicSeoKeywords,
          'best Android manga translator APK',
          'Android manhwa translator app',
          'manga OCR APK',
          'AI manga translator Android',
          'manhua translator APK',
        ],
        structuredDataGraph: androidTranslatorStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageBestAndroidMangaTranslatorApk />;
}
