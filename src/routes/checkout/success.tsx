import { createFileRoute } from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { buildPublicPageHead } from '@/features/public/head';
import { PageCheckoutSuccess } from '@/features/public/page-checkout-success';

export const Route = createFileRoute('/checkout/success')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      session_id: fallback(z.string(), '').optional(),
      tokenPack: fallback(z.string(), '').optional(),
    })
  ),
  head: () =>
    buildPublicPageHead(
      'Checkout Complete',
      'Stripe checkout completion page for Tachiyomi Back.'
    ),
});

function RouteComponent() {
  const search = Route.useSearch();

  return (
    <PageCheckoutSuccess
      search={{
        sessionId: search.session_id,
        tokenPack: search.tokenPack,
      }}
    />
  );
}
