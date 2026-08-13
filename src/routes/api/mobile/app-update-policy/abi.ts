import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildInvalidRequestResponse,
} from '@/server/http/route-utils';
import {
  getEffectiveMobileAbiAppUpdatePolicy,
  putMobileAbiAppUpdatePolicy,
} from '@/server/mobile-abi-update-policy';
import { assertPolicySyncAuthorized } from '@/server/mobile-update-policy';

export const Route = createFileRoute('/api/mobile/app-update-policy/abi')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const versionCode = Number.parseInt(
          url.searchParams.get('versionCode') ?? '0',
          10
        );
        const policy = await getEffectiveMobileAbiAppUpdatePolicy({
          channel:
            url.searchParams.get('channel')?.trim() || 'standard-release',
          currentVersionCode:
            Number.isFinite(versionCode) && versionCode >= 0 ? versionCode : 0,
          currentVersionName:
            url.searchParams.get('versionName')?.trim() || undefined,
          platform: url.searchParams.get('platform')?.trim() || 'android',
        });

        if (!policy) {
          return Response.json(
            {
              error: {
                code: 'app_update_policy_not_configured',
              },
              ok: false,
            },
            {
              headers: {
                'Cache-Control': 'no-store',
              },
              status: 503,
            }
          );
        }

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
          const policy = await putMobileAbiAppUpdatePolicy(payload);

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
