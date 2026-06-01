import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import { logger } from '@/server/logger';
import { triggerSeoDistributionCycle } from '@/server/seo-distribution/control';

export const Route = createFileRoute('/api/cron/seo-distribution')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const context = buildHttpRequestContext(request);
        const authorization = request.headers.get('authorization');

        if (
          !envServer.CRON_SECRET ||
          authorization !== `Bearer ${envServer.CRON_SECRET}`
        ) {
          return buildApiErrorResponse({
            code: 'unauthorized',
            requestId: context.requestId,
            status: 401,
          });
        }

        try {
          const control = await triggerSeoDistributionCycle({ source: 'cron' });

          return buildApiOkResponse(control, {
            requestId: context.requestId,
          });
        } catch (error) {
          logger.error({
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            requestId: context.requestId,
            scope: 'seo-distribution-cron',
          });

          return buildApiErrorResponse({
            code: 'seo_distribution_trigger_failed',
            requestId: context.requestId,
            status: 500,
          });
        }
      },
    },
  },
});
