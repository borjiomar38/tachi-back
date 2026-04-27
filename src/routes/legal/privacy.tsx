import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageLegalPrivacy } from '@/features/public/page-legal';

export const Route = createFileRoute('/legal/privacy')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Privacy Policy',
      'Privacy policy for Tachiyomi Back hosted OCR, translation, source discovery, checkout, activation, and support.'
    ),
});

function RouteComponent() {
  return <PageLegalPrivacy />;
}
