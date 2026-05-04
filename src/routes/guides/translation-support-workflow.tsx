import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageTranslationSupportWorkflow } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/translation-support-workflow')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Manga IA Translation Support Workflow',
      'A permission-safe manga IA translation workflow for TachiyomiAT hosted OCR, glossary control, human review, contributor credit, manhwa translate ia support, and takedown-ready handling.',
      '/guides/translation-support-workflow',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga ia translation workflow',
          'manhwa ia translation workflow',
          'manhua ia translation workflow',
          'hosted OCR translation workflow',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageTranslationSupportWorkflow />;
}
