import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import {
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import {
  authenticateMobileAccessToken,
  buildMobileSessionSummary,
  MobileAuthError,
} from '@/server/mobile-auth/session';
import {
  buildMobileSubscriptionErrorResponse,
  DEFAULT_MOBILE_UPGRADE_TOKEN_PACK_KEY,
  upgradeMobileLicenseSubscription,
} from '@/server/mobile-auth/subscription';

const zUpgradeMobileSubscriptionInput = z.object({
  tokenPackKey: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/i)
    .default(DEFAULT_MOBILE_UPGRADE_TOKEN_PACK_KEY),
});

export const Route = createFileRoute('/api/mobile/subscription/upgrade')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);

        try {
          const auth = await authenticateMobileAccessToken(request);
          const payload = await readJsonPayload(request);
          const parsedInput =
            zUpgradeMobileSubscriptionInput.safeParse(payload);

          if (!parsedInput.success) {
            return Response.json(
              {
                error: {
                  code: 'invalid_request',
                  details: parsedInput.error.flatten(),
                },
                ok: false,
              },
              {
                headers: {
                  'X-Request-ID': context.requestId,
                },
                status: 400,
              }
            );
          }

          const upgrade = await upgradeMobileLicenseSubscription(auth, {
            tokenPackKey: parsedInput.data.tokenPackKey,
          });
          const summary = await buildMobileSessionSummary(auth);

          return buildApiOkResponse(
            {
              summary,
              upgrade,
            },
            {
              requestId: context.requestId,
            }
          );
        } catch (error) {
          if (error instanceof MobileAuthError) {
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

          return buildMobileSubscriptionErrorResponse(error, context.requestId);
        }
      },
    },
  },
});

async function readJsonPayload(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
