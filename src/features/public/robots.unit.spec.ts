import { describe, expect, it } from 'vitest';

import { buildPublicRobotsTxt } from '@/features/public/robots';

describe('buildPublicRobotsTxt', () => {
  const robotsTxt = buildPublicRobotsTxt(
    (path) => `https://tachiyomiat.com${path}`
  );

  it('allows only the public image routes beneath the blocked API prefix', () => {
    expect(robotsTxt).toContain('Allow: /api/blog/heroes/');
    expect(robotsTxt).toContain('Allow: /api/manhwa/*/poster');
    expect(robotsTxt).toContain(
      'Allow: /api/manhwa/*/chapter/*/panel/'
    );
    expect(robotsTxt).toContain('Disallow: /api/');
    expect(robotsTxt).not.toContain('Allow: /api/manhwa-private/');
  });

  it('keeps private application areas blocked and publishes discovery files', () => {
    expect(robotsTxt).toContain('Disallow: /app/');
    expect(robotsTxt).toContain('Disallow: /manager/');
    expect(robotsTxt).toContain(
      'Sitemap: https://tachiyomiat.com/sitemap.xml'
    );
    expect(robotsTxt).toContain('# https://tachiyomiat.com/llms.txt');
  });
});
