import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
} from '@/server/http/route-utils';
import {
  assertPolicySyncAuthorized,
  getPublicMobileAppUpdatePolicy,
  putMobileAppUpdatePolicy,
} from '@/server/mobile-update-policy';

export const Route = createFileRoute('/api/mobile/app-update-policy')({
  server: {
    handlers: {
      GET: async () => {
        const policy = await getPublicMobileAppUpdatePolicy();

        return Response.json(policy, {
          headers: {
            'Cache-Control': 'no-store',
          },
        });
      },
      POST: async ({ request }) => {
        const context = buildHttpRequestContext(request);

        if (!assertPolicySyncAuthorized(request)) {
          return buildApiErrorResponse({
            code: 'unauthorized',
            requestId: context.requestId,
            status: 401,
          });
        }

        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          return buildInvalidRequestResponse(context.requestId);
        }

        try {
          const policy = await putMobileAppUpdatePolicy(payload);

          return buildApiOkResponse(policy, {
            requestId: context.requestId,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return buildInvalidRequestResponse(
              context.requestId,
              error.flatten()
            );
          }

          throw error;
        }
      },
    },
  },
});
