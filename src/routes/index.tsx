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
      'Free Manga AI Translator App',
      'Nayovi helps TachiyomiAT, Tachiyomi, and Mihon-style Android readers try a free manga AI translator, free manhwa AI translator, and free manhua AI translator with hosted OCR, clean translation, redeem-code activation, and Android APK download.',
      '/',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT',
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
