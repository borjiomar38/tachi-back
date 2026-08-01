import { createFileRoute } from '@tanstack/react-router';

import { buildPublicAbsoluteUrlFromRequest } from '@/features/public/head';
import { buildPublicRobotsTxt } from '@/features/public/robots';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(
          buildPublicRobotsTxt((path) =>
            buildPublicAbsoluteUrlFromRequest(request, path)
          ),
          {
            headers: {
              'content-type': 'text/plain; charset=utf-8',
            },
          }
        ),
    },
  },
});
