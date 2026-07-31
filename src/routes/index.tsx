import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  activationSteps,
  fallbackPublicTokenPacks,
  supportFaqs,
} from '@/features/public/data';
import {
  buildPublicAbsoluteUrl,
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageLanding } from '@/features/public/page-landing';
import { getPublicTokenPacks } from '@/features/public/server';

const homeStructuredData = () => [
  {
    '@type': 'ItemList',
    '@id': `${buildPublicAbsoluteUrl('/')}#how-nayovi-works`,
    name: 'How to translate manhwa and manga on Android with Nayovi',
    itemListElement: activationSteps.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.title,
      description: step.description,
    })),
  },
];

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
      'Manhwa & Manga Translator App for Android',
      'Read manhwa, manga, and manhua in your language on Android with Nayovi. Download the APK and try about two average chapters free—no card required.',
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
          'Android manhwa translator app',
        ],
        imageAlt:
          'Nayovi Android manhwa and manga translator showing Korean before and English after inside the reader.',
        imageHeight: 630,
        imagePath: '/og/nayovi-manhwa-translator-preview.jpg',
        imageType: 'image/jpeg',
        imageWidth: 1200,
        titleSuffix: 'Nayovi',
        structuredDataGraph: [
          ...buildPublicFaqStructuredData('/', supportFaqs),
          ...homeStructuredData(),
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
