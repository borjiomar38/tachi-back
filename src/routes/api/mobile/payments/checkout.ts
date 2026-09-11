import { createFileRoute } from '@tanstack/react-router';

import { handlePurchaseRequest } from '@/server/payments/purchase-route';
import { createTokenPurchaseCheckout } from '@/server/payments/token-purchase-checkout';

export const Route = createFileRoute('/api/mobile/payments/checkout')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handlePurchaseRequest(request, 'checkout', (input, context) =>
          createTokenPurchaseCheckout(input, {
            licenseId: context.auth?.license.id,
            installationId: context.auth?.device.installationId,
          })
        ),
    },
  },
});
