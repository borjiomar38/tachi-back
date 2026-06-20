import { createFileRoute } from '@tanstack/react-router';

import {
  buildApiErrorResponse,
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
  recordTranslationRatingFeedback,
  TranslationRatingFeedbackError,
  zTranslationRatingFeedbackInput,
} from '@/server/translation-rating-feedback/service';

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
            zTranslationRatingFeedbackInput.safeParse(payload);

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

            const result = await recordTranslationRatingFeedback(
              parsedInput.data,
              {
                actor: {
                  deviceId: auth.device.id,
                  licenseId: auth.license.id,
                },
                requestContext: context,
              }
            );

            routeLog.info({
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              duplicate: result.duplicate,
              licenseId: auth.license.id,
              message: 'Recorded mobile translation rating feedback',
              status: parsedInput.data.status,
              targetLanguage: parsedInput.data.targetLanguage,
              type: 'mutation',
            });

            return buildApiOkResponse(result, {
              requestId: context.requestId,
            });
          } catch (error) {
            if (error instanceof TranslationRatingFeedbackError) {
              return buildApiErrorResponse({
                code: error.code,
                details: error.details,
                requestId: context.requestId,
                status: error.statusCode,
              });
            }

            return buildMobileJobErrorResponse(error, context.requestId);
          }
        },
      },
    },
  }
);
