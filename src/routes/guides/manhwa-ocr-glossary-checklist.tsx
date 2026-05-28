import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageManhwaOcrGlossaryChecklist } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/manhwa-ocr-glossary-checklist')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Manhwa OCR Glossary Checklist',
      'A reviewer-ready Nayovi checklist for manhwa OCR order, glossary consistency, human review decisions, approved samples, and responsible AI translation pilots.',
      '/guides/manhwa-ocr-glossary-checklist',
      {
        keywords: [
          ...publicSeoKeywords,
          'manhwa OCR checklist',
          'manga OCR glossary',
          'AI manhwa translation review',
          'approved sample translation checklist',
        ],
      }
    ),
});

function RouteComponent() {
  return <PageManhwaOcrGlossaryChecklist />;
}
