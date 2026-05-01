import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageMihonTachiyomiSetupGuide } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/mihon-tachiyomiat-setup')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Mihon and TachiyomiAT Setup Guide',
      'Set up TachiyomiAT and Mihon-style Android reading workflows with hosted OCR, redeem-code activation, official install guidance, and permission-safe content boundaries.',
      '/guides/mihon-tachiyomiat-setup'
    ),
});

function RouteComponent() {
  return <PageMihonTachiyomiSetupGuide />;
}
