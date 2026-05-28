import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageTranslationSupportWorkflow } from '@/features/public/page-ethical-guides';

const translationWorkflowStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/guides/translation-support-workflow');
  const queue = [
    {
      name: 'Ready after cap reset',
      description:
        'Use official public contact paths for approved-sample partner inquiries that ask for workflow feedback rather than catalog access or backlink placement.',
    },
    {
      name: 'Needs packet first',
      description:
        'Prepare screenshots, APK metadata, pricing, support, and review-code context before AI-tool directory, Android directory, or newsletter submissions.',
    },
    {
      name: 'Use as context only',
      description:
        'Use policy discussions, research papers, and strict communities to improve quality standards without sending a product pitch.',
    },
    {
      name: 'Hold or skip',
      description:
        'Avoid paid placement, reciprocal links, hidden support links, private data scraping, and unauthorized-catalog claims.',
    },
  ] as const;

  return [
    {
      '@type': 'ItemList',
      '@id': `${url}#submission-queue`,
      name: 'Nayovi outreach submission queue',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: queue.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/guides/translation-support-workflow')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Manga AI Translation Support Workflow',
      'A permission-safe manga AI translation workflow for Nayovi hosted OCR, glossary control, reviewer QA, source-of-truth links, manhwa translate ai support, and takedown-ready handling.',
      '/guides/translation-support-workflow',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga ai translation workflow',
          'manhwa ai translation workflow',
          'manhua ai translation workflow',
          'hosted OCR translation workflow',
        ],
        structuredDataGraph: translationWorkflowStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageTranslationSupportWorkflow />;
}
