import { createFileRoute } from '@tanstack/react-router';

import { buildPublicPageHead } from '@/features/public/head';
import { PagePurchaseReturn } from '@/features/public/page-purchase-return';

export const Route = createFileRoute('/app_/payment')({
  component: PagePurchaseReturn,
  head: () => {
    const head = buildPublicPageHead(
      'Return to Nayovi',
      'Activate your Nayovi token purchase.',
      '/app/payment',
      { robots: 'noindex, nofollow' }
    );
    return {
      ...head,
      meta: [
        ...(head.meta ?? []),
        { name: 'referrer', content: 'no-referrer' },
      ],
    };
  },
});
