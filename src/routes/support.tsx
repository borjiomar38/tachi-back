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
      'Manga AI Translator Support',
      'Get TachiyomiAT support for redeem codes, Android setup, free manga AI translator access, manhwa translation plans, billing questions, device activation, and hosted OCR issues.',
      '/support',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga ai translator support',
          'manhwa ai translator support',
          'TachiyomiAT redeem code support',
          'Android manga translator help',
        ],
        structuredDataGraph: buildPublicFaqStructuredData(
          '/support',
          supportFaqs
        ),
      }
    ),
});

function RouteComponent() {
  return <PageSupport />;
}
