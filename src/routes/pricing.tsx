import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PagePricing } from '@/features/public/page-pricing';
import { getPublicTokenPacks } from '@/features/public/server';

const pricingStructuredData = () => {
  const pricingUrl = buildPublicAbsoluteUrl('/pricing');

  return [
    {
      '@type': 'OfferCatalog',
      '@id': `${pricingUrl}#monthly-token-plans`,
      name: 'Nayovi monthly token plans',
      itemListElement: [
        {
          '@type': 'Offer',
          name: 'Free trial access',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: pricingUrl,
          description:
            'Free trial access for testing Nayovi hosted OCR and AI translation before choosing a monthly token plan.',
          itemOffered: {
            '@type': 'SoftwareApplication',
            name: 'Nayovi Android APK',
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Android',
          },
        },
        {
          '@type': 'Offer',
          name: 'Monthly hosted OCR token plans',
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'USD',
            description:
              'Monthly token plans for recurring manga, manhwa, and manhua AI translation usage.',
          },
          availability: 'https://schema.org/InStock',
          url: pricingUrl,
          description:
            'Paid monthly Nayovi token plans for repeat Android readers, reviewer tests, affiliates, and approved sample pilots.',
          itemOffered: {
            '@type': 'SoftwareApplication',
            name: 'Nayovi Android APK',
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Android',
          },
        },
      ],
    },
    {
      '@type': 'ItemList',
      '@id': `${pricingUrl}#paid-conversion-checklist`,
      name: 'Nayovi paid conversion checklist',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Verify official APK source and activation',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Test hosted OCR with the free trial or a reviewer code',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Upgrade when repeat weekly translation justifies monthly tokens',
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: 'Use support for approved group, affiliate, or pilot redeem codes',
        },
      ],
    },
  ] satisfies Record<string, unknown>[];
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
