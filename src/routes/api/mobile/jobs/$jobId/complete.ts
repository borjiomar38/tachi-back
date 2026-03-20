import { createFileRoute } from '@tanstack/react-router';

import {
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import {
  authenticateAndRateLimitMobileJobRequest,
  buildMobileJobErrorResponse,
  buildMobileJobRateLimitedResponse,
} from '@/server/jobs/http';
import { completeTranslationJobUpload } from '@/server/jobs/service';
import { logger } from '@/server/logger';

export const Route = createFileRoute('/api/mobile/jobs/$jobId/complete')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const context = buildHttpRequestContext(request);

        try {
          const routeLog = logger.child({
            path: '/api/mobile/jobs/$jobId/complete',
            requestId: context.requestId,
            scope: 'jobs',
          });
          const { auth, rateLimit } =
            await authenticateAndRateLimitMobileJobRequest(request, {
              bucket: 'write',
              context,
            });

          if (!rateLimit.allowed) {
            routeLog.warn({
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              jobId: params.jobId,
              licenseId: auth.license.id,
              message: 'Rate limited mobile job completion request',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const summary = await completeTranslationJobUpload(
            {
              jobId: params.jobId,
            },
            {
              actor: {
                deviceId: auth.device.id,
                licenseId: auth.license.id,
              },
            }
          );

          routeLog.info({
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            jobId: params.jobId,
            licenseId: auth.license.id,
            message: 'Completed mobile job upload phase',
            type: 'mutation',
          });

          return buildApiOkResponse(summary, {
            requestId: context.requestId,
          });
        } catch (error) {
          return buildMobileJobErrorResponse(error, context.requestId);
        }
      },
    },
  },
});
