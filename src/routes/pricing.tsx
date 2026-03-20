import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PagePricing } from '@/features/public/page-pricing';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/pricing')({
  component: RouteComponent,
  loader: () => getPublicTokenPacks(),
  head: () =>
    buildPublicPageHead(
      'Pricing',
      'Public token-pack pricing for Tachiyomi Back, backed by the real seeded token-pack records.'
    ),
});

function RouteComponent() {
  const tokenPacks = Route.useLoaderData();

  return <PagePricing tokenPacks={tokenPacks} />;
}
