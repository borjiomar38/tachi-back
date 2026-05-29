import { createFileRoute } from '@tanstack/react-router';

import { buildPublicAbsoluteUrlFromRequest } from '@/features/public/head';

interface LlmsTxtLink {
  description: string;
  path: string;
  title: string;
}

const primaryLinks = [
  {
    title: 'Official APK download',
    path: '/download',
    description:
      'Source-of-truth Android APK download, setup, version, support, and mirror-boundary context.',
  },
  {
    title: 'Free manhwa AI translator',
    path: '/translate-manhwa-ai',
    description:
      'High-intent page for readers, reviewers, affiliates, and partners evaluating hosted OCR and AI translation.',
  },
  {
    title: 'Pricing and token plans',
    path: '/pricing',
    description:
      'Monthly token plans, free trial path, paid activation, and reader upgrade context.',
  },
  {
    title: 'Support',
    path: '/support',
    description:
      'Contact path for installation, activation, billing, reviewer codes, partner pilots, and recovery questions.',
  },
] as const satisfies readonly LlmsTxtLink[];

const guideLinks = [
  {
    title: 'Translation support workflow',
    path: '/guides/translation-support-workflow',
    description:
      'Responsible-use workflow, submission queue, reply triage, and partner-review handoff notes.',
  },
  {
    title: 'Permission-safe manga translation pilot',
    path: '/guides/permission-safe-manga-translation-pilot',
    description:
      'Approved-sample pilot brief for creators, publishers, localization teams, reviewers, and communities.',
  },
  {
    title: 'Test AI manhwa translation with approved samples',
    path: '/guides/test-ai-manhwa-translation-approved-samples',
    description:
      'Reviewer and partner checklist for evaluating OCR and translation without unauthorized catalog use.',
  },
  {
    title: 'Comic OCR translation checklist',
    path: '/guides/comic-ocr-translation-checklist',
    description:
      'Neutral OCR QA checklist covering permission scope, text detection, reading order, glossary, and human review.',
  },
  {
    title: 'Free trial vs paid token plan',
    path: '/guides/free-trial-vs-paid-token-plan',
    description:
      'Decision guide for free trials, monthly token plans, review codes, affiliate tests, and partner pilots.',
  },
] as const satisfies readonly LlmsTxtLink[];

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(
          buildLlmsTxt((path) =>
            buildPublicAbsoluteUrlFromRequest(request, path)
          ),
          {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
          }
        ),
    },
  },
});

function buildLlmsTxt(buildAbsoluteUrl: (path: string) => string) {
  return [
    '# Nayovi',
    '',
    '> Nayovi is an Android APK and hosted OCR plus AI translation workflow for manga, manhwa, and manhua readers. It supports free trial access, redeem-code activation, monthly token plans, and permission-safe testing with owned, public-domain, official-sample, or approved material.',
    '',
    'Nayovi does not host or distribute manga chapters, extension lists, or unauthorized catalogs. Editorial, directory, affiliate, and partner references should point users to the official Nayovi pages instead of APK mirrors or unofficial downloads.',
    '',
    '## Primary Pages',
    '',
    ...formatLinks(primaryLinks, buildAbsoluteUrl),
    '',
    '## Reviewer And Partner Guides',
    '',
    ...formatLinks(guideLinks, buildAbsoluteUrl),
    '',
    '## Citation Notes',
    '',
    '- Brand: Nayovi',
    '- Primary site: https://tachiyomiat.com',
    '- Brand domain: https://nayovi.com',
    '- SEO domain: https://translate-manhwa-ai.com',
    '- App category: Android manga, manhwa, and manhua OCR translation workflow',
    '- Responsible-use boundary: process only owned, public-domain, official-sample, or permission-approved content',
    '',
  ].join('\n');
}

function formatLinks(
  links: readonly LlmsTxtLink[],
  buildAbsoluteUrl: (path: string) => string
) {
  return links.map(
    (link) =>
      `- [${link.title}](${buildAbsoluteUrl(link.path)}): ${link.description}`
  );
}
