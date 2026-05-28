import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { activationSteps } from '@/features/public/data';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageHowItWorks } from '@/features/public/page-how-it-works';

const activationStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/how-it-works');

  return [
    {
      '@type': 'ItemList',
      '@id': `${url}#activation-sequence`,
      name: 'Nayovi hosted manga translation activation sequence',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: activationSteps.map((step, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: step.title,
        description: step.description,
      })),
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: 'How to activate Nayovi hosted manga translation on Android',
      description:
        'Install Nayovi, choose a free or monthly token plan, receive a redeem code, activate hosted OCR and AI translation in the Android app, and translate approved manga, manhwa, or manhua chapters.',
      step: activationSteps.map((step) => ({
        '@type': 'HowToStep',
        name: step.title,
        text: step.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/how-it-works')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'How Manga Translate AI Works',
      'Learn how Nayovi manga translate ai works for TachiyomiAT, Tachiyomi, and Mihon-style Android readers: choose a plan, receive a redeem code, run hosted OCR, and translate manga, manhwa, or manhua chapters.',
      '/how-it-works',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT setup',
          'Tachiyomi manga translator setup',
          'Mihon AI translator setup',
          'how manga translate ai works',
          'how manhwa translate ai works',
          'hosted OCR manga translator',
          'redeem code manga translator',
        ],
        structuredDataGraph: activationStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageHowItWorks />;
}
