import { createFileRoute } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';

import {
  getManhwaSeriesBySlug,
  getPublicManhwaSeriesBySlug,
  isManhwaChapterPublic,
} from '@/features/manhwa/data';
import { PageManhwaSeries } from '@/features/manhwa/page-manhwa-series';
import { canViewPrivateManhwaProgress } from '@/features/manhwa/server';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';

export const Route = createFileRoute('/manhwa/$slug/')({
  component: RouteComponent,
  loader: async ({ params }) => {
    const canViewPrivate = await canViewPrivateManhwaProgress();
    const series = canViewPrivate
      ? getManhwaSeriesBySlug(params.slug)
      : getPublicManhwaSeriesBySlug(params.slug);

    return {
      isPrivatePreview:
        canViewPrivate &&
        Boolean(
          series?.chapters.some((chapter) => !isManhwaChapterPublic(chapter))
        ),
      series,
    };
  },
  head: ({ loaderData }) => {
    const series = loaderData?.series;
    const firstPublicChapter = series?.chapters[0];

    return series
      ? buildPublicPageHead(
          `${series.title} Manhwa`,
          series.description,
          `/manhwa/${series.slug}`,
          {
            imageAlt: series.coverAlt,
            imagePath: series.coverImagePath,
            keywords: [
              series.title,
              ...(firstPublicChapter
                ? [
                    `${series.title} chapter ${firstPublicChapter.chapterNumber}`,
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
