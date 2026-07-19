import { createFileRoute } from '@tanstack/react-router';

import { createAndroidApkDownloadResponse } from '@/server/services/android-apk-download';

export const Route = createFileRoute('/api/download/tachiyomiat-latest.apk')({
  server: {
    handlers: {
      GET: createAndroidApkDownloadResponse,
    },
  },
});
