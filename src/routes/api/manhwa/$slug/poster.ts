import { createFileRoute } from '@tanstack/react-router';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { envServer } from '@/env/server';
import { getPublicManhwaSeriesBySlug } from '@/features/manhwa/data';

const privateManhwaRoot = path.resolve(
  envServer.MANHWA_PRIVATE_ROOT ??
    path.join(process.cwd(), 'docs/manhwa/private')
);
const safeSlugPattern = /^[a-z0-9-]+$/;

export const Route = createFileRoute('/api/manhwa/$slug/poster')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const imagePath = resolvePublishedPosterPath(params.slug);
        if (!imagePath) {
          return notFound();
        }

        try {
          const image = await readFile(imagePath);

          return new Response(image, {
            headers: publicPngHeaders(),
          });
        } catch {
          return notFound();
        }
      },
      HEAD: async ({ params }) => {
        const imagePath = resolvePublishedPosterPath(params.slug);
        if (!imagePath) {
          return notFound();
        }

        try {
          await access(imagePath);

          return new Response(null, {
            headers: publicPngHeaders(),
          });
        } catch {
          return notFound();
        }
      },
    },
  },
});

function publicPngHeaders() {
  return {
    'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    'content-type': 'image/png',
    'x-robots-tag': 'index, follow',
  };
}

function resolvePublishedPosterPath(slug: string) {
  if (!safeSlugPattern.test(slug) || !getPublicManhwaSeriesBySlug(slug)) {
    return null;
  }

  const imagePath = path.resolve(privateManhwaRoot, slug, 'poster.png');

  if (!imagePath.startsWith(`${privateManhwaRoot}${path.sep}`)) {
    return null;
  }

  return imagePath;
}

function notFound() {
  return new Response('Not found', {
    headers: {
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
    status: 404,
  });
}
