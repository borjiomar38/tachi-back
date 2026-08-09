import { createFileRoute } from '@tanstack/react-router';

import { buildPublicAbsoluteUrl } from '@/features/public/head';
import { buildPublicRobotsTxt } from '@/features/public/robots';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildPublicRobotsTxt(buildPublicAbsoluteUrl), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
        }),
    },
  },
});
