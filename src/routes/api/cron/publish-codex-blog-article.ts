import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { envServer } from '@/env/server';
import {
  CodexBlogDuplicateTopicError,
  publishCodexBlogArticleDraft,
} from '@/server/blog/codex';
import { zCodexBlogArticleDraft } from '@/server/blog/codex-draft';
import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import { logger } from '@/server/logger';

export const Route = createFileRoute('/api/cron/publish-codex-blog-article')({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
          const rawDraft = await request.json();
          const draft = zCodexBlogArticleDraft.parse(rawDraft);
          const article = await publishCodexBlogArticleDraft({
            codexModel: request.headers.get('x-codex-model'),
            codexReasoningEffort: request.headers.get(
              'x-codex-reasoning-effort'
            ),
            draft,
          });

          return buildApiOkResponse(
            {
              heroImageUrl: article.heroImageUrl,
              publishedAt: article.publishedAt,
              slug: article.slug,
              status: article.status,
              title: article.title,
            },
            {
              requestId: context.requestId,
            }
          );
        } catch (error) {
          if (error instanceof z.ZodError) {
            return buildApiErrorResponse({
              code: 'invalid_codex_blog_draft',
              details: z.treeifyError(error),
              requestId: context.requestId,
              status: 400,
            });
          }

          if (error instanceof CodexBlogDuplicateTopicError) {
            return buildApiErrorResponse({
              code: 'duplicate_blog_topic',
              details: {
                duplicate: error.duplicate,
              },
              requestId: context.requestId,
              status: 409,
            });
          }

          logger.error({
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            requestId: context.requestId,
            scope: 'blog-codex-publish',
          });

          return buildApiErrorResponse({
            code: 'blog_codex_publish_failed',
            requestId: context.requestId,
            status: 500,
          });
        }
      },
    },
  },
});
