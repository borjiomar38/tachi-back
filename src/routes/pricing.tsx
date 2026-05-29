import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PagePricing } from '@/features/public/page-pricing';
import { getPublicTokenPacks } from '@/features/public/server';

const pricingStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/pricing');
  const planDecisionItems = [
    {
      name: 'Use the free trial first',
      description:
        'Start with trial access when a reader needs to inspect OCR quality, activation, and manga or manhwa translation output before paying.',
    },
    {
      name: 'Upgrade for repeat reading',
      description:
        'Choose a monthly token plan when hosted OCR and AI translation become a recurring Android reading workflow.',
    },
    {
      name: 'Request dedicated review or pilot access',
      description:
        'Use support instead of normal checkout when a reviewer, affiliate, directory editor, or approved community needs trackable redeem-code access.',
    },
  ] as const;
  const referralQualityItems = [
    {
      name: 'Official source context',
      description:
        'Qualified referrals should preserve the official APK, pricing, support, privacy, terms, and responsible-use links before checkout.',
    },
    {
      name: 'Dedicated code path',
      description:
        'Public reviews, affiliate tests, and approved community pilots should request a dedicated code when attribution or support separation matters.',
    },
    {
      name: 'Recurring revenue signal',
      description:
        'The strongest plan signal is a reader returning for repeat chapter translation after the trial proves the Android workflow is useful.',
    },
  ] as const;

  return [
    {
      '@type': 'ItemList',
      '@id': `${url}#plan-decisions`,
      name: 'Nayovi pricing plan decisions for manga and manhwa translation',
      itemListElement: planDecisionItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#referral-quality`,
      name: 'Nayovi referral quality signals before checkout',
      itemListElement: referralQualityItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

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
        structuredDataGraph: pricingStructuredData(),
      }
    ),
});

function RouteComponent() {
  const tokenPacks = Route.useLoaderData();

  return <PagePricing tokenPacks={tokenPacks} />;
}
