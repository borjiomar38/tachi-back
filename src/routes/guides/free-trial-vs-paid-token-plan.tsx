import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageFreeTrialVsPaidTokenPlan } from '@/features/public/page-ethical-guides';

const tokenPlanStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/guides/free-trial-vs-paid-token-plan');
  const decisions = [
    {
      name: 'Use the free trial for fit checks',
      description:
        'Confirm official APK install, redeem-code activation, OCR coverage, translation readability, and responsible-use fit before paying.',
    },
    {
      name: 'Upgrade when translation repeats',
      description:
        'Choose a monthly token plan only when hosted OCR and manga, manhwa, or manhua translation becomes a repeat Android workflow.',
    },
    {
      name: 'Request review or pilot access',
      description:
        'Reviewers, directories, creators, publishers, and communities should use review codes or approved-sample pilots instead of personal plans.',
    },
  ] as const;

  return [
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: 'Free trial vs paid token plan for manga translation',
      description:
        'A revenue-focused guide to deciding when Nayovi free trial access is enough and when an Android manga, manhwa, or manhua translation workflow should move to a paid token plan.',
      mainEntityOfPage: {
        '@id': `${url}#webpage`,
      },
      about: [
        'manga translation pricing',
        'manhwa translation free trial',
        'AI manga translator token plan',
        'Android manga translator subscription',
      ],
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#decision-checklist`,
      name: 'Nayovi free trial to paid token plan decision checklist',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: decisions.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/guides/free-trial-vs-paid-token-plan')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Free Trial vs Paid Token Plan',
      'Decide when Nayovi free trial access is enough and when repeat Android manga, manhwa, or manhua translation should move to a monthly paid token plan.',
      '/guides/free-trial-vs-paid-token-plan',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga translation pricing',
          'manhwa translation free trial',
          'AI manga translator token plan',
          'Android manga translator subscription',
          'Nayovi pricing',
        ],
        structuredDataGraph: tokenPlanStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageFreeTrialVsPaidTokenPlan />;
}
