import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageTranslationSupportWorkflow } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/translation-support-workflow')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Translation Support Workflow',
      'A permission-safe translation workflow for TachiyomiAT hosted OCR, glossary control, human review, contributor credit, and takedown-ready support.',
      '/guides/translation-support-workflow'
    ),
});

function RouteComponent() {
  return <PageTranslationSupportWorkflow />;
}
