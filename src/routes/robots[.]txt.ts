import { createFileRoute } from '@tanstack/react-router';

import { buildPublicAbsoluteUrlFromRequest } from '@/features/public/head';

const disallowedPaths = [
  '/api/',
  '/app/',
  '/checkout/',
  '/login/',
  '/logout',
  '/manager/',
];

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(
          buildRobotsTxt((path) =>
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

function buildRobotsTxt(buildAbsoluteUrl: (path: string) => string) {
  return [
    'User-agent: *',
    'Allow: /',
    ...disallowedPaths.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${buildAbsoluteUrl('/sitemap.xml')}`,
    '',
    '# LLM-friendly site summary:',
    `# ${buildAbsoluteUrl('/llms.txt')}`,
    '',
  ].join('\n');
}
