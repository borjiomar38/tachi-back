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
      name: 'How to translate manhwa and manga on Android with Nayovi',
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
      name: 'How to translate manhwa and manga chapters on Android with Nayovi',
      description:
        'Install Nayovi, open a manhwa, manga, or manhua chapter, choose your language, and read the translation in the Android app.',
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
      'How to Translate Manhwa & Manga on Android',
      'Install Nayovi, open a manhwa, manga, or manhua chapter, choose your language, and keep reading the translation inside the Android app.',
      '/how-it-works',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT setup',
          'Tachiyomi manga translator setup',
          'Mihon AI translator setup',
          'how manga translate ai works',
          'how manhwa translate ai works',
          'translate manga on Android',
          'Android manhua translator',
        ],
        structuredDataGraph: activationStructuredData(),
        titleSuffix: 'Nayovi',
      }
    ),
});

function RouteComponent() {
  return <PageHowItWorks />;
}
