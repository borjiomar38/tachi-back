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
  const reviewCodeGatePacket = [
    {
      name: 'Public context',
      description:
        'Confirm that any reviewer, directory, partner, or affiliate can preserve official APK, pricing, support, and responsible-use links in public context.',
    },
    {
      name: 'Test scope',
      description:
        'Ask what will be tested, which approved samples are available, and whether the result is a private evaluation, listing check, article, or partner pilot.',
    },
    {
      name: 'Tracking need',
      description:
        'Issue a dedicated code only when separated reviewer usage, pilot access, support questions, and conversion evidence improve the follow-up decision.',
    },
    {
      name: 'Stop condition',
      description:
        'Do not issue access for hidden pricing, mirror-first APK distribution, unauthorized content, paid placement, or guaranteed coverage.',
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
  const outreachThrottlePacket = [
    {
      name: 'Count same-day sends first',
      description:
        'Check the outreach send log before opening a new prospect so the daily cap is preserved for replies, review-code requests, and high-fit official contact paths.',
    },
    {
      name: 'Do not duplicate active threads',
      description:
        'Skip any prospect that was already contacted, auto-approved for a form-only path, or queued by the SEO distribution agent unless a reply changes the next action.',
    },
    {
      name: 'Prefer reply value over volume',
      description:
        'Use remaining capacity for contacts that can create review access, approved-sample pilots, credible listings, paid-plan evidence, or commercial diligence.',
    },
    {
      name: 'Log the reason for waiting',
      description:
        'When the cap is full, record the best next action and guardrail instead of sending lower-fit outreach or creating another cold draft.',
    },
  ] as const;
  const formSubmissionProofPacket = [
    {
      name: 'Public form path',
      description:
        'Record the public contact, partner, or business form URL used for a high-fit form-only prospect.',
    },
    {
      name: 'Fit rationale',
      description:
        'Note why the recipient is relevant to approved-sample OCR, reviewer access, localization QA, creator workflows, or legal manga distribution.',
    },
    {
      name: 'Message summary',
      description:
        'Log the asset offered, the single next-step ask, and the responsible-use boundary without saving private form tokens or hidden confirmation URLs.',
    },
    {
      name: 'Follow-up guardrail',
      description:
        'Wait for a reply or send at most one useful follow-up after the normal interval; skip if the form terms prohibit follow-up or the fit becomes weak.',
    },
  ] as const;
  const replyPipelinePacket = [
    {
      name: 'Waiting',
      description:
        'Leave the thread alone when there is no reply, the daily cap is full, or the only next action would be another low-context follow-up.',
    },
    {
      name: 'Send assets',
      description:
        'Send the smallest relevant packet when the contact asks for listing fields, screenshots, demo context, reviewer access, or approved-sample pilot details.',
    },
    {
      name: 'Issue tracked access',
      description:
        'Use a dedicated review or pilot code only when the source context, sample scope, public link handling, and support path are clear enough to measure.',
    },
    {
      name: 'Escalate or stop',
      description:
        'Escalate meetings, custom terms, legal or financial commitments, and investor materials; stop paid-link, mirror-first, hidden-pricing, or unauthorized-catalog threads.',
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
      '@id': `${url}#review-code-gate`,
      name: 'Nayovi review-code issuance gate',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: reviewCodeGatePacket.map((item, index) => ({
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
    {
      '@type': 'ItemList',
      '@id': `${url}#outreach-throttle`,
      name: 'Nayovi outreach throttle and duplicate guardrail',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: outreachThrottlePacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#form-submission-proof`,
      name: 'Nayovi official form submission proof packet',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: formSubmissionProofPacket.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reply-pipeline`,
      name: 'Nayovi reply pipeline ledger',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: replyPipelinePacket.map((item, index) => ({
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
