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
  const continuationSignals = [
    {
      name: 'Continue recurring access',
      description:
        'Renew when repeat hosted OCR usage, predictable token volume, and the same reader or language workflow justify monthly access.',
    },
    {
      name: 'Route changed needs to support',
      description:
        'Ask support before renewing when activation, device recovery, page volume, or evaluation access no longer matches the current plan.',
    },
    {
      name: 'Stop after one-off tests',
      description:
        'Do not renew when the need was a one-off permitted translation, source permission is unclear, or the approved sample failed the quality bar.',
    },
  ] as const;
  const attributionSignals = [
    {
      name: 'Normal paid checkout',
      description:
        'Use public pricing only when the reader has proven repeat translation demand after a permitted free-trial test.',
    },
    {
      name: 'Dedicated review code',
      description:
        'Use separate reviewer access when screenshots, attribution, comparison context, or reproducible evaluation steps are needed.',
    },
    {
      name: 'Qualified referral traffic',
      description:
        'Treat affiliate, directory, and community referrals as qualified only when official APK, pricing, support, cancellation, and responsible-use links remain attached.',
    },
    {
      name: 'Partner pilot code',
      description:
        'Keep creator, publisher, localization, and community pilots on approved samples with separated access and private evidence.',
    },
  ] as const;
  const commercialSignals = [
    {
      name: 'Higher-volume reader',
      description:
        'Route repeat page volume to a normal monthly plan after trial quality, source permission, and support expectations are proven.',
    },
    {
      name: 'Reviewer or affiliate',
      description:
        'Use a dedicated code and tracking note when public coverage, screenshots, comparison context, or referral quality needs measurement.',
    },
    {
      name: 'Publisher or creator partner',
      description:
        'Keep the conversation on approved samples, private evidence, commercial objective, and stop conditions before discussing custom access.',
    },
  ] as const;
  const accessGuardrailSignals = [
    {
      name: 'Discount request',
      description:
        'Use discounts only when the request can prove approved-sample evidence, qualified installs, repeat paid-use signal, or another measurable commercial outcome.',
    },
    {
      name: 'Trial extension',
      description:
        'Extend trial access only for activation recovery, device recovery, or a real reviewer test that needs more time to evaluate the official workflow.',
    },
    {
      name: 'Partner code',
      description:
        'Use a separate partner code when attribution, approved-sample feedback, support load, and paid-plan follow-up need to be measured separately.',
    },
    {
      name: 'Decline weak exceptions',
      description:
        'Decline free-access or discount requests tied to vague promotion, hidden pricing or support links, APK mirrors, or unclear source permission.',
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
    {
      '@type': 'ItemList',
      '@id': `${url}#renewal-decision`,
      name: 'Nayovi paid plan renewal decision checks',
      itemListElement: continuationSignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#access-attribution`,
      name: 'Nayovi paid checkout, review code, referral, and pilot access routing',
      itemListElement: attributionSignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#commercial-qualification`,
      name: 'Nayovi commercial upgrade and partner qualification signals',
      itemListElement: commercialSignals.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#access-guardrails`,
      name: 'Nayovi discount, trial extension, and partner code guardrails',
      itemListElement: accessGuardrailSignals.map((item, index) => ({
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
