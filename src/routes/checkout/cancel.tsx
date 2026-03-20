import { createFileRoute } from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { buildPublicPageHead } from '@/features/public/head';
import { PageCheckoutCancel } from '@/features/public/page-checkout-cancel';

export const Route = createFileRoute('/checkout/cancel')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      tokenPack: fallback(z.string(), '').optional(),
    })
  ),
  head: () =>
    buildPublicPageHead(
      'Checkout Cancelled',
      'Stripe checkout cancellation page for Tachiyomi Back.'
    ),
});

function RouteComponent() {
  const search = Route.useSearch();

  return <PageCheckoutCancel search={search} />;
}
