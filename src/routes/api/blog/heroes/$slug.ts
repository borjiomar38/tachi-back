import { presignGetObject } from '@better-upload/server/helpers';
import { createFileRoute } from '@tanstack/react-router';

import { objectStorageBuckets, uploadClient } from '@/server/s3';

export const Route = createFileRoute('/api/blog/heroes/$slug')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = await presignGetObject(uploadClient, {
          bucket: objectStorageBuckets.legacyPublic,
          expiresIn: 60 * 10,
          key: `blog/heroes/${params.slug}.png`,
        });

        return Response.redirect(url, 302);
      },
    },
  },
});
