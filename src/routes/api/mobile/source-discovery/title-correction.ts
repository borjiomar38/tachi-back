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
  calculateSourceDiscoveryTitleCorrectionTokenCost,
  generateSourceDiscoveryTitleCorrection,
  SourceDiscoveryError,
  zSourceDiscoveryTitleCorrectionInput,
} from '@/server/source-discovery/service';

export const Route = createFileRoute(
  '/api/mobile/source-discovery/title-correction'
)({
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
          zSourceDiscoveryTitleCorrectionInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/source-discovery/title-correction',
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
            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const tokenCost = calculateSourceDiscoveryTitleCorrectionTokenCost(
            parsedInput.data
          );
          const availableTokens =
            tokenCost > 0
              ? await getAvailableLicenseTokenBalance({
                  licenseId: auth.license.id,
                })
              : 0;

          if (tokenCost > 0 && availableTokens < tokenCost) {
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

          const result = await generateSourceDiscoveryTitleCorrection(
            parsedInput.data
          );

          if (tokenCost > 0) {
            await db.tokenLedger.create({
              data: {
                deltaTokens: -tokenCost,
                description: `Spent tokens for source discovery title correction ${context.requestId}`,
                deviceId: auth.device.id,
                idempotencyKey: `source-discovery-title-correction:${context.requestId}`,
                licenseId: auth.license.id,
                metadata: {
                  aliasCount: result.aliases.length,
                  completedAt: new Date().toISOString(),
                  query: parsedInput.data.query,
                  requestId: context.requestId,
                  searchedCandidateCount:
                    parsedInput.data.searchedCandidateCount,
                  targetChapter: parsedInput.data.targetChapter ?? null,
                },
                status: 'posted',
                type: 'job_spend',
              },
            });
          }

          routeLog.info({
            aliasCount: result.aliases.length,
            canRetry: result.canRetry,
            deviceId: auth.device.id,
            licenseId: auth.license.id,
            message: 'Generated mobile source discovery title correction',
            query: parsedInput.data.query,
            tokenCost,
            type: 'mutation',
          });

          return buildApiOkResponse(result, {
            requestId: context.requestId,
          });
        } catch (error) {
          if (error instanceof SourceDiscoveryError) {
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
              message:
                'Mobile source discovery title correction provider failed',
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
