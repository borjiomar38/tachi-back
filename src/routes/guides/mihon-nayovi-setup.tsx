import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageMihonNayoviSetupGuide } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/mihon-nayovi-setup')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Mihon, TachiyomiAT and Nayovi AI Translator Setup',
      'Set up Nayovi for Mihon, Tachiyomi, and TachiyomiAT-style Android reading workflows with manga translate ai, manhwa translate ai, hosted OCR, redeem-code activation, official install guidance, and permission-safe content boundaries.',
      '/guides/mihon-nayovi-setup',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT setup guide',
          'Tachiyomi setup guide',
          'Mihon manga translate ai',
          'Mihon TachiyomiAT setup',
          'Nayovi setup guide',
          'Android manhwa translator setup',
          'free manga ai translator setup',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageMihonNayoviSetupGuide />;
}
