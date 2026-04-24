import { createFileRoute } from '@tanstack/react-router';

import {
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import {
  authenticateMobileAccessToken,
  buildMobileSessionSummary,
  MobileAuthError,
} from '@/server/mobile-auth/session';
import {
  buildMobileSubscriptionErrorResponse,
  cancelMobileLicenseSubscription,
} from '@/server/mobile-auth/subscription';

export const Route = createFileRoute('/api/mobile/subscription/cancel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);

        try {
          const auth = await authenticateMobileAccessToken(request);
          const cancellation = await cancelMobileLicenseSubscription(auth);
          const summary = await buildMobileSessionSummary(auth);

          return buildApiOkResponse(
            {
              cancellation,
              summary,
            },
            {
              requestId: context.requestId,
            }
          );
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

          return buildMobileSubscriptionErrorResponse(error, context.requestId);
        }
      },
    },
  },
});
