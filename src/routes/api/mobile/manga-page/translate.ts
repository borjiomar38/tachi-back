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
import {
  buildMangaPageTranslationSpendIdempotencyKey,
  calculateMangaPageTranslationTokenCost,
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

          const requestedTokenCost = calculateMangaPageTranslationTokenCost(
            parsedInput.data
          );
          const spendIdempotencyKey =
            requestedTokenCost > 0
              ? buildMangaPageTranslationSpendIdempotencyKey({
                  licenseId: auth.license.id,
                  request: parsedInput.data,
                })
              : null;
          const existingSpend =
            spendIdempotencyKey != null
              ? await db.tokenLedger.findUnique({
                  where: {
                    idempotencyKey: spendIdempotencyKey,
                  },
                  select: {
                    id: true,
                  },
                })
              : null;
          const tokenCost = existingSpend ? 0 : requestedTokenCost;
          const availableTokens = await getAvailableLicenseTokenBalance({
            licenseId: auth.license.id,
          });

          if (availableTokens < tokenCost) {
            routeLog.warn({
              availableTokens,
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              licenseId: auth.license.id,
              message:
                'Rejected mobile manga page translation without enough tokens',
              targetLanguage: parsedInput.data.targetLanguage,
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

          const translated = await translateMangaPage(parsedInput.data);

          let chargedTokenCost = 0;

          if (tokenCost > 0 && spendIdempotencyKey != null) {
            const ledgerResult = await db.tokenLedger.createMany({
              data: [
                {
                  deltaTokens: -tokenCost,
                  description: `Spent tokens for manga page translation ${parsedInput.data.manga.title}`,
                  deviceId: auth.device.id,
                  idempotencyKey: spendIdempotencyKey,
                  licenseId: auth.license.id,
                  metadata: {
                    chapterCount: parsedInput.data.chapters.length,
                    completedAt: new Date().toISOString(),
                    mangaTitle: parsedInput.data.manga.title,
                    mangaUrl: parsedInput.data.manga.url,
                    requestId: context.requestId,
                    sourceId: parsedInput.data.sourceId,
                    sourceLanguage: parsedInput.data.sourceLanguage,
                    sourceName: parsedInput.data.sourceName ?? null,
                    targetLanguage: parsedInput.data.targetLanguage,
                  },
                  status: 'posted',
                  type: 'job_spend',
                },
              ],
              skipDuplicates: true,
            });

            chargedTokenCost = ledgerResult.count > 0 ? tokenCost : 0;
          }

          routeLog.info({
            chapterCount: translated.chapters.length,
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            licenseId: auth.license.id,
            message: 'Translated mobile manga page metadata',
            targetLanguage: translated.targetLanguage,
            chargedTokenCost,
            requestedTokenCost,
            tokenCost: chargedTokenCost,
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
