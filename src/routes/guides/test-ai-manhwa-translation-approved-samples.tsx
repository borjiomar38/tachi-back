import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageApprovedSampleTestingGuide } from '@/features/public/page-ethical-guides';

const approvedSampleStructuredData = () => {
  const url = buildPublicAbsoluteUrl(
    '/guides/test-ai-manhwa-translation-approved-samples'
  );
  const steps = [
    {
      name: 'Choose approved source material',
      text: 'Use owned, public-domain, official-preview, creator-provided, or written-permission samples before running OCR or AI translation.',
    },
    {
      name: 'Record the test scope',
      text: 'Document title, language pair, page count, rights context, reviewer role, and whether access uses a trial, review code, or pilot code.',
    },
    {
      name: 'Check OCR before translation',
      text: 'Review text detection, reading order, merged bubbles, vertical text, and glossary terms before judging translated output.',
    },
    {
      name: 'Review privately before sharing',
      text: 'Keep original OCR, corrected OCR, glossary notes, and final output together for human review before public screenshots or notes.',
    },
    {
      name: 'Decide whether to publish, continue, or stop',
      text: 'Share only approved excerpts or summaries, continue when the workflow creates qualified demand, and stop when rights or quality are unclear.',
    },
  ] as const;

  return [
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline:
        'How to test AI manhwa translation safely with approved samples',
      description:
        'A permission-safe guide for testing AI manhwa, manga, and manhua translation with approved samples, OCR review, private QA, review codes, and partner pilot decisions.',
      mainEntityOfPage: {
        '@id': `${url}#webpage`,
      },
      about: [
        'AI manhwa translation',
        'approved manga samples',
        'manga OCR testing',
        'permission-safe translation pilot',
      ],
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#how-to`,
      name: 'How to test AI manhwa translation safely with approved samples',
      step: steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    },
  ];
};

export const Route = createFileRoute(
  '/guides/test-ai-manhwa-translation-approved-samples'
)({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Test AI Manhwa Translation Safely',
      'Learn how reviewers, creators, communities, and partners can test AI manhwa translation with approved samples, OCR review, private QA, review codes, and responsible sharing decisions.',
      '/guides/test-ai-manhwa-translation-approved-samples',
      {
        keywords: [
          ...publicSeoKeywords,
          'test AI manhwa translation',
          'approved manga samples',
          'permission safe manga translation',
          'manhwa OCR testing',
          'AI manga translation review code',
        ],
        structuredDataGraph: approvedSampleStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageApprovedSampleTestingGuide />;
}
