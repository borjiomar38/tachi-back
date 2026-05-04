import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { coreBlogSeoKeywords } from '@/features/blog/seo';
import { fallbackPublicTokenPacks } from '@/features/public/data';
import { buildPublicPageHead } from '@/features/public/head';
import { PageLanding } from '@/features/public/page-landing';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      contact: z.enum(['sent', 'error', 'invalid']).optional().catch(undefined),
    })
  ),
  loader: async () => {
    try {
      return await getPublicTokenPacks();
    } catch (error) {
      console.error('Failed to load public token packs', error);
      return fallbackPublicTokenPacks;
    }
  },
  head: () =>
    buildPublicPageHead(
      'Manga Translate IA App',
      'TachiyomiAT helps readers with manga translate ia, manhwa translate ia, and manhua translate ia in-app using hosted OCR, clean translation, monthly token plans, redeem-code activation, and Android APK download.',
      '/',
      {
        keywords: [
          ...coreBlogSeoKeywords,
          'AI manga translator',
          'AI manhwa translator',
          'AI manhua translator',
          'TachiyomiAT download',
          'Android manga translator app',
        ],
      }
    ),
});

function RouteComponent() {
  const tokenPacks = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <PageLanding
      tokenPacks={tokenPacks}
      contactStatus={search.contact || undefined}
    />
  );
}
