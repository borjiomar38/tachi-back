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
      'Compare TachiyomiAT free and monthly token plans for manga translate ai, manhwa translate ai, manhua translate ai, hosted OCR, redeem-code delivery, and Android app activation.',
      '/pricing',
      {
        keywords: [
          ...publicSeoKeywords,
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
