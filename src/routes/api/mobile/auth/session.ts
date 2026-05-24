import { createFileRoute } from '@tanstack/react-router';

import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import { logger } from '@/server/logger';
import {
  authenticateMobileAccessToken,
  buildMobileSessionSummary,
  MobileAuthError,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestContext = buildHttpRequestContext(request);

        try {
          const auth = await authenticateMobileAccessToken(request);
          const summary = await buildMobileSessionSummary(auth);

          return buildApiOkResponse(summary, {
            requestId: requestContext.requestId,
          });
        } catch (error) {
          if (error instanceof MobileAuthError) {
            const authHeader = request.headers.get('authorization')?.trim();

            logger.warn(
              {
                authHeaderPresent: Boolean(authHeader),
                authScheme: authHeader?.split(/\s+/, 1)[0],
                clientIp: requestContext.clientIp,
                errorCode: error.code,
                path: '/api/mobile/auth/session',
                requestId: requestContext.requestId,
                scope: 'mobile_auth',
                statusCode: error.statusCode,
                type: 'GET',
                userAgent: requestContext.userAgent,
              },
              'Mobile auth session failed'
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
