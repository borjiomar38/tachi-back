import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageFreeTrialVsTokenPlanGuide } from '@/features/public/page-ethical-guides';

const trialTokenPlanStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/guides/free-trial-vs-paid-token-plan');
  const decisionSteps = [
    {
      name: 'Install from the official APK source',
      text: 'Start from the Nayovi download page so the APK source, support path, pricing context, and mirror boundary stay attached.',
    },
    {
      name: 'Use the free trial for a small approved test',
      text: 'Confirm activation, OCR coverage, translation readability, and source permission before paying.',
    },
    {
      name: 'Upgrade only when translation repeats',
      text: 'Choose a monthly token plan when the same reader, title, group, or language pair creates recurring hosted OCR and AI translation demand.',
    },
    {
      name: 'Request a code for public review or partner tests',
      text: 'Use a dedicated review, affiliate, or pilot code when the test needs attribution, screenshots, support tracking, or approved-sample evidence.',
    },
  ] as const;
  const fitSignals = [
    {
      name: 'Free trial fit',
      description:
        'Best for one small permitted test of install, activation, OCR quality, and translation readability.',
    },
    {
      name: 'Paid token plan fit',
      description:
        'Best when manga, manhwa, or manhua translation becomes a recurring Android workflow with support and device recovery needs.',
    },
    {
      name: 'Review or pilot code fit',
      description:
        'Best for reviewers, affiliates, communities, creators, publishers, and directories that need trackable access before a public mention.',
    },
  ] as const;
  const checkoutProofSignals = [
    {
      name: 'Before paying',
      description:
        'Confirm the sample is permitted, translation quality is repeatable, token volume matches expected use, and support can handle activation or device recovery.',
    },
    {
      name: 'Before referring',
      description:
        'Attach the official APK source, pricing page, support route, responsible-use note, and review-code option to public referrals.',
    },
    {
      name: 'Before piloting',
      description:
        'Use a dedicated code and approved sample when a partner needs private evidence before screenshots, articles, listings, or recommendations.',
    },
  ] as const;
  const recoverySignals = [
    {
      name: 'Activation support',
      description:
        'Keep the order email, redeem code, device type, and activation screenshot ready so support can resolve account or code issues.',
    },
    {
      name: 'Device recovery',
      description:
        'Use support for legitimate device changes instead of sharing a code or buying duplicate access before the account history is checked.',
    },
    {
      name: 'Review code separation',
      description:
        'Give reviewers, affiliates, directories, and partners a dedicated code so evaluation access stays separate from normal paid reader usage.',
    },
  ] as const;

  return [
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: 'Free trial vs paid token plan for manga translation',
      description:
        'A decision guide for using Nayovi free trial access, monthly token plans, review codes, and approved-sample pilot codes for Android manga, manhwa, and manhua translation.',
      mainEntityOfPage: {
        '@id': `${url}#webpage`,
      },
      about: [
        'manga translation token plan',
        'free manga AI translator',
        'Android manga translator pricing',
        'manhwa translation free trial',
      ],
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#decision-path`,
      name: 'How to choose between Nayovi free trial and paid token plans',
      step: decisionSteps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#fit-signals`,
      name: 'Nayovi trial, paid plan, and review code fit signals',
      itemListElement: fitSignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#checkout-proof`,
      name: 'Nayovi checkout and referral proof checks',
      itemListElement: checkoutProofSignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#support-recovery`,
      name: 'Nayovi paid plan support and recovery checks',
      itemListElement: recoverySignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/guides/free-trial-vs-paid-token-plan')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Free Trial vs Paid Token Plan for Manga Translation',
      'Decide when to use Nayovi free trial access, monthly token plans, review codes, or approved-sample pilot codes for Android manga, manhwa, and manhua translation.',
      '/guides/free-trial-vs-paid-token-plan',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga translation token plan',
          'free manga AI translator trial',
          'manhwa translation pricing',
          'AI manga translator free trial',
          'Android manga translator token plan',
        ],
        structuredDataGraph: trialTokenPlanStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageFreeTrialVsTokenPlanGuide />;
}
