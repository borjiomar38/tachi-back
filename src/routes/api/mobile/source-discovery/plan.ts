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
import { ProviderGatewayError } from '@/server/provider-gateway/errors';
import {
  buildSourceDiscoveryPlan,
  calculateSourceDiscoveryPlanTokenCost,
  SourceDiscoveryError,
  zSourceDiscoveryPlanInput,
} from '@/server/source-discovery/service';

export const Route = createFileRoute('/api/mobile/source-discovery/plan')({
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

        const parsedInput = zSourceDiscoveryPlanInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/source-discovery/plan',
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
              message: 'Rate limited mobile source discovery plan request',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const plan = await buildSourceDiscoveryPlan(parsedInput.data);
          const tokenCost = calculateSourceDiscoveryPlanTokenCost();

          routeLog.info({
            candidateCount: plan.candidates.length,
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            licenseId: auth.license.id,
            message: 'Created mobile source discovery plan',
            query: parsedInput.data.query,
            targetChapter: parsedInput.data.targetChapter ?? null,
            tokenCost,
            type: 'mutation',
          });

          return buildApiOkResponse(plan, {
            requestId: context.requestId,
          });
        } catch (error) {
          if (error instanceof SourceDiscoveryError) {
            routeLog.warn({
              code: error.code,
              err: error,
              message: 'Mobile source discovery plan failed',
              type: 'source_discovery_error',
            });

            return buildApiErrorResponse({
              code: error.code,
              requestId: context.requestId,
              status: error.statusCode,
            });
          }

          if (error instanceof ProviderGatewayError) {
            routeLog.warn({
              code: error.code,
              err: error,
              message: 'Mobile source discovery plan provider failed',
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
