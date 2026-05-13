import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageMihonNayoviSetupGuide } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/mihon-nayovi-setup')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Mihon and Nayovi AI Translator Setup',
      'Set up Nayovi and Mihon-style Android reading workflows for manga translate ai, manhwa translate ai, hosted OCR, redeem-code activation, official install guidance, and permission-safe content boundaries.',
      '/guides/mihon-nayovi-setup',
      {
        keywords: [
          ...publicSeoKeywords,
          'Mihon manga translate ai',
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
