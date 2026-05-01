import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import { generateDailyBlogArticle } from '@/server/blog/service';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import { logger } from '@/server/logger';

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

        try {
          const article = await generateDailyBlogArticle();

          return buildApiOkResponse(
            {
              publishedAt: article.publishedAt,
              slug: article.slug,
              title: article.title,
            },
            {
              requestId: context.requestId,
            }
          );
        } catch (error) {
          logger.error({
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            requestId: context.requestId,
            scope: 'blog-cron',
          });

          return buildApiErrorResponse({
            code: 'blog_generation_failed',
            requestId: context.requestId,
            status: 500,
          });
        }
      },
    },
  },
});
