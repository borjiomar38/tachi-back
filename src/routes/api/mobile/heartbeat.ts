import { createFileRoute } from '@tanstack/react-router';

import { getClientIp } from '@/server/licenses/utils';
import { zMobileHeartbeatInput } from '@/server/mobile-auth/schema';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
  recordMobileHeartbeat,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/heartbeat')({
  server: {
    handlers: {
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
