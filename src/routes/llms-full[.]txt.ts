import { createFileRoute } from '@tanstack/react-router';

import { buildLlmsFullTxt } from '@/features/public/ai-discovery';
import { buildPublicAbsoluteUrl } from '@/features/public/head';

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildLlmsFullTxt(buildPublicAbsoluteUrl), {
          headers: {
            'cache-control':
              'public, max-age=3600, stale-while-revalidate=86400',
            'content-type': 'text/plain; charset=utf-8',
            'x-content-type-options': 'nosniff',
            'x-robots-tag': 'index, follow, max-snippet:-1',
          },
        }),
    },
  },
});
