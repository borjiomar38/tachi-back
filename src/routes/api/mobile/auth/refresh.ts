import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
  buildRateLimitedResponse,
  buildTextResponse,
} from '@/server/http/route-utils';
import {
  buildFreeAccessIpBlockedErrorBody,
  isFreeAccessIpBlockedError,
} from '@/server/licenses/free-access-ip-block';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { logger } from '@/server/logger';
import { zRefreshMobileSessionInput } from '@/server/mobile-auth/schema';
import {
  MobileAuthError,
  refreshMobileSession,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/auth/refresh')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestContext = buildHttpRequestContext(request);

        if (envClient.VITE_IS_DEMO) {
          return buildTextResponse('Demo Mode', {
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

        const clientIp =
          requestContext.clientIp === 'unknown'
            ? null
            : requestContext.clientIp;
        const rateLimitIp = clientIp ?? 'unknown';
        const userAgent = requestContext.userAgent;
        const windowMs = envServer.REDEEM_RATE_LIMIT_WINDOW_SECONDS * 1000;

        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          logMobileAuthRefreshFailure({
            code: 'invalid_request',
            requestContext,
            statusCode: 400,
          });

          return buildInvalidRequestResponse(requestContext.requestId);
        }

        const parsedInput = zRefreshMobileSessionInput.safeParse(payload);

        if (!parsedInput.success) {
          const details = parsedInput.error.flatten();

          logMobileAuthRefreshFailure({
            code: 'invalid_request',
            requestContext,
            statusCode: 400,
          });

          return buildInvalidRequestResponse(requestContext.requestId, details);
        }

        const rateLimit = consumeInMemoryRateLimit({
          key: `mobile-auth-refresh:${parsedInput.data.installationId}:${rateLimitIp}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!rateLimit.allowed) {
          logMobileAuthRefreshFailure({
            code: 'rate_limited',
            input: parsedInput.data,
            requestContext,
            statusCode: 429,
          });

          return buildRateLimitedResponse(
            requestContext.requestId,
            rateLimit.retryAfterMs
          );
        }

        try {
          const auth = await refreshMobileSession(parsedInput.data, {
            clientIp,
            log: logger.child({
              requestId: requestContext.requestId,
            }),
            userAgent,
          });

          return buildApiOkResponse(auth, {
            requestId: requestContext.requestId,
          });
        } catch (error) {
          if (isFreeAccessIpBlockedError(error)) {
            logMobileAuthRefreshFailure({
              code: error.code,
              input: parsedInput.data,
              requestContext,
              statusCode: error.statusCode,
            });

            return Response.json(
              {
                error: buildFreeAccessIpBlockedErrorBody(error),
                ok: false,
              },
              {
                headers: {
                  'X-Request-ID': requestContext.requestId,
                },
                status: error.statusCode,
              }
            );
          }

          if (error instanceof MobileAuthError) {
            logMobileAuthRefreshFailure({
              code: error.code,
              input: parsedInput.data,
              requestContext,
              statusCode: error.statusCode,
            });

            return buildApiErrorResponse({
              code: error.code,
              requestId: requestContext.requestId,
              status: error.statusCode,
            });
          }

          throw error;
        }
      },
    },
  },
});

function logMobileAuthRefreshFailure(input: {
  code: string;
  input?: {
    appBuild?: string | null;
    appVersion?: string | null;
    installationId: string;
    refreshToken: string;
  };
  requestContext: ReturnType<typeof buildHttpRequestContext>;
  statusCode: number;
}) {
  logger.warn(
    {
      appBuild: input.input?.appBuild,
      appVersion: input.input?.appVersion,
      clientIp: input.requestContext.clientIp,
      errorCode: input.code,
      installationIdPrefix: input.input?.installationId.slice(0, 18),
      path: '/api/mobile/auth/refresh',
      refreshTokenLength: input.input?.refreshToken.length,
      requestId: input.requestContext.requestId,
      scope: 'mobile_auth',
      statusCode: input.statusCode,
      type: 'POST',
      userAgent: input.requestContext.userAgent,
    },
    'Mobile auth refresh failed'
  );
}
