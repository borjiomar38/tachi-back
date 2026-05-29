import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageTranslationSupportWorkflow } from '@/features/public/page-ethical-guides';

const translationWorkflowStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/guides/translation-support-workflow');
  const queue = [
    {
      name: 'Ready after cap reset',
      description:
        'Use official public contact paths for approved-sample partner inquiries that ask for workflow feedback rather than catalog access or backlink placement.',
    },
    {
      name: 'Needs packet first',
      description:
        'Prepare screenshots, APK metadata, pricing, support, and review-code context before AI-tool directory, Android directory, or newsletter submissions.',
    },
    {
      name: 'Use as context only',
      description:
        'Use policy discussions, research papers, and strict communities to improve quality standards without sending a product pitch.',
    },
    {
      name: 'Hold or skip',
      description:
        'Avoid paid placement, reciprocal links, hidden support links, private data scraping, and unauthorized-catalog claims.',
    },
  ] as const;
  const capResetPacket = [
    {
      name: 'Reply-driven follow-up',
      description:
        'Prioritize qualified replies and call or review-code requests before opening new outreach.',
    },
    {
      name: 'Approved-sample partner inquiry',
      description:
        'Use the pilot brief, OCR checklist, official download page, support route, and pricing page when contacting creator platforms, publishers, localization teams, or manga communities.',
    },
    {
      name: 'Directory or newsletter submission',
      description:
        'Submit only after screenshots, APK metadata, pricing, support, responsible-use language, and review-code context are ready.',
    },
    {
      name: 'Skip weak placements',
      description:
        'Avoid paid placement, reciprocal links, hidden official support links, and pitches that imply unauthorized catalog translation.',
    },
  ] as const;
  const replyTriagePacket = [
    {
      name: 'Review-code request',
      description:
        'Route Android reviewers, directory editors, and affiliate testers to support with APK source, pricing, screenshots, demo, and responsible-use context attached.',
    },
    {
      name: 'Approved-sample pilot',
      description:
        'Ask creator platforms, publishers, localization teams, or communities to keep the first test private, sample-limited, and permission-approved.',
    },
    {
      name: 'Call or interview request',
      description:
        'Use the owner-provided contact details or ask for concrete availability only when a real editorial, partner, investor, or commercial conversation is requested.',
    },
    {
      name: 'Weak or noncompliant reply',
      description:
        'Decline paid link placement, reciprocal backlink gates, mirror-first APK uploads, catalog-translation claims, or requests that hide support and pricing context.',
    },
  ] as const;
  const replyQualificationPacket = [
    {
      name: 'High-value reply',
      description:
        'Advance replies that request review access, approved-sample pilots, technical listing packets, founder interviews, or commercial diligence tied to real testing.',
    },
    {
      name: 'Needs one clarifier',
      description:
        'Ask for sample scope, listing requirements, audience, timeline, or review-code need before sending assets, scheduling time, or involving the owner.',
    },
    {
      name: 'Owner escalation',
      description:
        'Escalate only when the next step requires a live call, commercial commitment, legal decision, custom pricing, investor materials, or the owner choosing a time.',
    },
    {
      name: 'Decline cleanly',
      description:
        'Close replies that ask for paid backlinks, reciprocal links, scraped listings, mirror-first APK uploads, hidden pricing, or unauthorized catalog translation.',
    },
  ] as const;
  const qualifiedReplyAssets = [
    {
      name: 'Reviewer or directory packet',
      description:
        'Send the official APK source, narrated demo, screenshots, pricing summary, support path, responsible-use note, and a dedicated review-code route.',
    },
    {
      name: 'Approved-sample partner packet',
      description:
        'Send the pilot brief, OCR checklist, sample intake fields, stop conditions, private-result boundary, and support route before issuing a pilot code.',
    },
    {
      name: 'Investor or commercial packet',
      description:
        'Send only qualified traction, activation, retention, paid-plan, and partnership signals; escalate when custom terms, legal review, or founder time is required.',
    },
    {
      name: 'Clean decline packet',
      description:
        'Use a concise refusal when the request depends on paid links, reciprocal placement, hidden pricing, mirror-first APK distribution, or unauthorized catalog processing.',
    },
  ] as const;
  const revenueRoutingPacket = [
    {
      name: 'Review access',
      description:
        'Send a review code only when the contact can publish, list, test, or compare Nayovi with official links, responsible-use context, and source-of-truth APK details intact.',
    },
    {
      name: 'Partner pilot',
      description:
        'Offer a pilot code when a creator platform, publisher, localization team, or community can define approved samples, evaluation goals, and private-result boundaries.',
    },
    {
      name: 'Paid-plan signal',
      description:
        'Route repeat-reader, affiliate, or directory traffic toward free trial, pricing, support, and monthly token-plan evidence before treating the placement as qualified.',
    },
    {
      name: 'Investor or commercial signal',
      description:
        'Escalate only when the reply asks for traction, retention, partnership economics, founder time, or terms that could change business, legal, or pricing commitments.',
    },
  ] as const;
  const officialFormPacket = [
    {
      name: 'Use official forms only',
      description:
        'Submit through the public business, partnership, or contact form when no direct business email is verified; do not guess staff addresses or scrape private contacts.',
    },
    {
      name: 'Lead with the useful asset',
      description:
        'Open with the approved-sample pilot brief, OCR checklist, or reviewer packet so the form note is useful even if the recipient never lists or reviews Nayovi.',
    },
    {
      name: 'Ask for one clear next step',
      description:
        'Ask whether a small approved-sample workflow note or private pilot is useful; avoid backlink, catalog translation, replacement-localization, or paid-placement requests.',
    },
    {
      name: 'Log submission evidence',
      description:
        'Record the form URL, organization fit, message summary, date, and follow-up guardrail without storing private confirmation tokens or form-session data.',
    },
  ] as const;

  return [
    {
      '@type': 'ItemList',
      '@id': `${url}#submission-queue`,
      name: 'Nayovi outreach submission queue',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: queue.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#cap-reset-packet`,
      name: 'Nayovi cap-reset outreach packet',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: capResetPacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-triage`,
      name: 'Nayovi reply triage packet',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: replyTriagePacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-qualification`,
      name: 'Nayovi reply qualification matrix',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: replyQualificationPacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#qualified-reply-assets`,
      name: 'Nayovi qualified reply asset bundle',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: qualifiedReplyAssets.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#revenue-routing`,
      name: 'Nayovi reply revenue routing packet',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: revenueRoutingPacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#official-form-handoff`,
      name: 'Nayovi official form outreach handoff',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: officialFormPacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/guides/translation-support-workflow')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Manga AI Translation Support Workflow',
      'A permission-safe manga AI translation workflow for Nayovi hosted OCR, glossary control, reviewer QA, source-of-truth links, manhwa translate ai support, and takedown-ready handling.',
      '/guides/translation-support-workflow',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga ai translation workflow',
          'manhwa ai translation workflow',
          'manhua ai translation workflow',
          'hosted OCR translation workflow',
        ],
        structuredDataGraph: translationWorkflowStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageTranslationSupportWorkflow />;
}
