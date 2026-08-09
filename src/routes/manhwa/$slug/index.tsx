import { createFileRoute, notFound } from '@tanstack/react-router';

import { PageManhwaSeries } from '@/features/manhwa/page-manhwa-series';
import { getManhwaSeriesPageData } from '@/features/manhwa/server';
import { isManhwaChapterPublic } from '@/features/manhwa/visibility';
import {
  buildPublicAbsoluteUrl,
  buildPublicNotFoundHead,
  buildPublicPageHead,
} from '@/features/public/head';

export const Route = createFileRoute('/manhwa/$slug/')({
  component: RouteComponent,
  loader: async ({ params }) => {
    const data = await getManhwaSeriesPageData({
      data: { slug: params.slug },
    });

    const series = data.series;

    if (!series) {
      throw notFound();
    }

    return { ...data, series };
  },
  head: ({ loaderData }) => {
    const series = loaderData?.series;
    const latestPublicChapter = series?.chapters
      .filter(isManhwaChapterPublic)
      .at(-1);

    return series
      ? buildPublicPageHead(
          `${series.title} Manhwa`,
          series.description,
          `/manhwa/${series.slug}`,
          {
            imageAlt: series.coverAlt,
            imageHeight: 1600,
            imagePath: series.coverImagePath,
            imageType: 'image/png',
            imageWidth: 1200,
            keywords: [
              series.title,
              ...(latestPublicChapter
                ? [
                    `${series.title} chapter ${latestPublicChapter.chapterNumber}`,
                  ]
                : []),
              'read original manhwa',
              'regression manhwa',
              'royal fantasy manhwa',
              'Nayovi Originals',
              ...series.genres,
            ],
            robots: loaderData.isPrivatePreview
              ? 'noindex, nofollow'
              : 'index, follow, max-image-preview:large',
            structuredDataGraph: [
              {
                '@type': 'CreativeWorkSeries',
                '@id': `${buildPublicAbsoluteUrl(`/manhwa/${series.slug}`)}#series`,
                name: series.title,
                description: series.description,
                genre: series.genres,
                numberOfEpisodes: series.totalPlannedChapters,
                url: buildPublicAbsoluteUrl(`/manhwa/${series.slug}`),
              },
            ],
          }
        )
      : buildPublicNotFoundHead(
          'Manhwa not found',
          'This Nayovi original manhwa is not available.'
        );
  },
});

function RouteComponent() {
  const { series } = Route.useLoaderData();

  return <PageManhwaSeries series={series} />;
}
