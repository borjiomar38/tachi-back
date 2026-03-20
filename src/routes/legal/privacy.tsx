import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageLegalPrivacy } from '@/features/public/page-legal';

export const Route = createFileRoute('/legal/privacy')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Privacy Policy',
      'Privacy placeholder for Tachiyomi Back hosted OCR and translation workflows.'
    ),
});

function RouteComponent() {
  return <PageLegalPrivacy />;
}
