import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageSupport } from '@/features/public/page-support';

export const Route = createFileRoute('/support')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Support',
      'Get TachiyomiAT support for redeem codes, Android setup, manga translation plans, billing questions, device activation, and hosted OCR issues.',
      '/support'
    ),
});

function RouteComponent() {
  return <PageSupport />;
}
