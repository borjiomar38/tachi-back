import { z } from 'zod';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildRateLimitedResponse,
} from '@/server/http/route-utils';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { RedeemActivationError } from '@/server/licenses/redeem';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
} from '@/server/mobile-auth/session';
import { PurchaseError } from '@/server/payments/purchase-policy';

type PurchaseAuth = Awaited<ReturnType<typeof authenticateMobileAccessToken>>;
export const handlePurchaseRequest = async <T>(
  request: Request,
  action: string,
  handler: (
    input: unknown,
    context: ReturnType<typeof buildHttpRequestContext> & {
      auth: PurchaseAuth | null;
    }
  ) => Promise<T>
) => {
  const context = buildHttpRequestContext(request);
  const responseHeaders = {
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
  };
  if (envClient.VITE_IS_DEMO || !envServer.MOBILE_API_ENABLED) {
    return buildApiErrorResponse({
      code: 'mobile_api_disabled',
      status: 503,
      requestId: context.requestId,
    });
  }
  const rate = consumeInMemoryRateLimit({
    key: `purchase:${action}:${context.clientIp}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!rate.allowed)
    return buildRateLimitedResponse(context.requestId, rate.retryAfterMs);
  try {
    const input: unknown = await request.json().catch(() => {
      throw new PurchaseError('invalid_request', 400);
    });
    const auth = request.headers.has('authorization')
      ? await authenticateMobileAccessToken(request)
      : null;
    const result = await handler(input, { ...context, auth });
    return buildApiOkResponse(result, {
      headers: responseHeaders,
      requestId: context.requestId,
    });
  } catch (error) {
    if (error instanceof PurchaseError && error.code === 'payment_pending') {
      return buildApiOkResponse(
        { state: 'pending' },
        { headers: responseHeaders, requestId: context.requestId }
      );
    }
    if (
      error instanceof PurchaseError ||
      error instanceof MobileAuthError ||
      error instanceof RedeemActivationError
    ) {
      return buildApiErrorResponse({
        code: error.code,
        status: error.statusCode,
        headers: responseHeaders,
        requestId: context.requestId,
      });
    }
    if (error instanceof z.ZodError) {
      return buildApiErrorResponse({
        code: 'invalid_request',
        status: 400,
        headers: responseHeaders,
        requestId: context.requestId,
      });
    }
    throw error;
  }
};
