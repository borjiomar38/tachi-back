import { createFileRoute } from '@tanstack/react-router';

import { fallbackBlogArticleSummary } from '@/features/blog/fallback';
import { buildPublicAbsoluteUrl } from '@/features/public/head';
import {
  BlogSitemapEntry,
  getPublishedBlogSitemapEntries,
} from '@/server/blog/service';
import { logger } from '@/server/logger';

interface SitemapEntry {
  changeFrequency: 'daily' | 'monthly' | 'weekly' | 'yearly';
  lastModified: string;
  path: string;
  priority: string;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const blogEntries = await loadBlogSitemapEntries();
        const sitemap = buildSitemapXml(blogEntries);

        return new Response(sitemap, {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
          },
        });
      },
    },
  },
});

async function loadBlogSitemapEntries() {
  try {
    return await getPublishedBlogSitemapEntries();
  } catch (error) {
    logger.error({
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      scope: 'sitemap',
    });

    return [];
  }
}

function buildSitemapXml(blogEntries: BlogSitemapEntry[]) {
  const allBlogEntries = mergeBlogEntries([
    {
      lastModified: fallbackBlogArticleSummary.updatedAt,
      slug: fallbackBlogArticleSummary.slug,
    },
    ...blogEntries,
  ]);
  const latestBlogDate = allBlogEntries
    .map((entry) => toSitemapDate(entry.lastModified))
    .sort()
    .at(-1);
  const sitemapEntries = mergeSitemapEntries([
    ...buildStaticSitemapEntries(latestBlogDate ?? '2026-05-02'),
    ...allBlogEntries.map((entry) => ({
      changeFrequency: 'monthly' as const,
      lastModified: toSitemapDate(entry.lastModified),
      path: `/blog/${entry.slug}`,
      priority: '0.8',
    })),
  ]);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapEntries.map(formatSitemapEntry),
    '</urlset>',
  ].join('\n');
}

function buildStaticSitemapEntries(blogLastModified: string): SitemapEntry[] {
  return [
    {
      changeFrequency: 'weekly',
      lastModified: '2026-05-02',
      path: '/',
      priority: '1.0',
    },
    {
      changeFrequency: 'daily',
      lastModified: blogLastModified,
      path: '/blog',
      priority: '0.9',
    },
    {
      changeFrequency: 'monthly',
      lastModified: '2026-05-02',
      path: '/download',
      priority: '0.8',
    },
    {
      changeFrequency: 'weekly',
      lastModified: '2026-05-02',
      path: '/pricing',
      priority: '0.9',
    },
    {
      changeFrequency: 'monthly',
      lastModified: '2026-05-02',
      path: '/how-it-works',
      priority: '0.8',
    },
    {
      changeFrequency: 'monthly',
      lastModified: '2026-05-02',
      path: '/support',
      priority: '0.7',
    },
    {
      changeFrequency: 'monthly',
      lastModified: '2026-05-02',
      path: '/guides/mihon-tachiyomiat-setup',
      priority: '0.7',
    },
    {
      changeFrequency: 'monthly',
      lastModified: '2026-05-02',
      path: '/guides/translation-support-workflow',
      priority: '0.7',
    },
    {
      changeFrequency: 'yearly',
      lastModified: '2026-05-02',
      path: '/legal/privacy',
      priority: '0.3',
    },
    {
      changeFrequency: 'yearly',
      lastModified: '2026-05-02',
      path: '/legal/terms',
      priority: '0.3',
    },
    {
      changeFrequency: 'yearly',
      lastModified: '2026-05-02',
      path: '/legal/official-sources-takedown',
      priority: '0.4',
    },
  ];
}

function mergeBlogEntries(entries: BlogSitemapEntry[]) {
  return entries.filter((entry, index, list) => {
    return list.findIndex((item) => item.slug === entry.slug) === index;
  });
}

function mergeSitemapEntries(entries: SitemapEntry[]) {
  return entries.filter((entry, index, list) => {
    return list.findIndex((item) => item.path === entry.path) === index;
  });
}

function formatSitemapEntry(entry: SitemapEntry) {
  return [
    '  <url>',
    `    <loc>${escapeXml(buildPublicAbsoluteUrl(entry.path))}</loc>`,
    `    <lastmod>${escapeXml(entry.lastModified)}</lastmod>`,
    `    <changefreq>${entry.changeFrequency}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function toSitemapDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
