import { createFileRoute } from '@tanstack/react-router';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { envServer } from '@/env/server';
import {
  getManhwaChapter,
  getPublicManhwaSeriesBySlug,
} from '@/features/manhwa/data';

const privateManhwaRoot = path.resolve(
  envServer.MANHWA_PRIVATE_ROOT ??
    path.join(process.cwd(), 'docs/manhwa/private')
);
const safeSlugPattern = /^[a-z0-9-]+$/;

export const Route = createFileRoute(
  '/api/manhwa/$slug/chapter/$chapter/panel/$panel'
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const imagePath = resolvePublishedPanelPath(params);
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
        const imagePath = resolvePublishedPanelPath(params);
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

function resolvePublishedPanelPath(params: {
  chapter: string;
  panel: string;
  slug: string;
}) {
  if (!safeSlugPattern.test(params.slug)) {
    return null;
  }

  const chapterNumber = Number.parseInt(params.chapter, 10);
  const panelNumber = Number.parseInt(params.panel, 10);
  if (
    !Number.isSafeInteger(chapterNumber) ||
    chapterNumber < 1 ||
    !Number.isSafeInteger(panelNumber) ||
    panelNumber < 1
  ) {
    return null;
  }

  const series = getPublicManhwaSeriesBySlug(params.slug);
  const chapter = series
    ? getManhwaChapter(series, chapterNumber, { includePrivate: false })
    : undefined;

  if (!chapter || panelNumber > chapter.panels.length) {
    return null;
  }

  const imagePath = path.resolve(
    privateManhwaRoot,
    params.slug,
    `chapter-${String(chapterNumber).padStart(3, '0')}`,
    `panel-${String(panelNumber).padStart(3, '0')}.png`
  );

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
