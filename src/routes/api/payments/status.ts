import { createFileRoute } from '@tanstack/react-router';

import { handlePurchaseRequest } from '@/server/payments/purchase-route';
import { getTokenPurchaseStatus } from '@/server/payments/token-purchase-claim';

export const Route = createFileRoute('/api/payments/status')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handlePurchaseRequest(request, 'status', (input) =>
          getTokenPurchaseStatus(input)
        ),
    },
  },
});
