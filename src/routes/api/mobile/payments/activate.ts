import { createFileRoute } from '@tanstack/react-router';

import { PurchaseError } from '@/server/payments/purchase-policy';
import { handlePurchaseRequest } from '@/server/payments/purchase-route';
import {
  activateTokenPurchase,
  zPurchaseClaimInput,
} from '@/server/payments/token-purchase-claim';

export const Route = createFileRoute('/api/mobile/payments/activate')({
  server: {
    handlers: {
      POST: ({ request }) =>
        handlePurchaseRequest(request, 'activate', (input, context) => {
          const parsed = zPurchaseClaimInput().parse(input);
          if (
            context.auth &&
            context.auth.device.installationId !== parsed.installationId
          ) {
            throw new PurchaseError('purchase_device_mismatch', 403);
          }
          return activateTokenPurchase(parsed, {
            currentLicenseId: context.auth?.license.id,
            clientIp: context.clientIp,
            userAgent: context.userAgent,
          });
        }),
    },
  },
});
