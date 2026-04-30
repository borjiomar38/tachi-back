import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageLegalTerms } from '@/features/public/page-legal';

export const Route = createFileRoute('/legal/terms')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Terms of Service',
      'Terms for TachiyomiAT token packs, redeem codes, Android device activation, manga source discovery, hosted OCR, and translation processing.',
      '/legal/terms'
    ),
});

function RouteComponent() {
  return <PageLegalTerms />;
}
