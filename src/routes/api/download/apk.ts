import { presignGetObject } from '@better-upload/server/helpers';
import { createFileRoute } from '@tanstack/react-router';

import { androidApkDownload } from '@/features/public/download-assets';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

export const Route = createFileRoute('/api/download/apk')({
  server: {
    handlers: {
      GET: async () => {
        const url = await presignGetObject(uploadClient, {
          bucket: objectStorageBuckets.legacyPublic,
          expiresIn: 60 * 10,
          key: androidApkDownload.objectKey,
        });

        return Response.redirect(url, 302);
      },
    },
  },
});
