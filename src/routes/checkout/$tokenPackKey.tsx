import { createFileRoute } from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { buildPublicPageHead } from '@/features/public/head';
import { PageCheckout } from '@/features/public/page-checkout';
import { getPublicTokenPackByKey } from '@/features/public/server';

export const Route = createFileRoute('/checkout/$tokenPackKey')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      email: fallback(z.string(), '').optional(),
      error: fallback(z.string(), '').optional(),
    })
  ),
  loader: ({ params }) =>
    getPublicTokenPackByKey({ data: { tokenPackKey: params.tokenPackKey } }),
  head: ({ params }) =>
    buildPublicPageHead(
      'Checkout',
      `Stripe checkout entry point for the ${params.tokenPackKey} token pack.`
    ),
});

function RouteComponent() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const tokenPack = Route.useLoaderData();

  return (
    <PageCheckout
      search={search}
      tokenPack={tokenPack}
      tokenPackKey={params.tokenPackKey}
    />
  );
}
