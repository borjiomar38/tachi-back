import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import {
  PageTranslationSupportWorkflow,
  translationSupportWorkflowFaqs,
} from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/translation-support-workflow')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Manhwa Translation Support for Android',
      'Get help with Nayovi manhwa, manga, and manhua translation, Android installation, trial access, activation, monthly plans, and billing.',
      '/guides/translation-support-workflow',
      {
        keywords: [
          ...publicSeoKeywords,
          'Nayovi support',
          'manhwa translation support',
          'manga translator Android help',
          'Nayovi activation help',
          'Nayovi billing support',
        ],
        structuredDataGraph: buildPublicFaqStructuredData(
          '/guides/translation-support-workflow',
          translationSupportWorkflowFaqs
        ),
        titleSuffix: 'Nayovi',
        type: 'manhwa',
      }
    ),
});

function RouteComponent() {
  return <PageTranslationSupportWorkflow />;
}
