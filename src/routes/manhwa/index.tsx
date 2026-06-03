import { createFileRoute } from '@tanstack/react-router';

import { PageManhwaIndex } from '@/features/manhwa/page-manhwa-index';
import { ManhwaSeriesView } from '@/features/manhwa/schema';
import { getManhwaIndexPageData } from '@/features/manhwa/server';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';

const manhwaIndexStructuredData = (series: ManhwaSeriesView[]) => [
  {
    '@type': 'CollectionPage',
    '@id': `${buildPublicAbsoluteUrl('/manhwa')}#collection`,
    name: 'Nayovi Originals',
    description:
      'Original Nayovi manhwa series with vertical reader pages and Android reader handoff.',
    hasPart: series.map((item) => ({
      '@type': 'CreativeWorkSeries',
      name: item.title,
      url: buildPublicAbsoluteUrl(`/manhwa/${item.slug}`),
      genre: item.genres,
      numberOfEpisodes: item.totalPlannedChapters,
    })),
  },
];

export const Route = createFileRoute('/manhwa/')({
  component: RouteComponent,
  loader: () => getManhwaIndexPageData(),
  head: ({ loaderData }) =>
    buildPublicPageHead(
      'Original Manhwa Online',
      'Read Nayovi original manhwa online with vertical chapters and Android reader handoff.',
      '/manhwa',
      {
        keywords: [
          'original manhwa online',
          'read manhwa online',
          'AI manhwa story',
          'Nayovi Originals',
          'vertical manhwa reader',
          'webtoon reader',
        ],
        robots: loaderData?.isPrivatePreview
          ? 'noindex, nofollow'
          : 'index, follow, max-image-preview:large',
        structuredDataGraph: manhwaIndexStructuredData(
          loaderData?.series ?? []
        ),
      }
    ),
});

function RouteComponent() {
  const { series, showPrivateContext } = Route.useLoaderData();

  return (
    <PageManhwaIndex series={series} showPrivateContext={showPrivateContext} />
  );
}
