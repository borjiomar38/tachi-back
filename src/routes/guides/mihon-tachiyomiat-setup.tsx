import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageMihonTachiyomiSetupGuide } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/mihon-tachiyomiat-setup')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Mihon and TachiyomiAT IA Translator Setup',
      'Set up TachiyomiAT and Mihon-style Android reading workflows for manga translate ia, manhwa translate ia, hosted OCR, redeem-code activation, official install guidance, and permission-safe content boundaries.',
      '/guides/mihon-tachiyomiat-setup',
      {
        keywords: [
          ...publicSeoKeywords,
          'Mihon manga translate ia',
          'TachiyomiAT setup guide',
          'Android manhwa translator setup',
          'free manga ia translator setup',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageMihonTachiyomiSetupGuide />;
}
