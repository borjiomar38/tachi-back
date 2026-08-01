import { presignGetObject } from '@better-upload/server/helpers';
import { createFileRoute } from '@tanstack/react-router';

import {
  BLOG_HERO_PRESIGNED_URL_TTL_SECONDS,
  createPublicImageRedirectResponse,
} from '@/features/public/cache-policy';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

export const Route = createFileRoute('/api/blog/heroes/$slug')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = await presignGetObject(uploadClient, {
          bucket: objectStorageBuckets.legacyPublic,
          expiresIn: BLOG_HERO_PRESIGNED_URL_TTL_SECONDS,
          key: `blog/heroes/${params.slug}.png`,
        });

        return createPublicImageRedirectResponse(url);
      },
    },
  },
});
