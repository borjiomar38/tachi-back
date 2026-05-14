import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PagePricing } from '@/features/public/page-pricing';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/pricing')({
  component: RouteComponent,
  loader: () => getPublicTokenPacks(),
  head: () =>
    buildPublicPageHead(
      'Free and Paid Manga AI Translator Plans',
      'Compare Nayovi free and monthly token plans for TachiyomiAT, Tachiyomi, and Mihon-style Android readers using manga translate ai, manhwa translate ai, hosted OCR, redeem-code delivery, and app activation.',
      '/pricing',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT manga translator plan',
          'Tachiyomi manga translator plan',
          'Mihon AI translator plan',
          'free manga ai translator plan',
          'free manhwa ai translator plan',
          'manga translation token plan',
          'manhwa translation pricing',
        ],
      }
    ),
});

function RouteComponent() {
  const tokenPacks = Route.useLoaderData();

  return <PagePricing tokenPacks={tokenPacks} />;
}
