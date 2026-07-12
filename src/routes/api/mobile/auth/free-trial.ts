import { createFileRoute } from '@tanstack/react-router';
import { waitUntil } from '@vercel/functions';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import {
  buildFreeAccessIpBlockedErrorBody,
  getFreeAccessIpBlock,
  isFreeAccessIpBlockedError,
} from '@/server/licenses/free-access-ip-block';
import {
  createFreeTrialRedeemCode,
  isFreeTrialActivationError,
} from '@/server/licenses/free-trial';
import { sendFreeTrialRedeemCodeEmail } from '@/server/licenses/free-trial-email';
import { reviewFreeTrialEmailRisk } from '@/server/licenses/free-trial-email-risk';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { redeemLicenseToDevice } from '@/server/licenses/redeem';
import { getClientIp } from '@/server/licenses/utils';
import { logger } from '@/server/logger';
import {
  zCreateFreeTrialMobileSessionInput,
  zFreeTrialEmailCodeResponse,
  zMobileActivationResponse,
} from '@/server/mobile-auth/schema';
import {
  createMobileSession,
  MobileAuthError,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/auth/free-trial')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (envClient.VITE_IS_DEMO) {
          return new Response('Demo Mode', { status: 405 });
        }

        if (!envServer.MOBILE_API_ENABLED) {
          return Response.json(
            {
              error: {
                code: 'mobile_api_disabled',
              },
              ok: false,
            },
            { status: 503 }
          );
        }

        const clientIp = getClientIp(request);
        const rateLimitIp = clientIp ?? 'unknown';
        const userAgent = request.headers.get('user-agent');
        const routeLog = logger.child({
          path: '/api/mobile/auth/free-trial',
          scope: 'mobile-auth',
        });
        const windowMs = envServer.REDEEM_RATE_LIMIT_WINDOW_SECONDS * 1000;
        const freeAccessIpBlock = await getFreeAccessIpBlock(clientIp);

        if (freeAccessIpBlock) {
          return Response.json(
            {
              error: buildFreeAccessIpBlockedErrorBody(freeAccessIpBlock),
              ok: false,
            },
            { status: 402 }
          );
        }

        const ipRateLimit = consumeInMemoryRateLimit({
          key: `mobile-auth-free-trial:ip:${rateLimitIp}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!ipRateLimit.allowed) {
          return buildRateLimitedResponse(ipRateLimit.retryAfterMs);
        }

        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          return invalidRequestResponse();
        }

        const parsedInput =
          zCreateFreeTrialMobileSessionInput.safeParse(payload);

        if (!parsedInput.success) {
          return invalidRequestResponse(parsedInput.error.flatten());
        }

        routeLog.info({
          appBuild: parsedInput.data.appBuild,
          appVersion: parsedInput.data.appVersion,
          buildChannel: parsedInput.data.buildChannel,
          clientIp,
          email: maskEmailForLog(parsedInput.data.email),
          installationId: parsedInput.data.installationId,
          message: 'Mobile free trial activation requested',
          type: 'free_trial_activation_start',
        });

        const installationRateLimit = consumeInMemoryRateLimit({
          key: `mobile-auth-free-trial:installation:${parsedInput.data.installationId}`,
          limit: envServer.REDEEM_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs,
        });

        if (!installationRateLimit.allowed) {
          return buildRateLimitedResponse(installationRateLimit.retryAfterMs);
        }

        try {
          const trial = await createFreeTrialRedeemCode(parsedInput.data, {
            clientIp,
          });
          routeLog.info({
            deliveryMode: trial.deliveryMode,
            emailRiskReviewEnabled: trial.emailRiskReviewEnabled,
            installationId: parsedInput.data.installationId,
            message: 'Free trial runtime configuration resolved',
            tokenAmount: trial.tokenAmount,
            type: 'free_trial_configuration_resolved',
          });

          if (trial.deliveryMode === 'email_code') {
            try {
              await sendFreeTrialRedeemCodeEmail({
                redeemCode: trial.redeemCode,
                to: parsedInput.data.email,
                tokenAmount: trial.tokenAmount,
              });
            } catch (error) {
              routeLog.error({
                clientIp,
                email: maskEmailForLog(parsedInput.data.email),
                errorMessage:
                  error instanceof Error ? error.message : 'Unknown error',
                installationId: parsedInput.data.installationId,
                message: 'Free trial redeem email delivery failed',
                type: 'free_trial_email_delivery_error',
              });
              return Response.json(
                {
                  error: {
                    code: 'free_trial_email_delivery_failed',
                  },
                  ok: false,
                },
                { status: 502 }
              );
            }

            scheduleEmailRiskReview({
              claimId: trial.claimId,
              enabled: trial.emailRiskReviewEnabled,
            });
            routeLog.info({
              clientIp,
              email: maskEmailForLog(parsedInput.data.email),
              installationId: parsedInput.data.installationId,
              message: 'Free trial redeem code sent by email',
              tokenAmount: trial.tokenAmount,
              type: 'free_trial_email_delivery_success',
            });

            return Response.json({
              data: zFreeTrialEmailCodeResponse.parse({
                deliveryMode: 'email_code',
                email: parsedInput.data.email.trim(),
                tokenAmount: trial.tokenAmount,
              }),
              ok: true,
            });
          }

          const activation = await redeemLicenseToDevice(
            {
              ...parsedInput.data,
              redeemCode: trial.redeemCode,
            },
            {
              clientIp,
            }
          );
          const auth = await createMobileSession(
            {
              appBuild: parsedInput.data.appBuild,
              appVersion: parsedInput.data.appVersion,
              buildChannel: parsedInput.data.buildChannel,
              deviceId: activation.device.id,
              installationId: activation.device.installationId,
              licenseId: activation.license.id,
            },
            {
              clientIp,
              userAgent,
            }
          );

          routeLog.info({
            activationStatus: activation.activationStatus,
            clientIp,
            deviceId: activation.device.id,
            installationId: activation.device.installationId,
            licenseId: activation.license.id,
            message: 'Mobile free trial activation succeeded',
            redeemCode: maskRedeemCodeForLog(activation.redeemCode.code),
            type: 'free_trial_activation_success',
          });

          scheduleEmailRiskReview({
            claimId: trial.claimId,
            enabled: trial.emailRiskReviewEnabled,
          });

          return Response.json({
            data: zMobileActivationResponse.parse({
              activation,
              auth,
            }),
            ok: true,
          });
        } catch (error) {
          if (isFreeAccessIpBlockedError(error)) {
            routeLog.warn({
              code: error.code,
              clientIp,
              installationId: parsedInput.data.installationId,
              message: 'Mobile free trial blocked by free access IP rule',
              type: 'free_trial_activation_error',
            });
            return Response.json(
              {
                error: buildFreeAccessIpBlockedErrorBody(error),
                ok: false,
              },
              { status: error.statusCode }
            );
          }

          if (error instanceof MobileAuthError) {
            routeLog.warn({
              code: error.code,
              clientIp,
              installationId: parsedInput.data.installationId,
              message: 'Mobile free trial session creation failed',
              type: 'free_trial_activation_error',
            });
            return Response.json(
              {
                error: {
                  code: error.code,
                },
                ok: false,
              },
              { status: error.statusCode }
            );
          }

          if (isFreeTrialActivationError(error)) {
            routeLog.warn({
              code: error.code,
              clientIp,
              installationId: parsedInput.data.installationId,
              message: 'Mobile free trial activation rejected',
              type: 'free_trial_activation_error',
            });
            return Response.json(
              {
                error: {
                  code: error.code,
                },
                ok: false,
              },
              { status: error.statusCode }
            );
          }

          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            'statusCode' in error
          ) {
            routeLog.warn({
              code: String(error.code),
              clientIp,
              installationId: parsedInput.data.installationId,
              message: 'Mobile free trial activation failed',
              type: 'free_trial_activation_error',
            });
            return Response.json(
              {
                error: {
                  code: String(error.code),
                },
                ok: false,
              },
              { status: Number(error.statusCode) }
            );
          }

          throw error;
        }
      },
    },
  },
});

function invalidRequestResponse(details?: unknown) {
  return Response.json(
    {
      error: {
        code: 'invalid_request',
        details,
      },
      ok: false,
    },
    { status: 400 }
  );
}

function buildRateLimitedResponse(retryAfterMs: number) {
  return Response.json(
    {
      error: {
        code: 'rate_limited',
      },
      ok: false,
    },
    {
      headers: {
        'Retry-After': Math.max(Math.ceil(retryAfterMs / 1000), 1).toString(),
      },
      status: 429,
    }
  );
}

function maskEmailForLog(email: string) {
  const normalized = email.trim();
  const atIndex = normalized.indexOf('@');

  if (!normalized || atIndex <= 0) {
    return '***';
  }

  return `${normalized.slice(0, 1)}***${normalized.slice(atIndex)}`;
}

function maskRedeemCodeForLog(code: string) {
  const normalized = code.trim();

  if (normalized.length <= 8) {
    return '***';
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function scheduleEmailRiskReview(input: { claimId: string; enabled: boolean }) {
  if (!input.enabled) {
    return;
  }

  waitUntil(
    reviewFreeTrialEmailRisk({ claimId: input.claimId }).catch((error) => {
      logger.error({
        claimId: input.claimId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        message: 'Asynchronous free trial email review failed',
        type: 'free_trial_email_review_error',
      });
    })
  );
}
