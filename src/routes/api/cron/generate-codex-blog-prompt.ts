import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import { buildDailyCodexBlogArticlePrompt } from '@/server/blog/codex';
import {
  buildApiErrorResponse,
  buildHttpRequestContext,
  buildTextResponse,
} from '@/server/http/route-utils';
import { logger } from '@/server/logger';

export const Route = createFileRoute('/api/cron/generate-codex-blog-prompt')({
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
          const prompt = await buildDailyCodexBlogArticlePrompt();

          return buildTextResponse(prompt, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
            },
            requestId: context.requestId,
            status: 200,
          });
        } catch (error) {
          logger.error({
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            requestId: context.requestId,
            scope: 'blog-codex-prompt',
          });

          return buildApiErrorResponse({
            code: 'blog_codex_prompt_failed',
            requestId: context.requestId,
            status: 500,
          });
        }
      },
    },
  },
});
