const allowedPublicMediaPaths = [
  '/api/blog/heroes/',
  '/api/manhwa/*/poster',
  '/api/manhwa/*/chapter/*/panel/',
] as const;

const disallowedPrivatePaths = [
  '/api/',
  '/app/',
  '/checkout/',
  '/login/',
  '/logout',
  '/manager/',
] as const;

export const buildPublicRobotsTxt = (
  buildAbsoluteUrl: (path: string) => string
) =>
  [
    'User-agent: *',
    'Allow: /',
    ...allowedPublicMediaPaths.map((path) => `Allow: ${path}`),
    ...disallowedPrivatePaths.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${buildAbsoluteUrl('/sitemap.xml')}`,
    '',
    '# Public product context for assistants and other machine clients:',
    `# ${buildAbsoluteUrl('/llms.txt')}`,
    `# ${buildAbsoluteUrl('/llms-full.txt')}`,
    `# ${buildAbsoluteUrl('/product.json')}`,
    '',
  ].join('\n');
