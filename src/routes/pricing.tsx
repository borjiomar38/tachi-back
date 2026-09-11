import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { supportFaqs } from '@/features/public/data';
import {
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import { PagePricing } from '@/features/public/page-pricing';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/pricing')({
  component: RouteComponent,
  loader: () => getPublicTokenPacks(),
  head: () =>
    buildPublicPageHead(
      'Translation Token Packs for Android',
      'Nayovi is free to use. Buy one-time token packs for translations and optional AI features, without a subscription.',
      '/pricing',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga translator Android pricing',
          'manga translator token packs',
          'manhwa translator Android plan',
          'manhua translator Android plan',
          'TachiyomiAT manga translator plan',
          'Tachiyomi manga translator plan',
          'Mihon AI translator plan',
        ],
        structuredDataGraph: buildPublicFaqStructuredData(
          '/pricing',
          supportFaqs
        ),
        titleSuffix: 'Nayovi',
      }
    ),
});

function RouteComponent() {
  const tokenPacks = Route.useLoaderData();

  return <PagePricing tokenPacks={tokenPacks} />;
}
