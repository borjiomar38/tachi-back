import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import { getClientIp } from '@/server/licenses/utils';
import { zMobileHeartbeatInput } from '@/server/mobile-auth/schema';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
  recordMobileHeartbeat,
} from '@/server/mobile-auth/session';

export const Route = createFileRoute('/api/mobile/heartbeat')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const platform = url.searchParams.get('platform') ?? 'android';
        const channel = url.searchParams.get('channel') ?? 'unknown';
        const currentVersionCode = Number.parseInt(
          url.searchParams.get('versionCode') ?? '0',
          10
        );
        const latestVersionCode = envServer.MOBILE_ANDROID_LATEST_VERSION_CODE;
        const minimumSupportedVersionCode =
          envServer.MOBILE_ANDROID_MIN_VERSION_CODE;
        const updateUrl =
          envServer.MOBILE_ANDROID_UPDATE_URL ??
          envServer.MOBILE_ANDROID_RELEASE_URL ??
          'https://github.com/mannu691/TachiyomiAT/releases';
        const releaseUrl =
          envServer.MOBILE_ANDROID_RELEASE_URL ??
          'https://github.com/mannu691/TachiyomiAT/releases';

        return Response.json({
          data: {
            channel,
            checkedAt: new Date().toISOString(),
            currentVersionCode: Number.isFinite(currentVersionCode)
              ? currentVersionCode
              : 0,
            forceUpdate: minimumSupportedVersionCode > 0,
            latestVersionCode,
            latestVersionName:
              envServer.MOBILE_ANDROID_LATEST_VERSION_NAME ?? null,
            message:
              envServer.MOBILE_ANDROID_UPDATE_MESSAGE ??
              'This version is no longer supported. Update to continue.',
            minimumSupportedVersionCode,
            platform,
            releaseUrl,
            requiresUpdate:
              minimumSupportedVersionCode > 0 &&
              Number.isFinite(currentVersionCode) &&
              currentVersionCode < minimumSupportedVersionCode,
            updateUrl,
          },
          ok: true,
        });
      },
      POST: async ({ request }) => {
        let payload: unknown;

        try {
          payload = await request.json();
        } catch {
          return Response.json(
            {
              error: {
                code: 'invalid_request',
              },
              ok: false,
            },
            { status: 400 }
          );
        }

        const parsedInput = zMobileHeartbeatInput.safeParse(payload);

        if (!parsedInput.success) {
          return Response.json(
            {
              error: {
                code: 'invalid_request',
                details: parsedInput.error.flatten(),
              },
              ok: false,
            },
            { status: 400 }
          );
        }

        try {
          const auth = await authenticateMobileAccessToken(request);
          const heartbeat = await recordMobileHeartbeat(
            auth,
            parsedInput.data,
            {
              clientIp: getClientIp(request),
              userAgent: request.headers.get('user-agent'),
            }
          );

          return Response.json({
            data: heartbeat,
            ok: true,
          });
        } catch (error) {
          if (error instanceof MobileAuthError) {
            return Response.json(
              {
                error: {
                  code: error.code,
                },
                ok: false,
              },
              { status: error.statusCode }
            );
          }

          throw error;
        }
      },
    },
  },
});
