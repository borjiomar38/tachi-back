import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageLegalTerms } from '@/features/public/page-legal';

export const Route = createFileRoute('/legal/terms')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Terms of Service',
      'Terms placeholder for Tachiyomi Back token packs, redeem codes, and hosted OCR and translation processing.'
    ),
});

function RouteComponent() {
  return <PageLegalTerms />;
}
