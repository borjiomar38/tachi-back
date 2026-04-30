import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageHowItWorks } from '@/features/public/page-how-it-works';

export const Route = createFileRoute('/how-it-works')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'How It Works',
      'Learn how TachiyomiAT hosted manga translation works: choose a plan, receive a redeem code, activate the app, run OCR, and translate chapters.',
      '/how-it-works'
    ),
});

function RouteComponent() {
  return <PageHowItWorks />;
}
