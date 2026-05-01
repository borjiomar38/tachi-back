import { createFileRoute } from '@tanstack/react-router';
import { waitUntil } from '@vercel/functions';

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
import { zCreateTranslationJobInput } from '@/server/jobs/schema';
import {
  createTranslationJob,
  drainTranslationJobQueue,
} from '@/server/jobs/service';
import { logger } from '@/server/logger';

export const Route = createFileRoute('/api/mobile/jobs')({
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

        const parsedInput = zCreateTranslationJobInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        try {
          const routeLog = logger.child({
            path: '/api/mobile/jobs',
            requestId: context.requestId,
            scope: 'jobs',
          });
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
              message: 'Rate limited mobile job creation request',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const created = await createTranslationJob(parsedInput.data, {
            actor: {
              deviceId: auth.device.id,
              licenseId: auth.license.id,
            },
            scheduleProcessing: (jobId) => {
              waitUntil(
                drainTranslationJobQueue({ log: routeLog }).catch((error) => {
                  routeLog.error({
                    errorMessage:
                      error instanceof Error ? error.message : 'Unknown error',
                    jobId,
                    scope: 'jobs',
                  });
                })
              );
            },
          });

          routeLog.info({
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            jobId: created.job.id,
            licenseId: auth.license.id,
            message: 'Created mobile translation job',
            type: 'mutation',
          });

          return buildApiOkResponse(created, {
            requestId: context.requestId,
          });
        } catch (error) {
          return buildMobileJobErrorResponse(error, context.requestId);
        }
      },
    },
  },
});
