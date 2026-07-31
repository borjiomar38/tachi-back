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
        const imagePaths = resolvePublishedPosterPaths(params.slug);
        if (!imagePaths) {
          return notFound();
        }

        const image = await readFirstAvailableFile(imagePaths);

        if (image) {
          return new Response(image, {
            headers: publicPngHeaders(),
          });
        }

        return notFound();
      },
      HEAD: async ({ params }) => {
        const imagePaths = resolvePublishedPosterPaths(params.slug);
        if (!imagePaths) {
          return notFound();
        }

        try {
          await Promise.any(imagePaths.map((imagePath) => access(imagePath)));

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

function resolvePublishedPosterPaths(slug: string) {
  if (!safeSlugPattern.test(slug) || !getPublicManhwaSeriesBySlug(slug)) {
    return null;
  }

  const imagePaths = [
    path.resolve(privateManhwaRoot, slug, 'poster.png'),
    path.resolve(privateManhwaRoot, slug, 'chapter-001', 'panel-001.png'),
  ];

  if (
    imagePaths.some(
      (imagePath) => !imagePath.startsWith(`${privateManhwaRoot}${path.sep}`)
    )
  ) {
    return null;
  }

  return imagePaths;
}

async function readFirstAvailableFile(imagePaths: string[]) {
  const attempts = await Promise.allSettled(
    imagePaths.map((imagePath) => readFile(imagePath))
  );
  const successfulAttempt = attempts.find(
    (attempt) => attempt.status === 'fulfilled'
  );

  return successfulAttempt?.status === 'fulfilled'
    ? successfulAttempt.value
    : undefined;
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
