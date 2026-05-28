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
