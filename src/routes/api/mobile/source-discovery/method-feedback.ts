import { createFileRoute } from '@tanstack/react-router';

import {
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
} from '@/server/http/route-utils';
import {
  authenticateAndRateLimitMobileJobRequest,
  buildMobileJobErrorResponse,
  buildMobileJobRateLimitedResponse,
} from '@/server/jobs/http';
import { logger } from '@/server/logger';
import {
  updateSourceDiscoveryMethodFeedback,
  zSourceDiscoveryMethodFeedbackInput,
} from '@/server/source-discovery/service';

export const Route = createFileRoute(
  '/api/mobile/source-discovery/method-feedback'
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);
        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          return buildInvalidRequestResponse(context.requestId);
        }

        const parsedInput =
          zSourceDiscoveryMethodFeedbackInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/source-discovery/method-feedback',
          requestId: context.requestId,
          scope: 'source-discovery',
        });

        try {
          const { auth, rateLimit } =
            await authenticateAndRateLimitMobileJobRequest(request, {
              bucket: 'create',
              context,
            });

          if (!rateLimit.allowed) {
            routeLog.warn({
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              licenseId: auth.license.id,
              message: 'Rate limited mobile source discovery method feedback',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const result = await updateSourceDiscoveryMethodFeedback(
            parsedInput.data
          );

          routeLog.info({
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            licenseId: auth.license.id,
            message: 'Updated mobile source discovery method feedback',
            methodId: parsedInput.data.methodId,
            sourceId: parsedInput.data.sourceId,
            status: parsedInput.data.status,
            type: 'mutation',
          });

          return buildApiOkResponse(result, {
            requestId: context.requestId,
          });
        } catch (error) {
          return buildMobileJobErrorResponse(error, context.requestId);
        }
      },
    },
  },
});
