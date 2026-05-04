import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageHowItWorks } from '@/features/public/page-how-it-works';

export const Route = createFileRoute('/how-it-works')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'How Manga Translate IA Works',
      'Learn how TachiyomiAT manga translate ia works: choose a free or paid plan, receive a redeem code, activate the Android app, run hosted OCR, and translate manga, manhwa, or manhua chapters.',
      '/how-it-works',
      {
        keywords: [
          ...publicSeoKeywords,
          'how manga translate ia works',
          'how manhwa translate ia works',
          'hosted OCR manga translator',
          'redeem code manga translator',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageHowItWorks />;
}
