import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageOfficialSourcesTakedown } from '@/features/public/page-ethical-guides';

export const Route = createFileRoute('/legal/official-sources-takedown')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'Official Sources and Takedown Policy',
      'TachiyomiAT policy for official sources, permission-safe content, prohibited chapter hosting, rights-holder review, and takedown requests.',
      '/legal/official-sources-takedown'
    ),
});

function RouteComponent() {
  return <PageOfficialSourcesTakedown />;
}
