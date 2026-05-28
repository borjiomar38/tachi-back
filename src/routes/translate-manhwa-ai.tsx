import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import {
  PageTranslateManhwaAi,
  translateManhwaAiFaqs,
} from '@/features/public/page-translate-manhwa-ai';

const translateManhwaAiStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/translate-manhwa-ai');
  const qualifiedActivationItems = [
    {
      name: 'Official Android APK source',
      description:
        'Readers and reviewers should start from tachiyomiat.com or nayovi.com so APK download, pricing, support, privacy, terms, and responsible-use context stay attached.',
    },
    {
      name: 'Free trial before paid token plans',
      description:
        'Nayovi gives readers a way to test hosted OCR and AI translation before choosing a monthly token plan for repeat manga, manhwa, or manhua translation.',
    },
    {
      name: 'Review code or pilot code for partners',
      description:
        'Editors, affiliates, communities, creator platforms, and localization teams can request dedicated access for approved samples before publishing or expanding a pilot.',
    },
    {
      name: 'Permission-safe translation workflow',
      description:
        'Nayovi does not host or distribute chapters; it supports OCR and translation for owned, public-domain, official-sample, or permission-approved content.',
    },
  ] as const;
  const partnerHandoffItems = [
    {
      name: 'Editorial review or roundup',
      description:
        'Route readers to the official APK, review-code path, pricing page, support route, and responsible-use note before recommending an install.',
    },
    {
      name: 'AI-tool or APK directory',
      description:
        'Use source-of-truth Nayovi links for the app listing so support, package details, monthly token plans, and cancellation context remain current.',
    },
    {
      name: 'Creator or community pilot',
      description:
        'Use a dedicated redeem code, approved sample scope, and support route so activation quality can be measured before promoting paid use.',
    },
  ] as const;

  return [
    ...buildPublicFaqStructuredData(
      '/translate-manhwa-ai',
      translateManhwaAiFaqs
    ),
    {
      '@type': 'ItemList',
      '@id': `${url}#qualified-activation-signals`,
      name: 'Nayovi qualified activation signals for manhwa AI translation',
      itemListElement: qualifiedActivationItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#partner-handoff`,
      name: 'Nayovi partner handoff paths for Android manhwa translation',
      itemListElement: partnerHandoffItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/translate-manhwa-ai')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'AI Manhwa Translator',
      'Use Nayovi as an AI manhwa translator for Android readers coming from TachiyomiAT, Tachiyomi, and Mihon-style workflows with hosted OCR, manga and manhua translation support, redeem-code activation, and APK download.',
      '/translate-manhwa-ai',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT manhwa translator',
          'Tachiyomi manhwa translator',
          'Mihon manhwa translator',
          'AI manhwa translator',
          'manhwa AI translator',
          'translate manhwa AI',
          'free manhwa AI translator',
          'manga AI translator app',
          'manhua AI translator',
          'Android manhwa translator',
        ],
        structuredDataGraph: translateManhwaAiStructuredData(),
        type: 'manhwa',
      }
    ),
});

function RouteComponent() {
  return <PageTranslateManhwaAi />;
}
