import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageComicOcrChecklist } from '@/features/public/page-ethical-guides';

const checklistStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/guides/comic-ocr-translation-checklist');
  const faqItems = [
    {
      title: 'Does Nayovi host or distribute manga chapters?',
      description:
        'No. Nayovi supports OCR and translation workflow on Android for owned or approved samples. It does not host chapters, mirror libraries, or third-party catalogs.',
    },
    {
      title: 'Which content can be reviewed with this checklist?',
      description:
        'Use owned material, public-domain works, official previews, creator-provided samples, or explicit rights-holder permission. Skip unauthorized scans, paid chapter pages, and catalog leaks.',
    },
    {
      title: 'Should I use a free trial first?',
      description:
        'Yes. For most first-time users and technical evaluators, start with a free trial to validate install, activation, OCR completeness, and permission-safe workflow fit.',
    },
    {
      title: 'When should a reader move to paid token plans?',
      description:
        'Only after repeat, approved use indicates a recurring workflow need for hosted OCR and translation support on Android.',
    },
    {
      title: 'Can this page be used without sharing product links?',
      description:
        'Yes. Share the checklist and quality gates first, then add official links only when the audience asks for implementation details.',
    },
  ] as const;

  const steps = [
    {
      name: 'Confirm sample permission',
      description:
        'Identify whether the comic, manga, manhwa, or manhua sample is owned, public-domain, an official preview, creator-provided, or otherwise approved before any OCR review.',
    },
    {
      name: 'Check OCR coverage',
      description:
        'Review speech bubbles, narration boxes, vertical text, sound effects, small labels, and missing text regions before judging translation output.',
    },
    {
      name: 'Review reading order and grouping',
      description:
        'Verify that text blocks follow the correct panel order and do not merge unrelated speakers, captions, or long-strip panels.',
    },
    {
      name: 'Apply glossary review',
      description:
        'Track names, places, ranks, techniques, honorifics, and recurring terms so approved samples remain consistent.',
    },
    {
      name: 'Decide whether sharing is allowed',
      description:
        'Share or cite results only when rights context is clear, OCR coverage is acceptable, human correction notes are preserved, and public examples are approved.',
    },
  ] as const;
  const researchChecks = [
    {
      name: 'Missing OCR regions',
      description:
        'Compare detected text blocks against the full approved page so dialogue, captions, sound effects, and small notes are not skipped.',
    },
    {
      name: 'Merged speakers or under-segmented balloons',
      description:
        'Flag OCR blocks that combine multiple speakers, captions, or dialogue turns before sending text to translation.',
    },
    {
      name: 'Transcription drift',
      description:
        'Keep the original OCR text visible for human correction when stylized lettering, vertical text, or low-contrast pages are misread.',
    },
    {
      name: 'Citation boundary',
      description:
        'Use current manga OCR research as background for reviewer checks only, without implying external endorsement of Nayovi.',
    },
  ] as const;
  const outreachPacketChecks = [
    {
      name: 'Send the checklist before a product link',
      description:
        'Lead with sample permission, OCR coverage, reading order, glossary review, and affiliation disclosure before sending an APK or product URL.',
    },
    {
      name: 'Include Nayovi only when implementation details are welcome',
      description:
        'Add the official download or review packet only when a maintainer, editor, directory reviewer, or partner asks for an Android hosted OCR workflow path.',
    },
    {
      name: 'Stop on unsafe placement requirements',
      description:
        'Do not continue if the target requires paid links, reciprocal badges, mirror-first APK distribution, unauthorized chapter examples, or undisclosed promotion.',
    },
  ] as const;

  return [
    {
      '@type': 'ItemList',
      '@id': `${url}#checklist`,
      name: 'Comic OCR translation QA checklist',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: steps.map((step, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: step.name,
        description: step.description,
      })),
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: 'How to review comic OCR translation quality',
      description:
        'A neutral workflow for checking permission scope, OCR coverage, reading order, glossary consistency, and responsible sharing decisions for approved comic, manga, manhwa, and manhua samples.',
      step: steps.map((step) => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#research-backed-qa`,
      name: 'Research-backed manga OCR QA checks',
      itemListElement: researchChecks.map((check, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: check.name,
        description: check.description,
      })),
      citation: 'https://arxiv.org/abs/2605.21182',
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#outreach-packet`,
      name: 'Comic OCR checklist outreach packet',
      itemListElement: outreachPacketChecks.map((check, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: check.name,
        description: check.description,
      })),
    },
    ...buildPublicFaqStructuredData(
      '/guides/comic-ocr-translation-checklist',
      faqItems
    ),
  ];
};

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
          structuredDataGraph: checklistStructuredData(),
        }
      ),
  }
);

function RouteComponent() {
  return <PageComicOcrChecklist />;
}
