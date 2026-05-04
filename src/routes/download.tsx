import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Download Free Manga IA Translator APK',
      'Download TachiyomiAT for Android and set up a free manga IA translator, free manhwa IA translator, and free manhua IA translator with hosted OCR, redeem-code activation, and app update guidance.',
      '/download',
      {
        keywords: [
          ...publicSeoKeywords,
          'download free manga ia translator',
          'download free manhwa ia translator',
          'TachiyomiAT APK download',
          'Android manga translator APK',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
