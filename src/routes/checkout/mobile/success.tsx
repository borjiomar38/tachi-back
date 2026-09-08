import { createFileRoute } from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { buildPublicPageHead } from '@/features/public/head';
import { PageMobileCheckoutSuccess } from '@/features/public/page-mobile-checkout-success';

export const Route = createFileRoute('/checkout/mobile/success')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      intent: fallback(z.string().min(64).max(1024), ''),
    })
  ),
  head: () =>
    buildPublicPageHead(
      'Return to Nayovi',
      'Return to Nayovi after a secure mobile subscription checkout.',
      '/checkout/mobile/success',
      { robots: 'noindex, nofollow' }
    ),
});

function RouteComponent() {
  const search = Route.useSearch();

  return <PageMobileCheckoutSuccess intent={search.intent} />;
}
