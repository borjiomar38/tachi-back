import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageHowItWorks } from '@/features/public/page-how-it-works';

export const Route = createFileRoute('/how-it-works')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'How It Works',
      'Public explanation of redeem-code activation, device binding, and hosted OCR and translation flow for Tachiyomi Back.'
    ),
});

function RouteComponent() {
  return <PageHowItWorks />;
}
