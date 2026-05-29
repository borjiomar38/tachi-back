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
  const commercialQualificationItems = [
    {
      name: 'Concrete use case',
      description:
        'Advance commercial replies when the partner names the audience, approved material, language pair, and Android hosted-OCR workflow need.',
    },
    {
      name: 'Measurable activation path',
      description:
        'Use dedicated codes, official APK links, support routing, and pricing context so activation quality can be measured separately from normal checkout traffic.',
    },
    {
      name: 'Decision-ready next step',
      description:
        'Escalate only when a reply requires custom terms, a real pilot owner, a commercial commitment, investor materials, or a meeting time.',
    },
  ] as const;
  const replyAssetItems = [
    {
      name: 'Listing packet',
      description:
        'Send only official APK source, one-line product summary, pricing context, screenshots, support route, and responsible-use note.',
    },
    {
      name: 'Reviewer packet',
      description:
        'Send narrated demo, review-code path, approved sample scope, no-pay-for-coverage language, and cancellation or support links.',
    },
    {
      name: 'Partner packet',
      description:
        'Send the pilot one-pager only when the contact can name the sample owner, language pair, success metric, and stop condition.',
    },
  ] as const;
  const sourceToCheckoutItems = [
    {
      name: 'Reader search or directory visit',
      description:
        'Route normal readers through official APK download, free trial, pricing, support, and cancellation context before monthly token-plan checkout.',
    },
    {
      name: 'Reviewer or affiliate test',
      description:
        'Use dedicated review access and demo proof so public coverage is measured separately from normal paid-reader demand.',
    },
    {
      name: 'Creator or publisher pilot',
      description:
        'Require approved samples, success metrics, and a stop condition before any commercial or founder-level discussion.',
    },
  ] as const;
  const postReplyAttributionItems = [
    {
      name: 'Listing approval signal',
      description:
        'Track whether the listing preserves official APK source, pricing, support, and responsible-use context before counting referral traffic as qualified.',
    },
    {
      name: 'Review access signal',
      description:
        'Separate review-code activations from normal checkout so public coverage can be evaluated by install confidence, support load, and repeat-use intent.',
    },
    {
      name: 'Partner pilot signal',
      description:
        'Measure approved-sample pilots by named sample scope, activation quality, follow-up request, and paid-plan fit before escalating custom terms.',
    },
  ] as const;
  const replyRevenueItems = [
    {
      name: 'Listing or directory approval',
      description:
        'Publish only when source links, pricing, support, and responsible-use context stay visible, then measure whether visitors activate trial or paid plans.',
    },
    {
      name: 'Reviewer or affiliate interest',
      description:
        'Use a dedicated code and review packet so coverage, installs, support load, and paid-plan conversion stay separate from normal checkout.',
    },
    {
      name: 'Partner or investor diligence',
      description:
        'Advance only when the thread names approved material, user segment, success metric, and the decision needed before custom terms or a call.',
    },
  ] as const;
  const replyEvidenceItems = [
    {
      name: 'Source-preserving referral',
      description:
        'Continue only when the live mention keeps readers on official APK, pricing, support, cancellation, and responsible-use pages before install.',
    },
    {
      name: 'Measured activation quality',
      description:
        'Keep review codes, affiliate links, and partner codes separate so support load, trial completion, and paid-plan intent can be read cleanly.',
    },
    {
      name: 'Revenue-ready follow-up',
      description:
        'Escalate only when the reply adds a named audience, approved sample scope, buyer path, or decision owner that can produce repeat paid use.',
    },
  ] as const;
  const replySlaItems = [
    {
      name: 'Same-day reply handling',
      description:
        'Handle replies first when they ask for listing fields, screenshots, review access, or approved-sample pilot details that can be answered from owned assets.',
    },
    {
      name: 'Hold for missing proof',
      description:
        'Pause threads that cannot preserve official source links, identify approved material, or define the activation signal before another follow-up is sent.',
    },
    {
      name: 'Escalate only real decisions',
      description:
        'Ask the founder only when the next step requires meeting times, custom terms, legal or financial commitments, investor materials, or non-routine commercial approval.',
    },
  ] as const;
  const replyFollowUpItems = [
    {
      name: 'Source path preserved',
      description:
        'Reply only when official APK, pricing, support, cancellation, and responsible-use links can stay attached to the contact path.',
    },
    {
      name: 'Access type separated',
      description:
        'Choose normal checkout, review code, affiliate attribution, or approved-sample pilot access before sending assets or issuing a code.',
    },
    {
      name: 'Evidence expected',
      description:
        'Define the proof expected from the follow-up, such as listing fields, screenshot review, activated test, qualified install, pilot notes, or a clean stop.',
    },
  ] as const;
  const accessExceptionItems = [
    {
      name: 'Discount or extended trial request',
      description:
        'Approve only when the contact names the audience, expected usage, support path, and why normal free trial or monthly token plans are not enough.',
    },
    {
      name: 'Review or affiliate code request',
      description:
        'Use dedicated access only when the public mention can preserve official source links, disclose the relationship, and separate attribution from normal checkout.',
    },
    {
      name: 'Partner pilot access request',
      description:
        'Require approved sample scope, language pair, success metric, and stop condition before issuing access or asking for founder-level terms.',
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
    {
      '@type': 'ItemList',
      '@id': `${url}#commercial-qualification`,
      name: 'Nayovi commercial qualification signals for serious replies',
      itemListElement: commercialQualificationItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-assets`,
      name: 'Nayovi proportional reply assets for directory, reviewer, and partner follow-up',
      itemListElement: replyAssetItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#source-to-checkout-routing`,
      name: 'Nayovi source-to-checkout routing for qualified referral traffic',
      itemListElement: sourceToCheckoutItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#post-reply-attribution`,
      name: 'Nayovi post-reply attribution checks for partner and directory follow-up',
      itemListElement: postReplyAttributionItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-to-revenue`,
      name: 'Nayovi reply-to-revenue routing for qualified growth follow-up',
      itemListElement: replyRevenueItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-evidence-ledger`,
      name: 'Nayovi reply evidence ledger for revenue-qualified follow-up',
      itemListElement: replyEvidenceItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-decision-sla`,
      name: 'Nayovi reply decision SLA for qualified outreach follow-up',
      itemListElement: replySlaItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-follow-up-checklist`,
      name: 'Nayovi reply follow-up checklist for proof-driven outreach',
      itemListElement: replyFollowUpItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#access-exception-gate`,
      name: 'Nayovi access exception gate for discounts, affiliate codes, and partner access',
      itemListElement: accessExceptionItems.map((item, index) => ({
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
