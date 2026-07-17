import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { envServer } from '@/env/server';
import {
  CodexBlogDuplicateTopicError,
  CodexBlogTopicSelectionError,
  publishCodexBlogArticleDraft,
} from '@/server/blog/codex';
import { zCodexBlogArticlePublishPayload } from '@/server/blog/codex-draft';
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
          const rawPayload = await request.json();
          const payload = zCodexBlogArticlePublishPayload.parse(rawPayload);
          const article = await publishCodexBlogArticleDraft({
            codexModel: request.headers.get('x-codex-model'),
            codexReasoningEffort: request.headers.get(
              'x-codex-reasoning-effort'
            ),
            draft: payload,
            heroImage: payload.heroImage,
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
            return buildApiOkResponse(
              {
                details: {
                  duplicate: error.duplicate,
                },
                published: false,
                reason: 'duplicate_blog_topic',
                status: 'skipped',
              },
              {
                requestId: context.requestId,
              }
            );
          }

          if (error instanceof CodexBlogTopicSelectionError) {
            return buildApiOkResponse(
              {
                details: error.details,
                published: false,
                reason: 'invalid_or_unverified_blog_topic',
                status: 'skipped',
              },
              {
                requestId: context.requestId,
              }
            );
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
