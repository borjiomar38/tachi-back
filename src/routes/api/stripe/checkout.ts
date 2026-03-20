import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { consumeCheckoutCreateRateLimit } from '@/server/hardening/rate-limit';
import {
  buildHttpRequestContext,
  buildTextResponse,
  redirectWithRequestId,
} from '@/server/http/route-utils';
import { logger } from '@/server/logger';
import {
  createStripeCheckoutSession,
  StripeCheckoutError,
  zCreateStripeCheckoutInput,
} from '@/server/payments/checkout';

export const Route = createFileRoute('/api/stripe/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);
        const routeLog = logger.child({
          path: '/api/stripe/checkout',
          requestId: context.requestId,
          scope: 'payments',
        });

        if (envClient.VITE_IS_DEMO) {
          return buildTextResponse('Demo Mode', {
            requestId: context.requestId,
            status: 405,
          });
        }

        const rateLimit = consumeCheckoutCreateRateLimit({
          clientIp: context.clientIp,
        });

        if (!rateLimit.allowed) {
          routeLog.warn({
            clientIp: context.clientIp,
            message: 'Rate limited Stripe checkout creation request',
            retryAfterMs: rateLimit.retryAfterMs,
            type: 'rate_limit',
          });

          return redirectToCheckoutReturn(request, context.requestId, {
            email: null,
            error: 'rate_limited',
            headers: {
              'Retry-After': Math.max(
                Math.ceil(rateLimit.retryAfterMs / 1000),
                1
              ).toString(),
            },
            tokenPackKey: null,
          });
        }

        const formData = await request.formData();
        const rawTokenPackKey = readFormValue(formData, 'tokenPackKey');
        const rawPayerEmail = readFormValue(formData, 'payerEmail');

        const parsedInput = zCreateStripeCheckoutInput.safeParse({
          payerEmail: rawPayerEmail,
          tokenPackKey: rawTokenPackKey,
        });

        if (!parsedInput.success) {
          routeLog.warn({
            clientIp: context.clientIp,
            message: 'Rejected invalid Stripe checkout initiation payload',
            tokenPackKey: rawTokenPackKey,
            type: 'validation',
          });

          return redirectToCheckoutReturn(request, context.requestId, {
            email: rawPayerEmail,
            error: 'invalid_request',
            tokenPackKey: rawTokenPackKey,
          });
        }

        try {
          const checkout = await createStripeCheckoutSession(parsedInput.data, {
            log: routeLog,
          });
          return redirectWithRequestId(checkout.url, {
            requestId: context.requestId,
          });
        } catch (error) {
          if (error instanceof StripeCheckoutError) {
            routeLog.warn({
              clientIp: context.clientIp,
              errorCode: error.code,
              message: 'Stripe checkout initiation failed',
              tokenPackKey: parsedInput.data.tokenPackKey,
              type: 'checkout_error',
            });

            return redirectToCheckoutReturn(request, context.requestId, {
              email: parsedInput.data.payerEmail,
              error: error.code,
              tokenPackKey: parsedInput.data.tokenPackKey,
            });
          }

          throw error;
        }
      },
    },
  },
});

function redirectToCheckoutReturn(
  request: Request,
  requestId: string,
  input: {
    email?: string | null;
    error?: string;
    headers?: HeadersInit;
    tokenPackKey?: string | null;
  }
) {
  const pathname =
    input.tokenPackKey?.trim() && input.tokenPackKey.trim().length > 0
      ? `/checkout/${encodeURIComponent(input.tokenPackKey.trim())}`
      : '/pricing';

  const url = new URL(pathname, request.url);

  if (pathname.startsWith('/checkout/')) {
    if (input.email) {
      url.searchParams.set('email', input.email);
    }
    if (input.error) {
      url.searchParams.set('error', input.error);
    }
  }

  return redirectWithRequestId(url.toString(), {
    headers: input.headers,
    requestId,
  });
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : null;
}
