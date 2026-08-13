import { createFileRoute } from '@tanstack/react-router';

import { createVersionedAndroidAbiApkDownloadResponse } from '@/server/services/android-apk-download';

export const Route = createFileRoute(
  '/api/download/android/$version/$filename'
)({
  server: {
    handlers: {
      GET: async ({ params }) =>
        createVersionedAndroidAbiApkDownloadResponse(params),
    },
  },
});
