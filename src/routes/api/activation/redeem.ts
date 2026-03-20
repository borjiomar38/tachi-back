import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import {
  isRedeemActivationError,
  redeemLicenseToDevice,
} from '@/server/licenses/redeem';
import { zRedeemActivationInput } from '@/server/licenses/schema';
import { getClientIp } from '@/server/licenses/utils';

export const Route = createFileRoute('/api/activation/redeem')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (envClient.VITE_IS_DEMO) {
          return new Response('Demo Mode', { status: 405 });
        }

        const clientIp = getClientIp(request) ?? 'unknown';
        const windowMs = envServer.REDEEM_RATE_LIMIT_WINDOW_SECONDS * 1000;

        const ipRateLimit = consumeInMemoryRateLimit({
          key: `redeem:ip:${clientIp}`,
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
          return Response.json(
            {
              error: {
                code: 'invalid_request',
              },
              ok: false,
            },
            { status: 400 }
          );
        }

        const parsedInput = zRedeemActivationInput.safeParse(payload);

        if (!parsedInput.success) {
          return Response.json(
            {
              error: {
                code: 'invalid_request',
                details: parsedInput.error.flatten(),
              },
              ok: false,
            },
            { status: 400 }
          );
        }

        const installationRateLimit = consumeInMemoryRateLimit({
          key: `redeem:installation:${parsedInput.data.installationId}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!installationRateLimit.allowed) {
          return buildRateLimitedResponse(installationRateLimit.retryAfterMs);
        }

        try {
          const result = await redeemLicenseToDevice(parsedInput.data, {
            clientIp,
          });

          return Response.json({
            data: result,
            ok: true,
          });
        } catch (error) {
          if (isRedeemActivationError(error)) {
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
