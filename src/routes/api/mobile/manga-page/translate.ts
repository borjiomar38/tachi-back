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
  translateMangaPage,
  zTranslateMangaPageInput,
} from '@/server/manga-page-translation/service';
import { ProviderGatewayError } from '@/server/provider-gateway/errors';

export const Route = createFileRoute('/api/mobile/manga-page/translate')({
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

        const parsedInput = zTranslateMangaPageInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/manga-page/translate',
          requestId: context.requestId,
          scope: 'manga-page-translation',
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
              message: 'Rate limited mobile manga page translation request',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const translated = await translateMangaPage(parsedInput.data);

          routeLog.info({
            chapterCount: translated.chapters.length,
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            licenseId: auth.license.id,
            message: 'Translated mobile manga page metadata',
            targetLanguage: translated.targetLanguage,
            type: 'mutation',
          });

          return buildApiOkResponse(translated, {
            requestId: context.requestId,
          });
        } catch (error) {
          if (error instanceof ProviderGatewayError) {
            routeLog.warn({
              code: error.code,
              err: error,
              message: 'Mobile manga page translation provider failed',
              provider: error.provider,
              type: 'provider_error',
            });

            return buildApiErrorResponse({
              code: error.code,
              details: {
                provider: error.provider,
              },
              requestId: context.requestId,
              status: error.statusCode,
            });
          }

          return buildMobileJobErrorResponse(error, context.requestId);
        }
      },
    },
  },
});
