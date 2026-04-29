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
  submitSourceDiscoveryResults,
  zSourceDiscoveryResultSubmitInput,
} from '@/server/source-discovery/service';

export const Route = createFileRoute('/api/mobile/source-discovery/results')({
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
          zSourceDiscoveryResultSubmitInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/source-discovery/results',
          requestId: context.requestId,
          scope: 'source-discovery',
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
              message: 'Rate limited mobile source discovery result submit',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const result = await submitSourceDiscoveryResults(parsedInput.data);

          routeLog.info({
            accepted: result.accepted,
            missingLatestInputCount: parsedInput.data.results.filter(
              (item) =>
                item.latestChapterNumber == null &&
                !item.latestChapterName?.trim()
            ).length,
            query: parsedInput.data.query,
            rejected: result.rejected,
            resultCount: parsedInput.data.results.length,
            resultSample: parsedInput.data.results.slice(0, 12).map((item) => ({
              latest:
                item.latestChapterNumber ?? item.latestChapterName ?? null,
              sourceLanguage: item.sourceLanguage,
              sourceName: item.sourceName,
              title: item.title,
            })),
            type: 'success',
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
