import { createFileRoute } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';

import { PageManhwaSeries } from '@/features/manhwa/page-manhwa-series';
import { getManhwaSeriesPageData } from '@/features/manhwa/server';
import { isManhwaChapterPublic } from '@/features/manhwa/visibility';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';

export const Route = createFileRoute('/manhwa/$slug/')({
  component: RouteComponent,
  loader: async ({ params }) =>
    await getManhwaSeriesPageData({ data: { slug: params.slug } }),
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
      : buildPublicPageHead(
          'Manhwa not found',
          'This Nayovi original manhwa is not available.',
          '/manhwa',
          { robots: 'noindex, nofollow' }
        );
  },
});

function RouteComponent() {
  const { series } = Route.useLoaderData();

  if (!series) {
    return <PageError type="404" />;
  }

  return <PageManhwaSeries series={series} />;
}
