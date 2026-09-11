import { createFileRoute } from '@tanstack/react-router';

import { buildLlmsFullTxt } from '@/features/public/ai-discovery';
import { buildPublicAbsoluteUrl } from '@/features/public/head';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          buildLlmsFullTxt(buildPublicAbsoluteUrl, await getPublicTokenPacks()),
          {
            headers: {
              'cache-control': 'public, max-age=60',
              'content-type': 'text/plain; charset=utf-8',
              'x-content-type-options': 'nosniff',
              'x-robots-tag': 'index, follow, max-snippet:-1',
            },
          }
        ),
    },
  },
});
