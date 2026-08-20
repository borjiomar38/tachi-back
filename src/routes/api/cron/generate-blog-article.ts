import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import {
  buildApiErrorResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';

export const Route = createFileRoute('/api/cron/generate-blog-article')({
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

        return buildApiErrorResponse({
          code: 'legacy_blog_generator_disabled',
          details: {
            replacement: '/api/cron/generate-codex-blog-prompt',
          },
          requestId: context.requestId,
          status: 410,
        });
      },
    },
  },
});
