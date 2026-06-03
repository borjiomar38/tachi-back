import { createFileRoute } from '@tanstack/react-router';

import { getManhwaSeries, getPublicManhwaSeries } from '@/features/manhwa/data';
import { PageManhwaIndex } from '@/features/manhwa/page-manhwa-index';
import { ManhwaSeries } from '@/features/manhwa/schema';
import { canViewPrivateManhwaProgress } from '@/features/manhwa/server';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';

const manhwaIndexStructuredData = (series: ManhwaSeries[]) => [
  {
    '@type': 'CollectionPage',
    '@id': `${buildPublicAbsoluteUrl('/manhwa')}#collection`,
    name: 'Nayovi Originals',
    description:
      'Original Nayovi manhwa series with vertical reader pages, character registries, chapter manifests, and AI expert continuity review.',
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
  loader: async () => {
    const canViewPrivate = await canViewPrivateManhwaProgress();

    return {
      isPrivatePreview: canViewPrivate,
      series: canViewPrivate ? getManhwaSeries() : getPublicManhwaSeries(),
    };
  },
  head: ({ loaderData }) =>
    buildPublicPageHead(
      'Original Manhwa Online',
      'Read Nayovi original manhwa online with vertical chapters, story bibles, character continuity, and Android reader handoff.',
      '/manhwa',
      {
        keywords: [
          'original manhwa online',
          'read manhwa online',
          'AI manhwa story',
          'Nayovi Originals',
          'vertical manhwa reader',
          'webtoon reader',
          'The Eclipse Crown manhwa',
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
  const { series } = Route.useLoaderData();

  return <PageManhwaIndex series={series} />;
}
