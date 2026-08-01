import { createFileRoute } from '@tanstack/react-router';

import {
  type BlogHeroImageVariant,
  isBlogHeroImageVariant,
  isSafeBlogHeroImageSlug,
} from '@/features/blog/image-variants';
import {
  getOrCreateBlogHeroImageVariant,
  hasBlogHeroImageSource,
} from '@/server/blog/image-variants';
import { logger } from '@/server/logger';

export const Route = createFileRoute('/media/blog/heroes/v3/$slug/$')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const variant = parseVariant(params._splat);

        if (!isSafeBlogHeroImageSlug(params.slug) || !variant) {
          return notFound();
        }

        try {
          const image = await getOrCreateBlogHeroImageVariant({
            slug: params.slug,
            variant,
          });

          return new Response(image.body, {
            headers: publicWebpHeaders(),
          });
        } catch (error) {
          logger.warn({
            errorMessage:
              error instanceof Error ? error.message : 'Unknown image error',
            scope: 'blog-hero-variant',
            slug: params.slug,
            variant,
          });

          return originalImageFallback(request, params.slug);
        }
      },
      HEAD: async ({ params }) => {
        const variant = parseVariant(params._splat);

        if (!isSafeBlogHeroImageSlug(params.slug) || !variant) {
          return notFound();
        }

        const sourceExists = await hasBlogHeroImageSource({
          slug: params.slug,
        });

        if (!sourceExists) {
          return notFound();
        }

        return new Response(null, {
          headers: publicWebpHeaders(),
        });
      },
    },
  },
});

function parseVariant(value: string | undefined): BlogHeroImageVariant | null {
  const match = /^(?<variant>[a-z-]+)\.webp$/.exec(value ?? '');
  const variant = match?.groups?.variant;

  return variant && isBlogHeroImageVariant(variant) ? variant : null;
}

function publicWebpHeaders() {
  return {
    'cache-control': 'public, max-age=31536000, immutable',
    'content-type': 'image/webp',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'index, follow',
  };
}

function originalImageFallback(request: Request, slug: string) {
  const location = new URL(
    `/api/blog/heroes/${encodeURIComponent(slug)}`,
    request.url
  );

  return new Response(null, {
    headers: {
      'cache-control': 'no-store',
      location: location.toString(),
      'x-robots-tag': 'index, follow',
    },
    status: 302,
  });
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
