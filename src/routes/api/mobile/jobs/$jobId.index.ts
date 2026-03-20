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
import { getTranslationJobSummary } from '@/server/jobs/service';
import { logger } from '@/server/logger';

export const Route = createFileRoute('/api/mobile/jobs/$jobId/')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const context = buildHttpRequestContext(request);

        try {
          const routeLog = logger.child({
            path: '/api/mobile/jobs/$jobId',
            requestId: context.requestId,
            scope: 'jobs',
          });
          const { auth, rateLimit } =
            await authenticateAndRateLimitMobileJobRequest(request, {
              bucket: 'read',
              context,
            });

          if (!rateLimit.allowed) {
            routeLog.warn({
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              jobId: params.jobId,
              licenseId: auth.license.id,
              message: 'Rate limited mobile job status request',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const summary = await getTranslationJobSummary(
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
