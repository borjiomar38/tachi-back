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
      'TachiyomiAT APK and AI Manga Translator',
      'TachiyomiAT Android readers can install Nayovi for free manga, manhwa, and manhua AI translation with hosted OCR, APK download, redeem-code activation, and Mihon-style setup.',
      '/',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT',
          'Tachiyomi AT',
          'TachiyomiAT APK',
          'TachiyomiAT download',
          'TachiyomiAT manga translator',
          'Tachiyomi manga translator',
          'Mihon manga translator',
          'free manga ai translator',
          'free manhwa ai translator',
          'free manhua ai translator',
          'AI manga translator',
          'AI manhwa translator',
          'AI manhua translator',
          'Nayovi download',
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
