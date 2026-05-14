import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import {
  PageTranslateManhwaAi,
  translateManhwaAiFaqs,
} from '@/features/public/page-translate-manhwa-ai';

export const Route = createFileRoute('/translate-manhwa-ai')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'AI Manhwa Translator',
      'Use Nayovi as an AI manhwa translator for Android readers coming from TachiyomiAT, Tachiyomi, and Mihon-style workflows with hosted OCR, manga and manhua translation support, redeem-code activation, and APK download.',
      '/translate-manhwa-ai',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT manhwa translator',
          'Tachiyomi manhwa translator',
          'Mihon manhwa translator',
          'AI manhwa translator',
          'manhwa AI translator',
          'translate manhwa AI',
          'free manhwa AI translator',
          'manga AI translator app',
          'manhua AI translator',
          'Android manhwa translator',
        ],
        structuredDataGraph: buildPublicFaqStructuredData(
          '/translate-manhwa-ai',
          translateManhwaAiFaqs
        ),
        type: 'manhwa',
      }
    ),
});

function RouteComponent() {
  return <PageTranslateManhwaAi />;
}
