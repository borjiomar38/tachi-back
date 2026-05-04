import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { publicSeoKeywords } from '@/features/blog/seo';
import { fallbackPublicTokenPacks, supportFaqs } from '@/features/public/data';
import {
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
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
      'Free Manga IA Translator App',
      'TachiyomiAT helps readers try a free manga IA translator, free manhwa IA translator, and free manhua IA translator with hosted OCR, clean translation, redeem-code activation, and Android APK download.',
      '/',
      {
        keywords: [
          ...publicSeoKeywords,
          'free manga ia translator',
          'free manhwa ia translator',
          'free manhua ia translator',
          'AI manga translator',
          'AI manhwa translator',
          'AI manhua translator',
          'TachiyomiAT download',
          'Android manga translator app',
        ],
        structuredDataGraph: buildPublicFaqStructuredData('/', supportFaqs),
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
