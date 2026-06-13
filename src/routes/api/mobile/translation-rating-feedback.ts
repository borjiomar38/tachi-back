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
import { zCreateTranslationRatingFeedbackInput } from '@/server/translation-rating-feedback/schema';
import { createTranslationRatingFeedback } from '@/server/translation-rating-feedback/service';

export const Route = createFileRoute('/api/mobile/translation-rating-feedback')(
  {
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
            zCreateTranslationRatingFeedbackInput.safeParse(payload);

          if (!parsedInput.success) {
            return buildInvalidRequestResponse(
              context.requestId,
              parsedInput.error.flatten()
            );
          }

          const routeLog = logger.child({
            path: '/api/mobile/translation-rating-feedback',
            requestId: context.requestId,
            scope: 'translation-rating-feedback',
          });

          try {
            const { auth, rateLimit } =
              await authenticateAndRateLimitMobileJobRequest(request, {
                bucket: 'write',
                context,
                scopeId:
                  parsedInput.data.chapterCacheKey ??
                  parsedInput.data.translationJobId ??
                  parsedInput.data.translationCacheKey,
              });

            if (!rateLimit.allowed) {
              routeLog.warn({
                clientIp: context.clientIp,
                deviceId: auth.device.id,
                licenseId: auth.license.id,
                message: 'Rate limited mobile translation rating feedback',
                retryAfterMs: rateLimit.retryAfterMs,
                type: 'rate_limit',
              });

              return buildMobileJobRateLimitedResponse(
                context.requestId,
                rateLimit.retryAfterMs
              );
            }

            const result = await createTranslationRatingFeedback(
              parsedInput.data,
              {
                actor: {
                  appBuild: auth.device.appBuild,
                  appVersion: auth.device.appVersion,
                  clientIp: context.clientIp,
                  deviceId: auth.device.id,
                  licenseId: auth.license.id,
                  locale: auth.device.locale,
                  mobileSessionId: auth.session.id,
                  userAgent: context.userAgent,
                },
              }
            );

            routeLog.info({
              chapterCacheKey: parsedInput.data.chapterCacheKey,
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              duplicate: result.duplicate,
              feedbackId: result.feedback.id,
              licenseId: auth.license.id,
              message: 'Created mobile translation rating feedback',
              rating: parsedInput.data.rating,
              type: 'mutation',
            });

            return buildApiOkResponse(result, {
              requestId: context.requestId,
              status: result.duplicate ? 200 : 201,
            });
          } catch (error) {
            return buildMobileJobErrorResponse(error, context.requestId);
          }
        },
      },
    },
  }
);
