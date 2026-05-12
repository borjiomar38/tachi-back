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
      'Use TachiyomiAT as an AI manhwa translator for Android with hosted OCR, manga and manhua translation support, redeem-code activation, APK download, and permission-safe workflows.',
      '/translate-manhwa-ai',
      {
        keywords: [
          ...publicSeoKeywords,
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
