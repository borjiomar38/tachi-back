import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import {
  downloadFaqs,
  PageDownload,
} from '@/features/public/page-download';

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'TachiyomiAT APK Download for Android',
      'Download the TachiyomiAT-style Nayovi APK for Android, then activate hosted OCR and free manga, manhwa, or manhua AI translation with a redeem code.',
      '/download',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT APK',
          'Tachiyomi AT APK',
          'TachiyomiAT download',
          'Tachiyomi AT download',
          'Tachiyomi download',
          'Mihon Android reader',
          'download free manga ai translator',
          'download free manhwa ai translator',
          'Nayovi APK download',
          'Android manga translator APK',
        ],
        structuredDataGraph: buildPublicFaqStructuredData(
          '/download',
          downloadFaqs
        ),
      }
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
