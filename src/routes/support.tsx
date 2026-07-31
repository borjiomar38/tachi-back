import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { supportFaqs } from '@/features/public/data';
import {
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageSupport } from '@/features/public/page-support';

export const Route = createFileRoute('/support')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Manhwa & Manga Translator Support for Android',
      'Get help installing Nayovi, choosing a manhwa or manga translation plan, using an activation code, or recovering access on Android.',
      '/support',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT setup support',
          'Tachiyomi support',
          'Mihon setup support',
          'manga ai translator support',
          'manhwa ai translator support',
          'Nayovi activation code support',
          'Android manga translator help',
        ],
        structuredDataGraph: buildPublicFaqStructuredData(
          '/support',
          supportFaqs
        ),
        titleSuffix: 'Nayovi',
      }
    ),
});

function RouteComponent() {
  return <PageSupport />;
}
