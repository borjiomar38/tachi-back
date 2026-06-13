import { createFileRoute } from '@tanstack/react-router';

import {
  buildExplicitAdultContentBlockDetails,
  getExplicitAdultContentGateResult,
} from '@/server/content-policy/explicit-adult-content-gate';
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
  voidMobileJobReservationOnError,
} from '@/server/jobs/http';
import {
  FreeTrialDailyLimitError,
  type FreeTrialDailyUsageReservation,
  markFreeTrialDailyUsageReservationPosted,
  reserveFreeTrialDailyMangaPageUsage,
  resolveFreeTrialDailyLimitScope,
} from '@/server/licenses/free-trial-daily-limit';
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
        let freeTrialDailyUsageReservation: FreeTrialDailyUsageReservation | null =
          null;

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

          const gateResult = getExplicitAdultContentGateResult({
            manga: parsedInput.data.manga,
          });

          if (gateResult) {
            routeLog.warn({
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              licenseId: auth.license.id,
              mangaTitle: parsedInput.data.manga.title,
              message: 'Blocked explicit adult manga page translation request',
              signal: gateResult.signal,
              type: 'explicit_adult_content_blocked',
            });

            return buildApiErrorResponse({
              code: 'explicit_adult_content_blocked',
              details: buildExplicitAdultContentBlockDetails(gateResult),
              requestId: context.requestId,
              status: 451,
            });
          }

          const now = new Date();
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

          const freeTrialDailyLimitScope =
            await resolveFreeTrialDailyLimitScope({
              dbClient: db,
              licenseId: auth.license.id,
              now,
            });

          routeLog.info({
            chapterCount: parsedInput.data.chapters.length,
            clientIp: context.clientIp,
            deviceId: auth.device.id,
            hasFreeTrialDailyLimit: Boolean(freeTrialDailyLimitScope),
            licenseId: auth.license.id,
            mangaTitle: parsedInput.data.manga.title,
            message: 'Checking mobile manga page free trial daily usage',
            targetLanguage: parsedInput.data.targetLanguage,
            tokenCost,
            type: 'free_trial_daily_limit_check',
          });

          freeTrialDailyUsageReservation = await db.$transaction(async (tx) => {
            return await reserveFreeTrialDailyMangaPageUsage({
              actor: {
                deviceId: auth.device.id,
                licenseId: auth.license.id,
              },
              request: parsedInput.data,
              scope: freeTrialDailyLimitScope,
              tx,
            });
          });

          if (freeTrialDailyUsageReservation) {
            routeLog.info({
              clientIp: context.clientIp,
              deviceId: auth.device.id,
              licenseId: auth.license.id,
              message: 'Reserved mobile manga page free trial daily usage',
              reservationKey:
                freeTrialDailyUsageReservation.idempotencyKey.slice(0, 48),
              type: 'free_trial_daily_usage_reserved',
            });
          }

          const translated = await translateMangaPage(parsedInput.data);

          let chargedTokenCost = 0;

          if (
            (tokenCost > 0 && spendIdempotencyKey != null) ||
            freeTrialDailyUsageReservation
          ) {
            const ledgerResult = await db.$transaction(async (tx) => {
              const spendResult =
                tokenCost > 0 && spendIdempotencyKey != null
                  ? await tx.tokenLedger.createMany({
                      data: [
                        {
                          deltaTokens: -tokenCost,
                          description: `Spent tokens for manga page translation ${parsedInput.data.manga.title}`,
                          deviceId: auth.device.id,
                          idempotencyKey: spendIdempotencyKey,
                          licenseId: auth.license.id,
                          metadata: {
                            chapterCount: parsedInput.data.chapters.length,
                            chapters: parsedInput.data.chapters
                              .slice(0, 50)
                              .map((chapter) => ({
                                key: chapter.key,
                                name: chapter.name,
                                number: resolveChapterNumber(chapter),
                                url: chapter.url || null,
                              })),
                            completedAt: new Date().toISOString(),
                            ...(freeTrialDailyUsageReservation
                              ? {
                                  freeTrialDailyUsageIdempotencyKey:
                                    freeTrialDailyUsageReservation.idempotencyKey,
                                }
                              : {}),
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
                    })
                  : null;

              await markFreeTrialDailyUsageReservationPosted({
                dbClient: tx as typeof db,
                reservation: freeTrialDailyUsageReservation,
              });

              return spendResult;
            });

            chargedTokenCost = (ledgerResult?.count ?? 0) > 0 ? tokenCost : 0;
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
          await voidMobileJobReservationOnError({
            error,
            reservation: freeTrialDailyUsageReservation,
          });

          if (error instanceof FreeTrialDailyLimitError) {
            routeLog.warn({
              details: error.details,
              message:
                'Rejected mobile manga page translation by free trial daily limit',
              type: 'free_trial_daily_limit_exceeded',
            });
          }

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

function resolveChapterNumber(input: {
  key: string;
  name: string;
  url: string;
}) {
  for (const value of [input.name, input.url, input.key]) {
    const match =
      value.match(
        /(?:chapter|chap|ch\.?|episode|ep\.?|cap[ií]tulo)\s*#?\s*([0-9]+(?:[.,][0-9]+)?)/i
      ) ??
      value.match(/第\s*([0-9]+(?:[.,][0-9]+)?)/i) ??
      value.match(/(?:^|[/\s_-])([0-9]+(?:[.,][0-9]+)?)(?:$|[/\s_-])/);

    if (match?.[1]) {
      return match[1].replace(',', '.');
    }
  }

  return null;
}
