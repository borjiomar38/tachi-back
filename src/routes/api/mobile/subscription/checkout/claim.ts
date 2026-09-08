import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
} from '@/server/http/route-utils';
import {
  claimMobileSubscriptionCheckout,
  MobileCheckoutError,
} from '@/server/mobile-auth/checkout';
import { MobileAuthError } from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/subscription/checkout/claim')(
  {
    server: {
      handlers: {
        POST: async ({ request }) => {
          const context = buildHttpRequestContext(request);
          const payload: unknown = await request.json().catch(() => null);

          if (payload === null) {
            return buildInvalidRequestResponse(context.requestId);
          }

          try {
            const result = await claimMobileSubscriptionCheckout(payload, {
              clientIp: context.clientIp,
              userAgent: context.userAgent,
            });

            return buildApiOkResponse(result, {
              requestId: context.requestId,
            });
          } catch (error) {
            if (error instanceof z.ZodError) {
              return buildInvalidRequestResponse(
                context.requestId,
                error.flatten()
              );
            }

            if (error instanceof MobileCheckoutError) {
              return buildApiErrorResponse({
                code: error.code,
                requestId: context.requestId,
                status: error.statusCode,
              });
            }

            if (error instanceof MobileAuthError) {
              return buildApiErrorResponse({
                code: error.code,
                requestId: context.requestId,
                status: error.statusCode,
              });
            }

            throw error;
          }
        },
      },
    },
  }
);
