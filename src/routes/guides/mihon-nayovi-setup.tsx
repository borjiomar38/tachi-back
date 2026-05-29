import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageMihonNayoviSetupGuide } from '@/features/public/page-ethical-guides';

const setupStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/guides/mihon-nayovi-setup');
  const setupSteps = [
    {
      name: 'Download from the official Nayovi page',
      text: 'Use the Nayovi download page as the source of truth for APK access, build context, support, and the no-mirror boundary.',
    },
    {
      name: 'Confirm the reader workflow separately',
      text: 'Use official Mihon, Tachiyomi, or TachiyomiAT project channels for any separate reader setup and keep Nayovi focused on hosted OCR and translation support.',
    },
    {
      name: 'Check source permission',
      text: 'Translate only owned material, public-domain works, official samples, creator-provided pages, or content the reader has permission to process.',
    },
    {
      name: 'Activate and test one page',
      text: 'Use a redeem code or trial access for one small test before moving to repeat translation or a monthly token plan.',
    },
    {
      name: 'Use support for recovery',
      text: 'Route billing, redeem-code, installation, device recovery, review-code, and policy questions through Nayovi support.',
    },
  ] as const;
  const decisionSignals = [
    {
      name: 'Reader install fit',
      description:
        'The reader wants an Android-first hosted OCR translation workflow and can start from the official Nayovi APK page.',
    },
    {
      name: 'Paid plan fit',
      description:
        'The reader has repeat manga, manhwa, or manhua translation demand after a permitted trial sample works.',
    },
    {
      name: 'Reviewer or partner fit',
      description:
        'An editor, directory, creator, publisher, or community needs source-of-truth links, screenshots, responsible-use notes, and a dedicated code before public mention.',
    },
    {
      name: 'Hold signal',
      description:
        'The use case depends on unauthorized chapter sources, mirror-first APK distribution, or public examples without sample permission.',
    },
  ] as const;

  return [
    {
      '@type': 'HowTo',
      '@id': `${url}#setup-path`,
      name: 'How to set up Nayovi for Mihon and TachiyomiAT-style Android reading',
      step: setupSteps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#install-decision-signals`,
      name: 'Nayovi Mihon and TachiyomiAT setup decision signals',
      itemListElement: decisionSignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/guides/mihon-nayovi-setup')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Mihon, TachiyomiAT and Nayovi AI Translator Setup',
      'Set up Nayovi for Mihon, Tachiyomi, and TachiyomiAT-style Android reading workflows with manga translate ai, manhwa translate ai, hosted OCR, redeem-code activation, official install guidance, and permission-safe content boundaries.',
      '/guides/mihon-nayovi-setup',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT setup guide',
          'Tachiyomi setup guide',
          'Mihon manga translate ai',
          'Mihon TachiyomiAT setup',
          'Nayovi setup guide',
          'Android manhwa translator setup',
          'free manga ai translator setup',
        ],
        structuredDataGraph: setupStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageMihonNayoviSetupGuide />;
}
