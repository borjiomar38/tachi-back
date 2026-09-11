import { createFileRoute } from '@tanstack/react-router';

import { buildPublicProductFacts } from '@/features/public/ai-discovery';
import { buildPublicAbsoluteUrl } from '@/features/public/head';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/product.json')({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          buildPublicProductFacts(
            buildPublicAbsoluteUrl,
            await getPublicTokenPacks()
          ),
          {
            headers: {
              'cache-control': 'public, max-age=60',
              'x-content-type-options': 'nosniff',
              'x-robots-tag': 'index, follow, max-snippet:-1',
            },
          }
        ),
    },
  },
});
