import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
  buildRateLimitedResponse,
} from '@/server/http/route-utils';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { zRegisterMobileInstallationInput } from '@/server/mobile-auth/schema';
import { registerMobileInstallation } from '@/server/services/mobile-installation-registration';

export const Route = createFileRoute('/api/mobile/installations/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestContext = buildHttpRequestContext(request);

        if (envClient.VITE_IS_DEMO) {
          return buildApiErrorResponse({
            code: 'demo_mode',
            requestId: requestContext.requestId,
            status: 405,
          });
        }

        if (!envServer.MOBILE_API_ENABLED) {
          return buildApiErrorResponse({
            code: 'mobile_api_disabled',
            requestId: requestContext.requestId,
            status: 503,
          });
        }

        const windowMs = envServer.REDEEM_RATE_LIMIT_WINDOW_SECONDS * 1000;
        const ipRateLimit = consumeInMemoryRateLimit({
          key: `mobile-installation-register:ip:${requestContext.clientIp}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!ipRateLimit.allowed) {
          return buildRateLimitedResponse(
            requestContext.requestId,
            ipRateLimit.retryAfterMs
          );
        }

        const payload: unknown = await request.json().catch(() => null);

        if (payload === null) {
          return buildInvalidRequestResponse(requestContext.requestId);
        }

        const parsedInput = zRegisterMobileInstallationInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            requestContext.requestId,
            parsedInput.error.flatten()
          );
        }

        const installationRateLimit = consumeInMemoryRateLimit({
          key: `mobile-installation-register:installation:${parsedInput.data.installationId}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!installationRateLimit.allowed) {
          return buildRateLimitedResponse(
            requestContext.requestId,
            installationRateLimit.retryAfterMs
          );
        }

        const registration = await registerMobileInstallation(
          parsedInput.data,
          {
            clientIp: requestContext.clientIp,
            userAgent: requestContext.userAgent,
          }
        );

        return buildApiOkResponse(registration, {
          requestId: requestContext.requestId,
        });
      },
    },
  },
});
