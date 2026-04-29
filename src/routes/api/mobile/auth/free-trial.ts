import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import {
  createFreeTrialRedeemCode,
  isFreeTrialActivationError,
} from '@/server/licenses/free-trial';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { redeemLicenseToDevice } from '@/server/licenses/redeem';
import { getClientIp } from '@/server/licenses/utils';
import {
  zCreateFreeTrialMobileSessionInput,
  zMobileActivationResponse,
} from '@/server/mobile-auth/schema';
import {
  createMobileSession,
  MobileAuthError,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/auth/free-trial')({
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

        const ipRateLimit = consumeInMemoryRateLimit({
          key: `mobile-auth-free-trial:ip:${clientIp}`,
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
          zCreateFreeTrialMobileSessionInput.safeParse(payload);

        if (!parsedInput.success) {
          return invalidRequestResponse(parsedInput.error.flatten());
        }

        const installationRateLimit = consumeInMemoryRateLimit({
          key: `mobile-auth-free-trial:installation:${parsedInput.data.installationId}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!installationRateLimit.allowed) {
          return buildRateLimitedResponse(installationRateLimit.retryAfterMs);
        }

        try {
          const trial = await createFreeTrialRedeemCode(parsedInput.data);
          const activation = await redeemLicenseToDevice(
            {
              ...parsedInput.data,
              redeemCode: trial.redeemCode,
            },
            {
              clientIp,
            }
          );
          const auth = await createMobileSession(
            {
              appBuild: parsedInput.data.appBuild,
              appVersion: parsedInput.data.appVersion,
              buildChannel: parsedInput.data.buildChannel,
              deviceId: activation.device.id,
              installationId: activation.device.installationId,
              licenseId: activation.license.id,
            },
            {
              clientIp,
              userAgent,
            }
          );

          return Response.json({
            data: zMobileActivationResponse.parse({
              activation,
              auth,
            }),
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

          if (isFreeTrialActivationError(error)) {
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

          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            'statusCode' in error
          ) {
            return Response.json(
              {
                error: {
                  code: String(error.code),
                },
                ok: false,
              },
              { status: Number(error.statusCode) }
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
