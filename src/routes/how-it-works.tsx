import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageHowItWorks } from '@/features/public/page-how-it-works';

export const Route = createFileRoute('/how-it-works')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'How Manga Translate AI Works',
      'Learn how Nayovi manga translate ai works for TachiyomiAT, Tachiyomi, and Mihon-style Android readers: choose a plan, receive a redeem code, run hosted OCR, and translate manga, manhwa, or manhua chapters.',
      '/how-it-works',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT setup',
          'Tachiyomi manga translator setup',
          'Mihon AI translator setup',
          'how manga translate ai works',
          'how manhwa translate ai works',
          'hosted OCR manga translator',
          'redeem code manga translator',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageHowItWorks />;
}
