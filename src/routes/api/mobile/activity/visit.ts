import { createFileRoute } from '@tanstack/react-router';
import { waitUntil } from '@vercel/functions';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import {
  getSafeMangaPornographyLogError,
  processMangaPornographyAssessment,
} from '@/server/content-policy/manga-pornography-policy';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
  buildRateLimitedResponse,
} from '@/server/http/route-utils';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { logger } from '@/server/logger';
import {
  recordDeviceContentVisit,
  zDeviceContentVisitInput,
} from '@/server/services/device-content-activity';

export const Route = createFileRoute('/api/mobile/activity/visit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);

        if (envClient.VITE_IS_DEMO) {
          return buildApiErrorResponse({
            code: 'demo_mode',
            requestId: context.requestId,
            status: 405,
          });
        }

        if (!envServer.MOBILE_API_ENABLED) {
          return buildApiErrorResponse({
            code: 'mobile_api_disabled',
            requestId: context.requestId,
            status: 503,
          });
        }

        const payload: unknown = await request.json().catch(() => null);
        const parsed = zDeviceContentVisitInput.safeParse(payload);

        if (!parsed.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsed.error.flatten()
          );
        }

        const rateLimit = consumeInMemoryRateLimit({
          key: `mobile-content-visit:${parsed.data.installationId}`,
          limit: 30,
          windowMs: 60_000,
        });
        const ipRateLimit =
          context.clientIp === 'unknown'
            ? null
            : consumeInMemoryRateLimit({
                key: `mobile-content-visit-ip:${context.clientIp}`,
                limit: 60,
                windowMs: 60_000,
              });

        if (!rateLimit.allowed || ipRateLimit?.allowed === false) {
          return buildRateLimitedResponse(
            context.requestId,
            Math.max(rateLimit.retryAfterMs, ipRateLimit?.retryAfterMs ?? 0)
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/activity/visit',
          requestId: context.requestId,
          scope: 'content-policy',
        });
        const result = await recordDeviceContentVisit(parsed.data, {
          log: routeLog,
          schedulePornographyAssessment: (assessmentId) => {
            waitUntil(
              processMangaPornographyAssessment(
                { assessmentId },
                { log: routeLog }
              ).catch((error) => {
                routeLog.error({
                  ...getSafeMangaPornographyLogError(error),
                  assessmentId,
                  message:
                    'Automatic pornography moderation background task failed',
                  type: 'pornography_moderation_processing_failure',
                });
              })
            );
          },
        });

        return buildApiOkResponse(result, {
          requestId: context.requestId,
        });
      },
    },
  },
});
