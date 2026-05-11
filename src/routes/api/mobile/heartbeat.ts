import { createFileRoute } from '@tanstack/react-router';

import {
  buildFreeAccessIpBlockedErrorBody,
  isFreeAccessIpBlockedError,
} from '@/server/licenses/free-access-ip-block';
import { getClientIp } from '@/server/licenses/utils';
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

        const parsedInput = zMobileHeartbeatInput.safeParse(payload);

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

          return Response.json({
            data: heartbeat,
            ok: true,
          });
        } catch (error) {
          if (isFreeAccessIpBlockedError(error)) {
            return Response.json(
              {
                error: buildFreeAccessIpBlockedErrorBody(error),
                ok: false,
              },
              { status: error.statusCode }
            );
          }

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
