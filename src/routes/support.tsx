import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageSupport } from '@/features/public/page-support';

export const Route = createFileRoute('/support')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Support',
      'Public support, FAQ, and legal placeholder links for Tachiyomi Back.'
    ),
});

function RouteComponent() {
  return <PageSupport />;
}
