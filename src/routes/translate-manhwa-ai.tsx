import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import {
  PageTranslateManhwaAi,
  translateManhwaAiFaqs,
} from '@/features/public/page-translate-manhwa-ai';

const translateManhwaAiStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/translate-manhwa-ai');
  const qualifiedActivationItems = [
    {
      name: 'Official Android APK source',
      description:
        'Readers and reviewers should start from tachiyomiat.com or nayovi.com so APK download, pricing, support, privacy, terms, and responsible-use context stay attached.',
    },
    {
      name: 'Free trial before paid token plans',
      description:
        'Nayovi gives readers a way to test hosted OCR and AI translation before choosing a monthly token plan for repeat manga, manhwa, or manhua translation.',
    },
    {
      name: 'Review code or pilot code for partners',
      description:
        'Editors, affiliates, communities, creator platforms, and localization teams can request dedicated access for approved samples before publishing or expanding a pilot.',
    },
    {
      name: 'Permission-safe translation workflow',
      description:
        'Nayovi does not host or distribute chapters; it supports OCR and translation for owned, public-domain, official-sample, or permission-approved content.',
    },
  ] as const;
  const partnerHandoffItems = [
    {
      name: 'Editorial review or roundup',
      description:
        'Route readers to the official APK, review-code path, pricing page, support route, and responsible-use note before recommending an install.',
    },
    {
      name: 'AI-tool or APK directory',
      description:
        'Use source-of-truth Nayovi links for the app listing so support, package details, monthly token plans, and cancellation context remain current.',
    },
    {
      name: 'Creator or community pilot',
      description:
        'Use a dedicated redeem code, approved sample scope, and support route so activation quality can be measured before promoting paid use.',
    },
  ] as const;
  const renewalProofItems = [
    {
      name: 'Repeat title or workflow',
      description:
        'Treat a reader, reviewer, affiliate, or community pilot as high quality when the same Android translation workflow is useful after the first trial.',
    },
    {
      name: 'Supportable official setup',
      description:
        'Keep APK download, activation, pricing, support, cancellation, and responsible-use context on official Nayovi pages before asking for renewal or recommendation.',
    },
    {
      name: 'Permission-safe material',
      description:
        'Use renewal, review, and partner claims only around owned, public-domain, official-sample, or permission-approved material.',
    },
  ] as const;
  const replyPacketItems = [
    {
      name: 'Directory listing reply',
      description:
        'Advance only when the editor can preserve official APK source links, pricing summary, support route, screenshots, and responsible-use context.',
    },
    {
      name: 'Hands-on reviewer reply',
      description:
        'Issue review access only after demo proof, approved sample scope, pricing context, and no-pay-for-coverage terms are clear.',
    },
    {
      name: 'Approved-sample partner reply',
      description:
        'Move to a pilot only after sample owner, language pair, success metric, support path, and stop condition are defined.',
    },
  ] as const;
  const placementFilterItems = [
    {
      name: 'Decline mirror-first APK placement',
      description:
        'Skip listings that make a third-party APK page the main source instead of preserving official Nayovi hash checks, support, pricing, and policy links.',
    },
    {
      name: 'Decline reciprocal or paid-link gates',
      description:
        'Reject placements that require dofollow backlinks, badges, paid placement, review swaps, hidden redirects, or ranking promises before evaluation.',
    },
    {
      name: 'Hold unqualified AI traffic',
      description:
        'Avoid mentions that cannot explain Android install intent, free trial fit, monthly token plans, support expectations, and permission-safe test material.',
    },
  ] as const;
  const diligenceItems = [
    {
      name: 'Rights-safe sample scope',
      description:
        'Evaluate Nayovi only with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved pages.',
    },
    {
      name: 'Evidence before claims',
      description:
        'Use the narrated demo, screenshots, OCR checklist, pricing page, and support path before public promotion or commercial discussion.',
    },
    {
      name: 'Separated revenue signals',
      description:
        'Keep normal checkout, reviewer codes, affiliate referrals, and approved-sample pilots separate so paid demand is not mixed with evaluation access.',
    },
  ] as const;

  return [
    ...buildPublicFaqStructuredData(
      '/translate-manhwa-ai',
      translateManhwaAiFaqs
    ),
    {
      '@type': 'ItemList',
      '@id': `${url}#qualified-activation-signals`,
      name: 'Nayovi qualified activation signals for manhwa AI translation',
      itemListElement: qualifiedActivationItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#partner-handoff`,
      name: 'Nayovi partner handoff paths for Android manhwa translation',
      itemListElement: partnerHandoffItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#renewal-proof`,
      name: 'Nayovi renewal proof signals for Android manhwa translation',
      itemListElement: renewalProofItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-packet`,
      name: 'Nayovi reply packet for directory, reviewer, and partner follow-up',
      itemListElement: replyPacketItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#placement-filter`,
      name: 'Nayovi placement filter for backlink and directory quality',
      itemListElement: placementFilterItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#diligence-packet`,
      name: 'Nayovi diligence packet for publishers, partners, and investors',
      itemListElement: diligenceItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/translate-manhwa-ai')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'AI Manhwa Translator',
      'Use Nayovi as an AI manhwa translator for Android readers coming from TachiyomiAT, Tachiyomi, and Mihon-style workflows with hosted OCR, manga and manhua translation support, redeem-code activation, and APK download.',
      '/translate-manhwa-ai',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT manhwa translator',
          'Tachiyomi manhwa translator',
          'Mihon manhwa translator',
          'AI manhwa translator',
          'manhwa AI translator',
          'translate manhwa AI',
          'free manhwa AI translator',
          'manga AI translator app',
          'manhua AI translator',
          'Android manhwa translator',
        ],
        structuredDataGraph: translateManhwaAiStructuredData(),
        type: 'manhwa',
      }
    ),
});

function RouteComponent() {
  return <PageTranslateManhwaAi />;
}
