import { createFileRoute } from '@tanstack/react-router';

import { fallbackBlogArticleSummary } from '@/features/blog/fallback';
import { getManhwaSitemapEntries } from '@/features/manhwa/data';
import { buildPublicAbsoluteUrlFromRequest } from '@/features/public/head';
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

const routeModules = import.meta.glob(
  [
    './*.tsx',
    './blog/**/*.tsx',
    './guides/**/*.tsx',
    './legal/**/*.tsx',
    './manhwa/**/*.tsx',
  ],
  {
    eager: true,
    import: 'default',
    query: '?raw',
  }
);
const defaultStaticSitemapEntry = {
  changeFrequency: 'monthly',
  lastModified: '2026-05-04',
  priority: '0.7',
} satisfies Omit<SitemapEntry, 'path'>;
const staticSitemapEntryOverrides: Record<
  string,
  Partial<Omit<SitemapEntry, 'path'>>
> = {
  '/': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '1.0',
  },
  '/blog': {
    changeFrequency: 'daily',
    priority: '0.9',
  },
  '/download': {
    lastModified: '2026-05-31',
    priority: '0.8',
  },
  '/manhwa': {
    changeFrequency: 'daily',
    lastModified: '2026-06-02',
    priority: '0.9',
  },
  '/translate-manhwa-ai': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.9',
  },
  '/pricing': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.9',
  },
  '/how-it-works': {
    lastModified: '2026-05-31',
    priority: '0.8',
  },
  '/guides/translation-support-workflow': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.8',
  },
  '/support': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.8',
  },
  '/media-kit': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-29',
    priority: '0.8',
  },
  '/guides/mihon-nayovi-setup': {
    lastModified: '2026-05-31',
    priority: '0.8',
  },
  '/guides/mihon-tachiyomiat-setup': {
    lastModified: '2026-05-31',
    priority: '0.8',
  },
  '/guides/permission-safe-manga-translation-pilot': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.85',
  },
  '/guides/comic-ocr-translation-checklist': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.85',
  },
  '/guides/best-android-manga-translator-apk': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.85',
  },
  '/guides/test-ai-manhwa-translation-approved-samples': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.85',
  },
  '/guides/free-trial-vs-paid-token-plan': {
    changeFrequency: 'weekly',
    lastModified: '2026-05-31',
    priority: '0.85',
  },
  '/guides/manhwa-ocr-glossary-checklist': {
    lastModified: '2026-05-28',
    priority: '0.8',
  },
  '/legal/privacy': {
    changeFrequency: 'yearly',
    priority: '0.3',
  },
  '/legal/terms': {
    changeFrequency: 'yearly',
    priority: '0.3',
  },
  '/legal/official-sources-takedown': {
    changeFrequency: 'yearly',
    priority: '0.4',
  },
};
const staticSitemapPathOrder = [
  '/',
  '/blog',
  '/download',
  '/manhwa',
  '/translate-manhwa-ai',
  '/pricing',
  '/how-it-works',
  '/support',
  '/media-kit',
  '/guides/mihon-nayovi-setup',
  '/guides/mihon-tachiyomiat-setup',
  '/guides/translation-support-workflow',
  '/guides/comic-ocr-translation-checklist',
  '/guides/permission-safe-manga-translation-pilot',
  '/guides/best-android-manga-translator-apk',
  '/guides/test-ai-manhwa-translation-approved-samples',
  '/guides/free-trial-vs-paid-token-plan',
  '/legal/privacy',
  '/legal/terms',
  '/legal/official-sources-takedown',
];
const excludedStaticSitemapPaths = new Set([
  '/llms.txt',
  '/robots.txt',
  '/sitemap.xml',
]);
const excludedStaticSitemapPrefixes = [
  '/api',
  '/app',
  '/checkout',
  '/login',
  '/logout',
  '/manager',
];

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blogEntries = await loadBlogSitemapEntries();
        const sitemap = buildSitemapXml(blogEntries, (path) =>
          buildPublicAbsoluteUrlFromRequest(request, path)
        );

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

