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
  calculateSourceDiscoveryVerifyTokenCost,
  SourceDiscoveryError,
  verifySourceDiscoveryCandidates,
  zSourceDiscoveryVerifyInput,
} from '@/server/source-discovery/service';

export const Route = createFileRoute('/api/mobile/source-discovery/verify')({
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

        const parsedInput = zSourceDiscoveryVerifyInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/source-discovery/verify',
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
              message: 'Rate limited mobile source discovery verification',
              retryAfterMs: rateLimit.retryAfterMs,
              type: 'rate_limit',
            });

            return buildMobileJobRateLimitedResponse(
              context.requestId,
              rateLimit.retryAfterMs
            );
          }

          const tokenCost = calculateSourceDiscoveryVerifyTokenCost(
            parsedInput.data
          );
          const availableTokens =
            tokenCost > 0
              ? await getAvailableLicenseTokenBalance({
                  licenseId: auth.license.id,
                })
              : 0;

          if (tokenCost > 0 && availableTokens < tokenCost) {
            routeLog.warn({
              availableTokens,
              candidateCount: parsedInput.data.candidates.length,
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              licenseId: auth.license.id,
              message:
                'Rejected mobile source discovery verification without enough tokens',
              tokenCost,
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

          const result = await verifySourceDiscoveryCandidates(
            parsedInput.data
          );

          if (tokenCost > 0) {
            await db.tokenLedger.create({
              data: {
                deltaTokens: -tokenCost,
                description: `Spent tokens for source discovery verification ${context.requestId}`,
                deviceId: auth.device.id,
                idempotencyKey: `source-discovery-verify:${context.requestId}`,
                licenseId: auth.license.id,
                metadata: {
                  candidateCount: parsedInput.data.candidates.length,
                  completedAt: new Date().toISOString(),
                  matchCount: result.matches.filter(
                    (match) => match.decision === 'match'
                  ).length,
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
            candidateCount: parsedInput.data.candidates.length,
            candidateSample: parsedInput.data.candidates
              .slice(0, 12)
              .map((candidate) => ({
                latest:
                  candidate.latestChapterNumber ??
                  candidate.latestChapterName ??
                  null,
                sourceLanguage: candidate.sourceLanguage,
                sourceName: candidate.sourceName,
                title: candidate.title,
              })),
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            licenseId: auth.license.id,
            matchCount: result.matches.length,
            missingLatestCandidateCount: parsedInput.data.candidates.filter(
              (candidate) =>
                candidate.latestChapterNumber == null &&
                !candidate.latestChapterName?.trim()
            ).length,
            message: 'Verified mobile source discovery candidates',
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
              message: 'Mobile source discovery verification provider failed',
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
