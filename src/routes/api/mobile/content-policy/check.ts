import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import {
  buildContentPolicyBlockDetails,
  getContentPolicyGateResult,
} from '@/server/content-policy/translation-gate';
import { db } from '@/server/db';
import {
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
} from '@/server/http/route-utils';
import { logger } from '@/server/logger';

const zMobileContentPolicyMangaInput = z
  .object({
    categories: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    contentRating: z.string().trim().min(1).max(255).optional(),
    genres: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    mangaTitle: z.string().trim().min(1).max(255).optional(),
    mangaUrl: z.string().trim().min(1).max(2048).optional(),
    rating: z.string().trim().min(1).max(255).optional(),
    sourceId: z.string().trim().min(1).max(64).optional(),
    sourceName: z.string().trim().min(1).max(255).optional(),
    tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  })
  .strict();

const zMobileContentPolicyCheckInput = z
  .object({
    manga: zMobileContentPolicyMangaInput,
  })
  .strict();

export const Route = createFileRoute('/api/mobile/content-policy/check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);
        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          return buildInvalidRequestResponse(context.requestId);
        }

        const parsedInput = zMobileContentPolicyCheckInput.safeParse(payload);

        if (!parsedInput.success) {
          return buildInvalidRequestResponse(
            context.requestId,
            parsedInput.error.flatten()
          );
        }

        const routeLog = logger.child({
          path: '/api/mobile/content-policy/check',
          requestId: context.requestId,
          scope: 'content-policy',
        });
        const gateResult = await getContentPolicyGateResult(
          {
            manga: parsedInput.data.manga,
          },
          {
            dbClient: db,
          }
        );

        if (!gateResult) {
          return buildApiOkResponse(
            {
              blocked: false,
              details: null,
              reason: null,
              signal: null,
            },
            {
              requestId: context.requestId,
            }
          );
        }

        routeLog.warn({
          clientIp: context.clientIp,
          mangaTitle: parsedInput.data.manga.mangaTitle,
          message: 'Blocked mobile content policy check',
          signal: gateResult.signal,
          sourceId: parsedInput.data.manga.sourceId,
          sourceName: parsedInput.data.manga.sourceName,
          type: 'content_policy_blocked',
          userAgent: context.userAgent,
        });

        return buildApiOkResponse(
          {
            blocked: true,
            details: buildContentPolicyBlockDetails(gateResult),
            reason: gateResult.reason,
            signal: gateResult.signal,
          },
          {
            requestId: context.requestId,
          }
        );
      },
    },
  },
});
