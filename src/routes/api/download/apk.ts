import { createFileRoute } from '@tanstack/react-router';

import { createWebsiteAndroidApkDownloadResponse } from '@/server/services/android-apk-download';

export const Route = createFileRoute('/api/download/apk')({
  server: {
    handlers: {
      GET: createWebsiteAndroidApkDownloadResponse,
    },
  },
});
