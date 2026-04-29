import { consumeMobileJobRouteRateLimit } from '@/server/hardening/rate-limit';
import {
  buildApiErrorResponse,
  buildRateLimitedResponse,
  HttpRequestContext,
} from '@/server/http/route-utils';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
} from '@/server/mobile-auth/session';

import { TranslationJobError } from './service';

export async function authenticateAndRateLimitMobileJobRequest(
  request: Request,
  input: {
    bucket: 'create' | 'read' | 'write';
    context: HttpRequestContext;
  }
) {
  const auth = await authenticateMobileAccessToken(request);
  const rateLimit = consumeMobileJobRouteRateLimit({
    bucket: input.bucket,
    clientIp: input.context.clientIp,
    deviceId: auth.device.id,
    licenseId: auth.license.id,
  });

  return {
    auth,
    rateLimit,
  };
}

export function buildMobileJobErrorResponse(error: unknown, requestId: string) {
  if (error instanceof MobileAuthError) {
    return buildApiErrorResponse({
      code: error.code,
      requestId,
      status: error.statusCode,
    });
  }

  if (error instanceof TranslationJobError) {
    return buildApiErrorResponse({
      code: error.code,
      details: error.details,
      requestId,
      status: error.statusCode,
    });
  }

  throw error;
}

export function buildMobileJobRateLimitedResponse(
  requestId: string,
  retryAfterMs: number
) {
  return buildRateLimitedResponse(requestId, retryAfterMs);
}
