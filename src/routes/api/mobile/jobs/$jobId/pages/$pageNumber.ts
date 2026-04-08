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
import { uploadTranslationJobPage } from '@/server/jobs/service';
import { logger } from '@/server/logger';

export const Route = createFileRoute(
  '/api/mobile/jobs/$jobId/pages/$pageNumber'
)({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const context = buildHttpRequestContext(request);
        const routeLog = logger.child({
          path: '/api/mobile/jobs/$jobId/pages/$pageNumber',
          requestId: context.requestId,
          scope: 'jobs',
        });

        try {
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
              message: 'Rate limited mobile job page upload request',
              pageNumber: params.pageNumber,
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const body = new Uint8Array(await request.arrayBuffer());
          const summary = await uploadTranslationJobPage(
            {
              jobId: params.jobId,
              pageNumber: params.pageNumber,
            },
            {
              actor: {
                deviceId: auth.device.id,
                licenseId: auth.license.id,
              },
              body,
              contentLength: getContentLength(request),
              contentType: request.headers.get('content-type'),
              log: routeLog,
            }
          );

          routeLog.info({
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            jobId: params.jobId,
            licenseId: auth.license.id,
            message: 'Uploaded mobile job page',
            pageNumber: params.pageNumber,
            type: 'mutation',
          });

          return buildApiOkResponse(summary, {
            requestId: context.requestId,
          });
        } catch (error) {
          routeLog.error({
            err: error,
            jobId: params.jobId,
            message: 'Mobile job page upload failed',
            pageNumber: params.pageNumber,
            type: 'mutation',
          });

          return buildMobileJobErrorResponse(error, context.requestId);
        }
      },
    },
  },
});

function getContentLength(request: Request) {
  const value = request.headers.get('content-length');

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
}
