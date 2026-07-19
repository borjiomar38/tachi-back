import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
  buildRateLimitedResponse,
} from '@/server/http/route-utils';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import {
  recordDeviceContentVisit,
  zDeviceContentVisitInput,
} from '@/server/services/device-content-activity';

export const Route = createFileRoute('/api/mobile/activity/visit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);

        if (envClient.VITE_IS_DEMO) {
          return buildApiErrorResponse({
            code: 'demo_mode',
            requestId: context.requestId,
            status: 405,
          });
        }

        if (!envServer.MOBILE_API_ENABLED) {
          return buildApiErrorResponse({
            code: 'mobile_api_disabled',
            requestId: context.requestId,
            status: 503,
          });
        }

        const payload: unknown = await request.json().catch(() => null);
        const parsed = zDeviceContentVisitInput.safeParse(payload);

        if (!parsed.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsed.error.flatten()
          );
        }

        const rateLimit = consumeInMemoryRateLimit({
          key: `mobile-content-visit:${parsed.data.installationId}`,
          limit: 120,
          windowMs: 60_000,
        });

        if (!rateLimit.allowed) {
          return buildRateLimitedResponse(
            context.requestId,
            rateLimit.retryAfterMs
          );
        }

        const result = await recordDeviceContentVisit(parsed.data);

        return buildApiOkResponse(result, {
          requestId: context.requestId,
        });
      },
    },
  },
});