function buildSitemapXml(
  blogEntries: BlogSitemapEntry[],
  buildAbsoluteUrl: (path: string) => string
) {
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
    ...buildStaticSitemapEntries(latestBlogDate ?? '2026-05-04'),
    ...getManhwaSitemapEntries().map((entry) => ({
      changeFrequency: 'weekly' as const,
      lastModified: toSitemapDate(entry.lastModified),
      path: entry.path,
      priority: entry.path.includes('/chapter/') ? '0.75' : '0.85',
    })),
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
    ...sitemapEntries.map((entry) =>
      formatSitemapEntry(entry, buildAbsoluteUrl)
    ),
    '</urlset>',
  ].join('\n');
}

function buildStaticSitemapEntries(blogLastModified: string): SitemapEntry[] {
  return Object.keys(routeModules)
    .map(routeFilePathToStaticSitemapPath)
    .filter((path): path is string => Boolean(path))
    .map((path) => buildStaticSitemapEntry(path, blogLastModified))
    .filter((entry, index, list) => {
      return list.findIndex((item) => item.path === entry.path) === index;
    })
    .sort(compareStaticSitemapEntries);
}

function routeFilePathToStaticSitemapPath(filePath: string) {
  if (isNonRouteFilePath(filePath)) {
    return null;
  }

  const routeSegments = filePath
    .replace(/^\.\//, '')
    .replace(/\.(tsx|ts)$/, '')
    .split('/')
    .flatMap(routeFileSegmentToPathSegments);
  const path = routeSegments.length === 0 ? '/' : `/${routeSegments.join('/')}`;

  if (!isStaticPublicSitemapPath(path)) {
    return null;
  }

  return path;
}

function isNonRouteFilePath(filePath: string) {
  return (
    filePath === './__root.tsx' ||
    /(?:^|\/)-/.test(filePath) ||
    /\.(spec|test)\./.test(filePath) ||
    filePath.includes('.unit.')
  );
}

function routeFileSegmentToPathSegments(segment: string) {
  const normalizedSegment = segment.replace(/\[\.\]/g, '.');

  if (normalizedSegment === 'index' || normalizedSegment === 'route') {
    return [];
  }

  if (normalizedSegment.endsWith('.index')) {
    return [normalizedSegment.slice(0, -'.index'.length)];
  }

  return [normalizedSegment];
}

function isStaticPublicSitemapPath(path: string) {
  if (path.includes('$') || excludedStaticSitemapPaths.has(path)) {
    return false;
  }

  return !excludedStaticSitemapPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function buildStaticSitemapEntry(
  path: string,
  blogLastModified: string
): SitemapEntry {
  const overrides = staticSitemapEntryOverrides[path] ?? {};
  const lastModified =
    path === '/blog' ? blogLastModified : overrides.lastModified;

  return {
    ...defaultStaticSitemapEntry,
    ...overrides,
    lastModified: lastModified ?? defaultStaticSitemapEntry.lastModified,
    path,
  };
}

function compareStaticSitemapEntries(left: SitemapEntry, right: SitemapEntry) {
  const leftIndex = staticSitemapPathOrder.indexOf(left.path);
  const rightIndex = staticSitemapPathOrder.indexOf(right.path);
  const normalizedLeftIndex =
    leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const normalizedRightIndex =
    rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

  if (normalizedLeftIndex !== normalizedRightIndex) {
    return normalizedLeftIndex - normalizedRightIndex;
  }

  return left.path.localeCompare(right.path);
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

function formatSitemapEntry(
  entry: SitemapEntry,
  buildAbsoluteUrl: (path: string) => string
) {
  return [
    '  <url>',
    `    <loc>${escapeXml(buildAbsoluteUrl(entry.path))}</loc>`,
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
