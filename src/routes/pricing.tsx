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
      'Free and Paid Manga IA Translator Plans',
      'Compare TachiyomiAT free and monthly token plans for manga translate ia, manhwa translate ia, manhua translate ia, hosted OCR, redeem-code delivery, and Android app activation.',
      '/pricing',
      {
        keywords: [
          ...publicSeoKeywords,
          'free manga ia translator plan',
          'free manhwa ia translator plan',
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
