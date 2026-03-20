import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { getClientIp } from '@/server/licenses/utils';
import { zRefreshMobileSessionInput } from '@/server/mobile-auth/schema';
import {
  MobileAuthError,
  refreshMobileSession,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/auth/refresh')({
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

        const clientIp = getClientIp(request) ?? 'unknown';
        const userAgent = request.headers.get('user-agent');
        const windowMs = envServer.REDEEM_RATE_LIMIT_WINDOW_SECONDS * 1000;

        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          return invalidRequestResponse();
        }

        const parsedInput = zRefreshMobileSessionInput.safeParse(payload);

        if (!parsedInput.success) {
          return invalidRequestResponse(parsedInput.error.flatten());
        }

        const rateLimit = consumeInMemoryRateLimit({
          key: `mobile-auth-refresh:${parsedInput.data.installationId}:${clientIp}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!rateLimit.allowed) {
          return buildRateLimitedResponse(rateLimit.retryAfterMs);
        }

        try {
          const auth = await refreshMobileSession(parsedInput.data, {
            clientIp,
            userAgent,
          });

          return Response.json({
            data: auth,
            ok: true,
          });
        } catch (error) {
          if (error instanceof MobileAuthError) {
            return Response.json(
              {
                error: {
                  code: error.code,
                },
                ok: false,
              },
              { status: error.statusCode }
            );
          }

          throw error;
        }
      },
    },
  },
});

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
