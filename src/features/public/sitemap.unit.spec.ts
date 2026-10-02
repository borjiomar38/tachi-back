import { describe, expect, it } from 'vitest';

import { latestPublicAppUpdate } from '@/features/public/latest-app-update';
import { buildSitemapXml } from '@/routes/sitemap[.]xml';

describe('public sitemap', () => {
  it('uses the visible app update date for the download page', () => {
    const sitemap = buildSitemapXml(
      [],
      (path) => `https://tachiyomiat.com${path}`
    );

    expect(sitemap).toContain(
      [
        '    <loc>https://tachiyomiat.com/download</loc>',
        `    <lastmod>${latestPublicAppUpdate.publishedDate}</lastmod>`,
      ].join('\n')
    );
  });
});
