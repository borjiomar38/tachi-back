import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Download',
      'Download guidance for TachiyomiAT with clear boundaries between current app behavior and future hosted mode.'
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
