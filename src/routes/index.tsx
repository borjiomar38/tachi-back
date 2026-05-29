import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { publicSeoKeywords } from '@/features/blog/seo';
import { fallbackPublicTokenPacks, supportFaqs } from '@/features/public/data';
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
    '@id': `${buildPublicAbsoluteUrl('/')}#official-reader-handoff`,
    name: 'Nayovi official Android reader handoff',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Verify the official APK',
        description:
          'Use the Nayovi download page as the source of truth for Android APK access, metadata, and setup context.',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Start with trial or review access',
        description:
          'Use free trial access, a redeem code, or a dedicated reviewer code before recommending a paid plan.',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Route repeat readers to pricing',
        description:
          'Send readers with repeat manga, manhwa, or manhua translation needs to monthly token plans only after install and activation are clear.',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'Qualify partner proof before escalation',
        description:
          'Route press, directory, creator, publisher, and investor contacts through APK proof, approved-sample scope, and measurable activation context before codes, calls, or custom terms.',
      },
    ],
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
