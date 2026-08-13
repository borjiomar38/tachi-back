import { createFileRoute } from '@tanstack/react-router';

import { createLegacyMobileUpdateDownloadResponse } from '@/server/services/android-apk-download';

export const Route = createFileRoute('/api/download/tachiyomiat-latest.apk')({
  server: {
    handlers: {
      GET: createLegacyMobileUpdateDownloadResponse,
    },
  },
});
