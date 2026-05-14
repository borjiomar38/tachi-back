import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageMihonTachiyomiAtSetupGuide } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/mihon-tachiyomiat-setup')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Mihon and TachiyomiAT Setup Guide',
      'Set up Nayovi from the Mihon TachiyomiAT guide path for readers searching TachiyomiAT, Tachiyomi, or Mihon workflows, with Android APK download, hosted OCR, AI translation, redeem-code activation, and permission-safe setup.',
      '/guides/mihon-tachiyomiat-setup',
      {
        keywords: [
          ...publicSeoKeywords,
          'Mihon TachiyomiAT setup',
          'TachiyomiAT setup guide',
          'TachiyomiAT APK',
          'TachiyomiAT download',
          'Tachiyomi manga translator',
          'Mihon manga translator',
          'Nayovi TachiyomiAT setup',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageMihonTachiyomiAtSetupGuide />;
}
