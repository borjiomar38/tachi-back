import { createFileRoute } from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { buildPublicPageHead } from '@/features/public/head';
import { PageCheckoutSuccess } from '@/features/public/page-checkout-success';

export const Route = createFileRoute('/checkout/success')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      tokenPack: fallback(z.string(), '').optional(),
    })
  ),
  head: () =>
    buildPublicPageHead(
      'Checkout Complete',
      'Checkout completion page for TachiyomiAT manga translation token packs and redeem-code delivery.',
      '/checkout/success',
      { robots: 'noindex, nofollow' }
    ),
});

function RouteComponent() {
  const search = Route.useSearch();

  return (
    <PageCheckoutSuccess
      search={{
        tokenPack: search.tokenPack,
      }}
    />
  );
}
