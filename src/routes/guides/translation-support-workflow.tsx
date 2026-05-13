import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageTranslationSupportWorkflow } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/translation-support-workflow')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Manga AI Translation Support Workflow',
      'A permission-safe manga AI translation workflow for Nayovi hosted OCR, glossary control, human review, contributor credit, manhwa translate ai support, and takedown-ready handling.',
      '/guides/translation-support-workflow',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga ai translation workflow',
          'manhwa ai translation workflow',
          'manhua ai translation workflow',
          'hosted OCR translation workflow',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageTranslationSupportWorkflow />;
}
