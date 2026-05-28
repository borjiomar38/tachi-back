import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PagePermissionSafePilotBrief } from '@/features/public/page-ethical-guides';

const pilotStructuredData = () => {
  const url = buildPublicAbsoluteUrl(
    '/guides/permission-safe-manga-translation-pilot'
  );
  const pilotSteps = [
    {
      name: 'Confirm approved sample scope',
      text: 'Name the sample pages, language pair, rights context, reviewer role, and permission status before any OCR or translation test.',
    },
    {
      name: 'Separate pilot access',
      text: 'Use a dedicated review or pilot redeem code so support questions, usage, and conversion signals are not mixed with normal reader trials.',
    },
    {
      name: 'Review OCR and translation evidence',
      text: 'Check OCR coverage, reading order, glossary consistency, translation draft quality, and reviewer corrections before sharing any result.',
    },
    {
      name: 'Decide whether to continue',
      text: 'Continue only when rights are clear and the pilot creates useful OCR evidence, qualified installs, affiliate interest, or a partner conversation.',
    },
  ] as const;
  const decisionItems = [
    {
      name: 'Proceed to review',
      text: 'Move forward when the partner approves the sample, OCR issues are minor, reviewer corrections are documented, and public wording can preserve credits and source boundaries.',
    },
    {
      name: 'Proceed to private pilot',
      text: 'Keep the pilot private when the workflow is useful but screenshots, translated pages, or partner names are not approved for public citation.',
    },
    {
      name: 'Pause and fix',
      text: 'Pause when OCR misses key dialogue, glossary drift changes terms, support cannot reproduce activation, or the partner cannot identify a useful reader outcome.',
    },
    {
      name: 'Stop outreach',
      text: 'Stop when source rights are unclear, the sample owner is not involved, paid link placement is requested, or the review would imply unauthorized catalog translation.',
    },
  ] as const;

  return [
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: 'Permission-safe manga translation pilot brief',
      description:
        'A concise approved-sample pilot brief for evaluating Nayovi Android hosted OCR and AI translation workflows with creators, publishers, reviewers, and localization partners.',
      mainEntityOfPage: {
        '@id': `${url}#webpage`,
      },
      about: [
        'manga translation pilot',
        'approved sample OCR review',
        'manhwa translation workflow',
        'Android manga translator review',
      ],
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#pilot-howto`,
      name: 'How to run a permission-safe manga translation pilot',
      description:
        'A four-step approved-sample workflow for testing Nayovi Android hosted OCR and AI translation with creators, publishers, reviewers, and localization partners.',
      mainEntityOfPage: {
        '@id': `${url}#webpage`,
      },
      step: pilotSteps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#pilot-checklist`,
      name: 'Permission-safe pilot readiness checklist',
      itemListElement: pilotSteps.map((step, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: step.name,
        description: step.text,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#pilot-decision-packet`,
      name: 'Permission-safe pilot decision packet',
      itemListElement: decisionItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.text,
      })),
    },
  ];
};

export const Route = createFileRoute(
  '/guides/permission-safe-manga-translation-pilot'
)({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Permission-Safe Manga Translation Pilot Brief',
      'A permission-safe manga, manhwa, and manhua translation pilot brief for approved samples, Android review codes, hosted OCR evaluation, and responsible partner feedback.',
      '/guides/permission-safe-manga-translation-pilot',
      {
        keywords: [
          ...publicSeoKeywords,
          'manga translation pilot',
          'permission safe manga translation',
          'approved sample OCR review',
          'publisher manga translation workflow',
          'creator translation feedback',
        ],
        structuredDataGraph: pilotStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PagePermissionSafePilotBrief />;
}
