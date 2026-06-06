import { createFileRoute } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';

import { PageManhwaChapter } from '@/features/manhwa/page-manhwa-chapter';
import { getManhwaChapterPageData } from '@/features/manhwa/server';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';

export const Route = createFileRoute('/manhwa/$slug/chapter/$chapter')({
  component: RouteComponent,
  loader: async ({ params }) =>
    await getManhwaChapterPageData({
      data: {
        chapter: params.chapter,
        slug: params.slug,
      },
    }),
  head: ({ loaderData }) => {
    const data = loaderData;

    if (!data?.series || !data.chapter) {
      return buildPublicPageHead(
        'Chapter not found',
        'This Nayovi original manhwa chapter is not available.',
        '/manhwa',
        { robots: 'noindex, nofollow' }
      );
    }

    const path = `/manhwa/${data.series.slug}/chapter/${data.chapter.chapterNumber}`;

    return buildPublicPageHead(
      `${data.series.title} Chapter ${data.chapter.chapterNumber}`,
      data.chapter.excerpt,
      path,
      {
        imageAlt: data.series.coverAlt,
        imageHeight: 1821,
        imagePath:
          data.chapter.panels.find((panel) => panel.imagePath)?.imagePath ??
          data.series.coverImagePath,
        imageType: 'image/png',
        imageWidth: 864,
        keywords: [
          data.series.title,
          `${data.series.title} chapter ${data.chapter.chapterNumber}`,
          data.chapter.title,
          'read manhwa chapter online',
          'vertical manhwa chapter',
          'Nayovi Originals',
        ],
        structuredDataGraph: [
          {
            '@type': 'ComicIssue',
            '@id': `${buildPublicAbsoluteUrl(path)}#chapter`,
            name: `${data.series.title} Chapter ${data.chapter.chapterNumber}: ${data.chapter.title}`,
            description: data.chapter.excerpt,
            issueNumber: data.chapter.chapterNumber,
            isPartOf: {
              '@id': `${buildPublicAbsoluteUrl(`/manhwa/${data.series.slug}`)}#series`,
            },
            url: buildPublicAbsoluteUrl(path),
          },
        ],
        robots: data.isPrivatePreview
          ? 'noindex, nofollow'
          : 'index, follow, max-image-preview:large',
      }
    );
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();

  if (!data.series || !data.chapter) {
    return <PageError type="404" />;
  }

  return (
    <PageManhwaChapter
      chapter={data.chapter}
      nextChapter={data.nextChapter}
      previousChapter={data.previousChapter}
      series={data.series}
    />
  );
}
