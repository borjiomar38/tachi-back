import { db } from '@/server/db';
import {
  consumeMobileJobRouteRateLimit,
  type MobileJobRateLimitBucket,
} from '@/server/hardening/rate-limit';
import {
  buildApiErrorResponse,
  buildRateLimitedResponse,
  HttpRequestContext,
} from '@/server/http/route-utils';
import {
  buildFreeAccessIpBlockedErrorBody,
  isFreeAccessIpBlockedError,
} from '@/server/licenses/free-access-ip-block';
import {
  FreeTrialDailyLimitError,
  type FreeTrialDailyUsageReservation,
  voidFreeTrialDailyUsageReservation,
} from '@/server/licenses/free-trial-daily-limit';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
} from '@/server/mobile-auth/session';

import { TranslationJobError } from './service';

export async function authenticateAndRateLimitMobileJobRequest(
  request: Request,
  input: {
    bucket: MobileJobRateLimitBucket;
    context: HttpRequestContext;
    scopeId?: string;
  }
) {
  const auth = await authenticateMobileAccessToken(request);
  const rateLimit = consumeMobileJobRouteRateLimit({
    bucket: input.bucket,
    clientIp: input.context.clientIp,
    deviceId: auth.device.id,
    licenseId: auth.license.id,
    scopeId: input.scopeId,
  });

  return {
    auth,
    rateLimit,
  };
}

export function buildMobileJobErrorResponse(error: unknown, requestId: string) {
  if (isFreeAccessIpBlockedError(error)) {
    const blockedError = buildFreeAccessIpBlockedErrorBody(error);

    return buildApiErrorResponse({
      code: blockedError.code,
      details: {
        message: blockedError.message,
        pricingUrl: blockedError.pricingUrl,
      },
      requestId,
      status: error.statusCode,
    });
  }

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

  if (error instanceof FreeTrialDailyLimitError) {
    return buildApiErrorResponse({
      code: error.code,
      details: error.details,
      requestId,
      status: error.statusCode,
    });
  }

  throw error;
}

export async function voidMobileJobReservationOnError(input: {
  error: unknown;
  reservation: FreeTrialDailyUsageReservation | null;
}) {
  if (!input.reservation) {
    return;
  }

  if (input.error instanceof FreeTrialDailyLimitError) {
    return;
  }

  await voidFreeTrialDailyUsageReservation({
    dbClient: db,
    reservation: input.reservation,
  });
}

export function buildMobileJobRateLimitedResponse(
  requestId: string,
  retryAfterMs: number
) {
  return buildRateLimitedResponse(requestId, retryAfterMs);
}
