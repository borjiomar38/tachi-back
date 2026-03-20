import { createFileRoute } from '@tanstack/react-router';

import {
  authenticateMobileAccessToken,
  buildMobileSessionSummary,
  MobileAuthError,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const auth = await authenticateMobileAccessToken(request);
          const summary = await buildMobileSessionSummary(auth);

          return Response.json({
            data: summary,
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
