import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { envClient } from '@/env/client';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
} from '@/server/http/route-utils';
import {
  createMobileSubscriptionCheckout,
  MobileCheckoutError,
} from '@/server/mobile-auth/checkout';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
} from '@/server/mobile-auth/session';
import { CheckoutError } from '@/server/payments/checkout';

export const Route = createFileRoute('/api/mobile/subscription/checkout/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);

        if (envClient.VITE_IS_DEMO) {
          return buildApiErrorResponse({
            code: 'demo_mode',
            requestId: context.requestId,
            status: 405,
          });
        }

        const payload: unknown = await request.json().catch(() => null);
        if (payload === null) {
          return buildInvalidRequestResponse(context.requestId);
        }

        try {
          const auth = request.headers.get('authorization')
            ? await authenticateMobileAccessToken(request)
            : null;
          const checkout = await createMobileSubscriptionCheckout(
            auth,
            payload
          );

          return buildApiOkResponse(checkout, {
            requestId: context.requestId,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return buildInvalidRequestResponse(
              context.requestId,
              error.flatten()
            );
          }

          if (error instanceof MobileAuthError) {
            return buildApiErrorResponse({
              code: error.code,
              requestId: context.requestId,
              status: error.statusCode,
            });
          }

          if (
            error instanceof MobileCheckoutError ||
            error instanceof CheckoutError
          ) {
            return buildApiErrorResponse({
              code: error.code,
              requestId: context.requestId,
              status:
                error instanceof MobileCheckoutError
                  ? error.statusCode
                  : error.status,
            });
          }

          throw error;
        }
      },
    },
  },
});
