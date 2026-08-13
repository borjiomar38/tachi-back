import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildDownloadStructuredData } from '@/features/public/download-structured-data';
import { buildPublicPageHead } from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';
import { getPublicAndroidApkDownload } from '@/features/public/server';

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  loader: () => getPublicAndroidApkDownload(),
  head: ({ loaderData }) =>
    buildPublicPageHead(
      'TachiyomiAT APK Download - Manhwa & Manga Translator',
      'Download the official Nayovi manhwa and manga translator APK for Android. Install it, open a chapter, and try about two average chapters free.',
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
          'Nayovi APK download',
          'manga translator APK',
          'Android manga translator app',
          'manhwa translator Android',
          'manhua translator Android',
        ],
        structuredDataGraph: buildDownloadStructuredData(loaderData),
        titleSuffix: 'Nayovi',
      }
    ),
});

function RouteComponent() {
  const apkDownload = Route.useLoaderData();

  return <PageDownload androidApkDownload={apkDownload} />;
}
