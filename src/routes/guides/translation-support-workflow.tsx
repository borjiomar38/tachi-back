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
  const capResetPacket = [
    {
      name: 'Reply-driven follow-up',
      description:
        'Prioritize qualified replies and call or review-code requests before opening new outreach.',
    },
    {
      name: 'Approved-sample partner inquiry',
      description:
        'Use the pilot brief, OCR checklist, official download page, support route, and pricing page when contacting creator platforms, publishers, localization teams, or manga communities.',
    },
    {
      name: 'Directory or newsletter submission',
      description:
        'Submit only after screenshots, APK metadata, pricing, support, responsible-use language, and review-code context are ready.',
    },
    {
      name: 'Skip weak placements',
      description:
        'Avoid paid placement, reciprocal links, hidden official support links, and pitches that imply unauthorized catalog translation.',
    },
  ] as const;
  const replyTriagePacket = [
    {
      name: 'Review-code request',
      description:
        'Route Android reviewers, directory editors, and affiliate testers to support with APK source, pricing, screenshots, demo, and responsible-use context attached.',
    },
    {
      name: 'Approved-sample pilot',
      description:
        'Ask creator platforms, publishers, localization teams, or communities to keep the first test private, sample-limited, and permission-approved.',
    },
    {
      name: 'Call or interview request',
      description:
        'Use the owner-provided contact details or ask for concrete availability only when a real editorial, partner, investor, or commercial conversation is requested.',
    },
    {
      name: 'Weak or noncompliant reply',
      description:
        'Decline paid link placement, reciprocal backlink gates, mirror-first APK uploads, catalog-translation claims, or requests that hide support and pricing context.',
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
    {
      '@type': 'ItemList',
      '@id': `${url}#cap-reset-packet`,
      name: 'Nayovi cap-reset outreach packet',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: capResetPacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-triage`,
      name: 'Nayovi reply triage packet',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: replyTriagePacket.map((item, index) => ({
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
