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
import { createMobileFunnelEventInputSchema } from '@/server/product-analytics/schema';
import { recordMobileFunnelEvent } from '@/server/product-analytics/service';

const FUNNEL_EVENT_RATE_LIMIT = 120;
const FUNNEL_EVENT_RATE_LIMIT_WINDOW_MS = 60_000;

export const Route = createFileRoute('/api/mobile/funnel-events')({
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

        const ipRateLimit = consumeInMemoryRateLimit({
          key: `mobile-funnel-event:ip:${context.clientIp}`,
          limit: FUNNEL_EVENT_RATE_LIMIT,
          windowMs: FUNNEL_EVENT_RATE_LIMIT_WINDOW_MS,
        });

        if (!ipRateLimit.allowed) {
          return buildRateLimitedResponse(
            context.requestId,
            ipRateLimit.retryAfterMs
          );
        }

        const payload: unknown = await request.json().catch(() => null);
        const parsedInput =
          createMobileFunnelEventInputSchema().safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const installationRateLimit = consumeInMemoryRateLimit({
          key: `mobile-funnel-event:installation:${parsedInput.data.installationId}`,
          limit: FUNNEL_EVENT_RATE_LIMIT,
          windowMs: FUNNEL_EVENT_RATE_LIMIT_WINDOW_MS,
        });

        if (!installationRateLimit.allowed) {
          return buildRateLimitedResponse(
            context.requestId,
            installationRateLimit.retryAfterMs
          );
        }

        const result = await recordMobileFunnelEvent(parsedInput.data);

        return buildApiOkResponse(result, {
          requestId: context.requestId,
        });
      },
    },
  },
});
