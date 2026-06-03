import { createFileRoute } from '@tanstack/react-router';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { auth } from '@/server/auth';

const privateManhwaRoot = path.resolve(process.cwd(), 'docs/manhwa/private');
const safeIdPattern = /^[a-z0-9-]+$/;

export const Route = createFileRoute(
  '/api/manhwa-private/$slug/character/$character/reference/$reference'
)({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!(await canReadPrivateManhwa(request))) {
          return notFound();
        }

        const imagePath = resolvePrivateReferencePath(params);
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

function resolvePrivateReferencePath(params: {
  character: string;
  reference: string;
  slug: string;
}) {
  if (
    !safeIdPattern.test(params.slug) ||
    !safeIdPattern.test(params.character) ||
    !safeIdPattern.test(params.reference)
  ) {
    return null;
  }

  const imagePath = path.resolve(
    privateManhwaRoot,
    params.slug,
    'characters',
    params.character,
    `${params.reference}.png`
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
