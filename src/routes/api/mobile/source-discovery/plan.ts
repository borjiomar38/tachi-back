import { createFileRoute } from '@tanstack/react-router';

import { db } from '@/server/db';
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
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
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

          const tokenCost = calculateSourceDiscoveryPlanTokenCost();
          const availableTokens =
            tokenCost > 0
              ? await getAvailableLicenseTokenBalance({
                  licenseId: auth.license.id,
                })
              : 0;

          if (tokenCost > 0 && availableTokens < tokenCost) {
            routeLog.warn({
              availableTokens,
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              licenseId: auth.license.id,
              message:
                'Rejected mobile source discovery plan without enough tokens',
              requiredTokens: tokenCost,
              type: 'insufficient_tokens',
            });

            return buildApiErrorResponse({
              code: 'insufficient_tokens',
              details: {
                availableTokens,
                requiredTokens: tokenCost,
              },
              requestId: context.requestId,
              status: 409,
            });
          }

          const plan = await buildSourceDiscoveryPlan(parsedInput.data);

          if (tokenCost > 0) {
            await db.tokenLedger.create({
              data: {
                deltaTokens: -tokenCost,
                description: `Spent tokens for source discovery plan ${context.requestId}`,
                deviceId: auth.device.id,
                idempotencyKey: `source-discovery-plan:${context.requestId}`,
                licenseId: auth.license.id,
                metadata: {
                  aliasCount: plan.aliases.length,
                  candidateCount: plan.candidates.length,
                  completedAt: new Date().toISOString(),
                  query: parsedInput.data.query,
                  requestId: context.requestId,
                  targetChapter: parsedInput.data.targetChapter ?? null,
                },
                status: 'posted',
                type: 'job_spend',
              },
            });
          }

          routeLog.info({
            aliasCount: plan.aliases.length,
            aliases: plan.aliases.slice(0, 12),
            candidateCount: plan.candidates.length,
            candidateSample: plan.candidates.slice(0, 12).map((candidate) => ({
              adapterKey: candidate.adapterKey,
              methodStatus: candidate.searchMethod?.status ?? null,
              methodType: candidate.searchMethod?.methodType ?? null,
              sourceLanguage: candidate.sourceLanguage,
              sourceName: candidate.sourceName,
            })),
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            knownResultCount: plan.knownResults.length,
            licenseId: auth.license.id,
            message: 'Created mobile source discovery plan',
            query: parsedInput.data.query,
            runnableMethodCount: plan.candidates.filter(
              (candidate) =>
                candidate.searchMethod &&
                candidate.searchMethod.methodType !== 'unsupported'
            ).length,
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
