import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageLegalPrivacy } from '@/features/public/page-legal';

export const Route = createFileRoute('/legal/privacy')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Privacy Policy',
      'Privacy policy for TachiyomiAT hosted OCR, manga translation, source discovery, checkout, redeem-code activation, device records, and support.',
      '/legal/privacy'
    ),
});

function RouteComponent() {
  return <PageLegalPrivacy />;
}
