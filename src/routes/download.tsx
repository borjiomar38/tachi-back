import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Download Nayovi APK for TachiyomiAT, Tachiyomi and Mihon Readers',
      'Download Nayovi for Android readers coming from TachiyomiAT, Tachiyomi, and Mihon-style workflows, then set up a free manga AI translator, hosted OCR, redeem-code activation, and app update guidance.',
      '/download',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT APK',
          'TachiyomiAT download',
          'Tachiyomi download',
          'Mihon Android reader',
          'download free manga ai translator',
          'download free manhwa ai translator',
          'Nayovi APK download',
          'Android manga translator APK',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
