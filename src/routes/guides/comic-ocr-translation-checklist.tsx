import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { buildPublicPageHead } from '@/features/public/head';
import { PageComicOcrChecklist } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/guides/comic-ocr-translation-checklist')(
  {
    component: RouteComponent,
    head: () =>
      buildPublicPageHead(
        'Comic OCR Translation QA Checklist',
        'A neutral comic, manga, manhwa, and manhua OCR translation QA checklist for approved samples, text detection, reading order, glossary review, and responsible sharing decisions.',
        '/guides/comic-ocr-translation-checklist',
        {
          keywords: [
            ...publicSeoKeywords,
            'comic OCR checklist',
            'manga OCR translation checklist',
            'manhwa OCR QA',
            'AI comic translation review',
            'manga translation quality checklist',
          ],
        }
      ),
  }
);

function RouteComponent() {
  return <PageComicOcrChecklist />;
}
