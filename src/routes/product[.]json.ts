import { createFileRoute } from '@tanstack/react-router';

import { buildPublicProductFacts } from '@/features/public/ai-discovery';
import { buildPublicAbsoluteUrl } from '@/features/public/head';

export const Route = createFileRoute('/product.json')({
  server: {
    handlers: {
      GET: () =>
        Response.json(buildPublicProductFacts(buildPublicAbsoluteUrl), {
          headers: {
            'cache-control':
              'public, max-age=3600, stale-while-revalidate=86400',
            'x-content-type-options': 'nosniff',
            'x-robots-tag': 'index, follow, max-snippet:-1',
          },
        }),
    },
  },
});
