import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageMihonTachiyomiAtSetupGuide } from '@/features/public/page-ethical-guides';

const tachiyomiAtSetupStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/guides/mihon-tachiyomiat-setup');
  const setupSteps = [
    {
      name: 'Start from the current Nayovi APK path',
      text: 'Readers arriving from TachiyomiAT, Tachiyomi, or Mihon searches should use Nayovi download and support pages for the hosted translation app.',
    },
    {
      name: 'Keep reader sources separate',
      text: 'Use official reader project channels for reader setup and do not treat Nayovi as a chapter source, extension list, or manga mirror.',
    },
    {
      name: 'Use permission-safe samples',
      text: 'Run OCR and translation only on owned content, public-domain pages, official samples, creator-provided pages, or material with permission.',
    },
    {
      name: 'Test activation before repeat use',
      text: 'Activate with a redeem code or trial path and translate one small sample before considering a monthly token plan.',
    },
    {
      name: 'Route review and recovery through support',
      text: 'Use support for reviewer codes, device recovery, billing questions, setup problems, and policy clarification.',
    },
  ] as const;
  const handoffSignals = [
    {
      name: 'Official install handoff',
      description:
        'Point high-intent setup traffic to the Nayovi download page so APK source, support, pricing, and no-mirror context stay attached.',
    },
    {
      name: 'Quality handoff',
      description:
        'Use the OCR checklist before judging translation quality or sending screenshots to reviewers, communities, or directories.',
    },
    {
      name: 'Revenue handoff',
      description:
        'Move from trial to pricing only when the reader has repeat, permitted translation demand rather than one curiosity test.',
    },
    {
      name: 'Partner handoff',
      description:
        'Use a dedicated review or pilot code when a creator, publisher, directory, affiliate, or editor needs separated evaluation access.',
    },
  ] as const;

  return [
    {
      '@type': 'HowTo',
      '@id': `${url}#tachiyomiat-setup-path`,
      name: 'How to map TachiyomiAT setup intent to Nayovi',
      step: setupSteps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#handoff-signals`,
      name: 'Nayovi TachiyomiAT setup handoff signals',
      itemListElement: handoffSignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/guides/mihon-tachiyomiat-setup')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Mihon and TachiyomiAT Setup Guide',
      'Set up Nayovi from the Mihon TachiyomiAT guide path for readers searching TachiyomiAT, Tachiyomi, or Mihon workflows, with Android APK download, hosted OCR, AI translation, redeem-code activation, and permission-safe setup.',
      '/guides/mihon-tachiyomiat-setup',
      {
        keywords: [
          ...publicSeoKeywords,
          'Mihon TachiyomiAT setup',
          'TachiyomiAT setup guide',
          'TachiyomiAT APK',
          'TachiyomiAT download',
          'Tachiyomi manga translator',
          'Mihon manga translator',
          'Nayovi TachiyomiAT setup',
        ],
        structuredDataGraph: tachiyomiAtSetupStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageMihonTachiyomiAtSetupGuide />;
}
