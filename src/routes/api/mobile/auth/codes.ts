import { createFileRoute } from '@tanstack/react-router';

import { getDeviceSavedCodes } from '@/server/mobile-auth/saved-codes';
import { PurchaseError } from '@/server/payments/purchase-policy';
import { handlePurchaseRequest } from '@/server/payments/purchase-route';

export const Route = createFileRoute('/api/mobile/auth/codes')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handlePurchaseRequest(
          request,
          'saved-codes',
          async (_input, context) => {
            if (!context.auth) throw new PurchaseError('invalid_session', 401);
            return getDeviceSavedCodes(context.auth.device.id);
          }
        ),
    },
  },
});
