import { createFileRoute } from '@tanstack/react-router';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { auth } from '@/server/auth';

const privateManhwaRoot = path.resolve(process.cwd(), 'docs/manhwa/private');
const safeSlugPattern = /^[a-z0-9-]+$/;

export const Route = createFileRoute(
  '/api/manhwa-private/$slug/chapter/$chapter/panel/$panel'
)({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!(await canReadPrivateManhwa(request))) {
          return notFound();
        }

        const imagePath = resolvePrivatePanelPath(params);
        if (!imagePath) {
          return notFound();
        }

        try {
          const image = await readFile(imagePath);

          return new Response(image, {
            headers: {
              'cache-control': 'private, no-store',
              'content-type': 'image/png',
              'x-robots-tag': 'noindex, nofollow',
            },
          });
        } catch {
          return notFound();
        }
      },
    },
  },
});

async function canReadPrivateManhwa(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return session?.user.role === 'admin';
}

function resolvePrivatePanelPath(params: {
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
