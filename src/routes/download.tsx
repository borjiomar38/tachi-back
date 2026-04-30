import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Download',
      'Download TachiyomiAT for Android and set up manga and manhwa translation with hosted OCR, redeem-code activation, and app update guidance.',
      '/download'
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
