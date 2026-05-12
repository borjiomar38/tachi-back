import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { getFreeAccessIpBlock } from '@/server/licenses/free-access-ip-block';
import { checkFreeTrialEligibility } from '@/server/licenses/free-trial';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { getClientIp } from '@/server/licenses/utils';
import {
  zCheckFreeTrialEligibilityInput,
  zFreeTrialEligibilityResponse,
} from '@/server/mobile-auth/schema';

export const Route = createFileRoute('/api/mobile/auth/free-trial/eligibility')(
  {
    server: {
      handlers: {
        POST: async ({ request }) => {
          if (envClient.VITE_IS_DEMO) {
            return new Response('Demo Mode', { status: 405 });
          }

          if (!envServer.MOBILE_API_ENABLED) {
            return Response.json(
              {
                error: {
                  code: 'mobile_api_disabled',
                },
                ok: false,
              },
              { status: 503 }
            );
          }

          const clientIp = getClientIp(request);
          const rateLimitIp = clientIp ?? 'unknown';
          const windowMs = envServer.REDEEM_RATE_LIMIT_WINDOW_SECONDS * 1000;

          const ipRateLimit = consumeInMemoryRateLimit({
            key: `mobile-auth-free-trial-eligibility:ip:${rateLimitIp}`,
            limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs,
          });

          if (!ipRateLimit.allowed) {
            return buildRateLimitedResponse(ipRateLimit.retryAfterMs);
          }

          let payload: unknown;

          try {
            payload = await request.json();
          } catch {
            return invalidRequestResponse();
          }

          const parsedInput =
            zCheckFreeTrialEligibilityInput.safeParse(payload);

          if (!parsedInput.success) {
            return invalidRequestResponse(parsedInput.error.flatten());
          }

          const installationRateLimit = consumeInMemoryRateLimit({
            key: `mobile-auth-free-trial-eligibility:installation:${parsedInput.data.installationId}`,
            limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
            windowMs,
          });

          if (!installationRateLimit.allowed) {
            return buildRateLimitedResponse(installationRateLimit.retryAfterMs);
          }

          const freeAccessIpBlock = await getFreeAccessIpBlock(clientIp);
          const eligibility = freeAccessIpBlock
            ? {
                eligible: false,
                reasonCode: 'free_access_ip_blocked' as const,
              }
            : await checkFreeTrialEligibility(parsedInput.data, {
                clientIp,
              });

          return Response.json({
            data: zFreeTrialEligibilityResponse.parse(eligibility),
            ok: true,
          });
        },
      },
    },
  }
);

function invalidRequestResponse(details?: unknown) {
  return Response.json(
    {
      error: {
        code: 'invalid_request',
        details,
      },
      ok: false,
    },
    { status: 400 }
  );
}

function buildRateLimitedResponse(retryAfterMs: number) {
  return Response.json(
    {
      error: {
        code: 'rate_limited',
      },
      ok: false,
    },
    {
      headers: {
        'Retry-After': Math.max(Math.ceil(retryAfterMs / 1000), 1).toString(),
      },
      status: 429,
    }
  );
}
