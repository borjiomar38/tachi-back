import { createFileRoute } from '@tanstack/react-router';

import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
} from '@/server/http/route-utils';
import {
  authenticateMobileAccessToken,
  MobileAuthError,
} from '@/server/mobile-auth/session';
import { getEffectiveOcrUploadCompressionPolicy } from '@/server/ocr-upload-compression/service';

export const Route = createFileRoute('/api/mobile/jobs/upload-policy')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestContext = buildHttpRequestContext(request);

        try {
          const auth = await authenticateMobileAccessToken(request);
          const policy = await getEffectiveOcrUploadCompressionPolicy({
            installationId: auth.device.installationId,
          });

          return buildApiOkResponse(policy, {
            headers: {
              'Cache-Control': 'no-store',
              Vary: 'Authorization',
            },
            requestId: requestContext.requestId,
          });
        } catch (error) {
          if (error instanceof MobileAuthError) {
            return buildApiErrorResponse({
              code: error.code,
              requestId: requestContext.requestId,
              status: error.statusCode,
            });
          }

          throw error;
        }
      },
    },
  },
});
