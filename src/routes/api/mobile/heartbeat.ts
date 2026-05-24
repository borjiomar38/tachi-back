import { createFileRoute } from '@tanstack/react-router';

import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
} from '@/server/http/route-utils';
import {
  buildFreeAccessIpBlockedErrorBody,
  isFreeAccessIpBlockedError,
} from '@/server/licenses/free-access-ip-block';
import { getClientIp } from '@/server/licenses/utils';
import { logger } from '@/server/logger';
import { zMobileHeartbeatInput } from '@/server/mobile-auth/schema';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
  recordMobileHeartbeat,
} from '@/server/mobile-auth/session';
import { getEffectiveMobileAppUpdatePolicy } from '@/server/mobile-update-policy';

export const Route = createFileRoute('/api/mobile/heartbeat')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const platform = url.searchParams.get('platform') ?? 'android';
        const channel = url.searchParams.get('channel') ?? 'unknown';
        const currentVersionCode = Number.parseInt(
          url.searchParams.get('versionCode') ?? '0',
          10
        );
        const policy = await getEffectiveMobileAppUpdatePolicy({
          channel,
          currentVersionCode: Number.isFinite(currentVersionCode)
            ? currentVersionCode
            : 0,
          platform,
        });

        return Response.json({
          data: policy,
          ok: true,
        });
      },
      POST: async ({ request }) => {
        const requestContext = buildHttpRequestContext(request);
        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          return buildInvalidRequestResponse(requestContext.requestId);
        }

        const parsedInput = zMobileHeartbeatInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            requestContext.requestId,
            parsedInput.error.flatten()
          );
        }

        try {
          const auth = await authenticateMobileAccessToken(request);
          const heartbeat = await recordMobileHeartbeat(
            auth,
            parsedInput.data,
            {
              clientIp: getClientIp(request),
              userAgent: request.headers.get('user-agent'),
            }
          );

          return buildApiOkResponse(heartbeat, {
            requestId: requestContext.requestId,
          });
        } catch (error) {
          if (isFreeAccessIpBlockedError(error)) {
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
            logger.warn(
              {
                appBuild: parsedInput.data.appBuild,
                appVersion: parsedInput.data.appVersion,
                authHeaderPresent: Boolean(
                  request.headers.get('authorization')?.trim()
                ),
                clientIp: requestContext.clientIp,
                errorCode: error.code,
                path: '/api/mobile/heartbeat',
                requestId: requestContext.requestId,
                scope: 'mobile_auth',
                statusCode: error.statusCode,
                type: 'POST',
                userAgent: requestContext.userAgent,
              },
              'Mobile heartbeat auth failed'
            );

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
