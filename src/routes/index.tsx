import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PageLanding } from '@/features/public/page-landing';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/')({
  component: RouteComponent,
  loader: () => getPublicTokenPacks(),
  head: () =>
    buildPublicPageHead(
      'Hosted OCR and Translation',
      'Public landing page for Tachiyomi Back, covering token packs, hosted OCR and translation, and redeem-code activation.'
    ),
});

function RouteComponent() {
  const tokenPacks = Route.useLoaderData();

  return <PageLanding tokenPacks={tokenPacks} />;
}
