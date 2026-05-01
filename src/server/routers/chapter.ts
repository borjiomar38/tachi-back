import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import {
  zBackofficeTranslatedChapterDetail,
  zBackofficeTranslatedChapterListInput,
  zBackofficeTranslatedChapterListResponse,
} from '@/server/jobs/backoffice-schema';
import { zTranslationChapterIdentity } from '@/server/jobs/schema';
import { protectedProcedure } from '@/server/orpc';
import {
  cleanProviderTranslationText,
  shouldDropProviderTranslationBlock,
} from '@/server/provider-gateway/translation-cleanup';

const tags = ['chapters'];
const MAX_CACHE_ROWS_TO_SCAN = 5000;
const PAGE_PREVIEW_LIMIT = 100;

type CacheRow = {
  cacheKey: string;
  chapterCacheKey: string | null;
  chapterIdentity: unknown;
  createdAt: Date;
  hitCount: number;
  pageCount: number;
  resultManifest: unknown;
  resultPayloadVersion: string;
  sourceLanguage: string;
  targetLanguage: string;
  updatedAt: Date;
};

type ChapterGroup = {
  cacheHitCount: number;
  cachedTranslationCount: number;
  chapterCacheKey: string;
  completedJobCount: number;
  firstCachedAt: Date;
  identity: ChapterIdentity | null;
  lastCachedAt: Date;
  latestJobAt: Date | null;
  pageCount: number;
  sourceLanguages: Set<string>;
  targetLanguages: Set<string>;
  totalJobCount: number;
};

type ChapterIdentity = {
  chapterName: string | null;
  chapterUrl: string;
  mangaTitle: string | null;
  mangaUrl: string | null;
  sourceId: string | null;
  sourceName: string | null;
};

export default {
  list: protectedProcedure({
    permissions: {
      job: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/chapters',
      tags,
    })
    .input(zBackofficeTranslatedChapterListInput)
    .output(zBackofficeTranslatedChapterListResponse)
    .handler(async ({ context, input }) => {
      const searchTerm = input.searchTerm.trim().toLowerCase();
      const cacheRows = await context.db.translationResultCache.findMany({
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          cacheKey: true,
          chapterCacheKey: true,
          chapterIdentity: true,
          createdAt: true,
          hitCount: true,
          pageCount: true,
          resultManifest: true,
          resultPayloadVersion: true,
          sourceLanguage: true,
          targetLanguage: true,
          updatedAt: true,
        },
        take: MAX_CACHE_ROWS_TO_SCAN,
        where: {
          chapterCacheKey: {
            not: null,
          },
        },
      });

      const groups = groupCacheRows(cacheRows);
      const filteredGroups = groups.filter((group) =>
        matchesSearch(group, searchTerm)
      );
      const visibleGroups = filteredGroups.slice(0, input.limit);
      const jobStats = await getJobStatsForChapterKeys(
        context.db,
        visibleGroups.map((group) => group.chapterCacheKey)
      );

      return {
        items: visibleGroups.map((group) => {
          const stats = jobStats.get(group.chapterCacheKey);

          return {
            cacheHitCount: group.cacheHitCount,
            cachedTranslationCount: group.cachedTranslationCount,
            chapterCacheKey: group.chapterCacheKey,
            completedJobCount: stats?.completedJobCount ?? 0,
            firstCachedAt: group.firstCachedAt,
            identity: group.identity,
            lastCachedAt: group.lastCachedAt,
            latestJobAt: stats?.latestJobAt ?? null,
            pageCount: group.pageCount,
            sourceLanguages: Array.from(group.sourceLanguages).sort(),
            targetLanguages: Array.from(group.targetLanguages).sort(),
            totalJobCount: stats?.totalJobCount ?? 0,
          };
        }),
        scannedCacheRows: cacheRows.length,
        total: filteredGroups.length,
      };
    }),

  getByCacheKey: protectedProcedure({
    permissions: {
      job: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/chapters/{chapterCacheKey}',
      tags,
    })
    .input(z.object({ chapterCacheKey: z.string().trim().min(1) }))
    .output(zBackofficeTranslatedChapterDetail)
    .handler(async ({ context, input }) => {
      const cacheEntries = await context.db.translationResultCache.findMany({
        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            targetLanguage: 'asc',
          },
        ],
        select: {
          cacheKey: true,
          chapterCacheKey: true,
          chapterIdentity: true,
          createdAt: true,
          hitCount: true,
          pageCount: true,
          resultManifest: true,
          resultPayloadVersion: true,
          sourceLanguage: true,
          targetLanguage: true,
          updatedAt: true,
        },
        where: {
          chapterCacheKey: input.chapterCacheKey,
        },
      });

      if (!cacheEntries.length) {
        throw new ORPCError('NOT_FOUND');
      }

      const [jobs, jobRowsForStats] = await Promise.all([
        context.db.translationJob.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            completedAt: true,
            createdAt: true,
            device: {
              select: {
                installationId: true,
              },
            },
            id: true,
            license: {
              select: {
                key: true,
              },
            },
            pageCount: true,
            sourceLanguage: true,
            status: true,
            targetLanguage: true,
          },
          take: 50,
          where: {
            chapterCacheKey: input.chapterCacheKey,
          },
        }),
        context.db.translationJob.findMany({
          select: {
            status: true,
          },
          where: {
            chapterCacheKey: input.chapterCacheKey,
          },
        }),
      ]);
      const latestManifest =
        cacheEntries.find((entry) => entry.resultManifest)?.resultManifest ??
        null;
      const identity =
        cacheEntries
          .map((entry) => normalizeChapterIdentity(entry.chapterIdentity))
          .find((entry) => entry) ?? null;
      const completedJobCount = jobRowsForStats.filter(
        (job) => job.status === 'completed'
      ).length;

      return {
        cacheEntries: cacheEntries.map((entry) => ({
          cacheHitCount: entry.hitCount,
          cacheKey: entry.cacheKey,
          createdAt: entry.createdAt,
          pageCount: entry.pageCount,
          resultManifest: entry.resultManifest,
          resultPayloadVersion: entry.resultPayloadVersion,
          sourceLanguage: entry.sourceLanguage,
          targetLanguage: entry.targetLanguage,
          updatedAt: entry.updatedAt,
        })),
        chapterCacheKey: input.chapterCacheKey,
        identity,
        jobs: jobs.map((job) => ({
          completedAt: job.completedAt,
          createdAt: job.createdAt,
          id: job.id,
          installationId: job.device.installationId,
          licenseKey: job.license.key,
          pageCount: job.pageCount,
          sourceLanguage: job.sourceLanguage,
          status: job.status,
          targetLanguage: job.targetLanguage,
        })),
        latestManifest,
        pagePreviews: buildPagePreviews(latestManifest),
        stats: {
          cacheHitCount: cacheEntries.reduce(
            (sum, entry) => sum + entry.hitCount,
            0
          ),
          cachedTranslationCount: cacheEntries.length,
          completedJobCount,
          pageCount: Math.max(...cacheEntries.map((entry) => entry.pageCount)),
          sourceLanguages: uniqueSorted(
            cacheEntries.map((entry) => entry.sourceLanguage)
          ),
          targetLanguages: uniqueSorted(
            cacheEntries.map((entry) => entry.targetLanguage)
          ),
          totalJobCount: jobRowsForStats.length,
        },
      };
    }),
};

function groupCacheRows(cacheRows: CacheRow[]) {
  const groups = new Map<string, ChapterGroup>();

  for (const row of cacheRows) {
    if (!row.chapterCacheKey) {
      continue;
    }

    const current = groups.get(row.chapterCacheKey);
    if (!current) {
      groups.set(row.chapterCacheKey, {
        cacheHitCount: row.hitCount,
        cachedTranslationCount: 1,
        chapterCacheKey: row.chapterCacheKey,
        completedJobCount: 0,
        firstCachedAt: row.createdAt,
        identity: normalizeChapterIdentity(row.chapterIdentity),
        lastCachedAt: row.updatedAt,
        latestJobAt: null,
        pageCount: row.pageCount,
        sourceLanguages: new Set([row.sourceLanguage]),
        targetLanguages: new Set([row.targetLanguage]),
        totalJobCount: 0,
      });
      continue;
    }

    current.cacheHitCount += row.hitCount;
    current.cachedTranslationCount += 1;
    current.firstCachedAt =
      row.createdAt < current.firstCachedAt
        ? row.createdAt
        : current.firstCachedAt;
    current.lastCachedAt =
      row.updatedAt > current.lastCachedAt
        ? row.updatedAt
        : current.lastCachedAt;
    current.pageCount = Math.max(current.pageCount, row.pageCount);
    current.sourceLanguages.add(row.sourceLanguage);
    current.targetLanguages.add(row.targetLanguage);

    if (!current.identity) {
      current.identity = normalizeChapterIdentity(row.chapterIdentity);
    }
  }

  return Array.from(groups.values()).sort(
    (left, right) => right.lastCachedAt.getTime() - left.lastCachedAt.getTime()
  );
}

async function getJobStatsForChapterKeys(
  dbClient: {
    translationJob: {
      findMany: typeof import('@/server/db').db.translationJob.findMany;
    };
  },
  chapterCacheKeys: string[]
) {
  const stats = new Map<
    string,
    {
      completedJobCount: number;
      latestJobAt: Date | null;
      totalJobCount: number;
    }
  >();

  if (!chapterCacheKeys.length) {
    return stats;
  }

  const jobs = await dbClient.translationJob.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      chapterCacheKey: true,
      createdAt: true,
      status: true,
    },
    where: {
      chapterCacheKey: {
        in: chapterCacheKeys,
      },
    },
  });

  for (const job of jobs) {
    if (!job.chapterCacheKey) {
      continue;
    }

    const current =
      stats.get(job.chapterCacheKey) ??
      ({
        completedJobCount: 0,
        latestJobAt: null,
        totalJobCount: 0,
      } satisfies {
        completedJobCount: number;
        latestJobAt: Date | null;
        totalJobCount: number;
      });

    current.totalJobCount += 1;
    current.completedJobCount += job.status === 'completed' ? 1 : 0;
    current.latestJobAt =
      !current.latestJobAt || job.createdAt > current.latestJobAt
        ? job.createdAt
        : current.latestJobAt;
    stats.set(job.chapterCacheKey, current);
  }

  return stats;
}

function matchesSearch(group: ChapterGroup, searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  return [
    group.chapterCacheKey,
    group.identity?.chapterName,
    group.identity?.chapterUrl,
    group.identity?.mangaTitle,
    group.identity?.mangaUrl,
    group.identity?.sourceId,
    group.identity?.sourceName,
  ].some((value) => value?.toLowerCase().includes(searchTerm));
}

function normalizeChapterIdentity(rawIdentity: unknown) {
  const identity = zTranslationChapterIdentity.safeParse(rawIdentity);

  if (!identity.success) {
    return null;
  }

  return {
    chapterName: identity.data.chapterName ?? null,
    chapterUrl: identity.data.chapterUrl,
    mangaTitle: identity.data.mangaTitle ?? null,
    mangaUrl: identity.data.mangaUrl ?? null,
    sourceId: identity.data.sourceId ?? null,
    sourceName: identity.data.sourceName ?? null,
  };
}

function buildPagePreviews(rawManifest: unknown) {
  const manifest =
    rawManifest &&
    typeof rawManifest === 'object' &&
    !Array.isArray(rawManifest)
      ? (rawManifest as Record<string, unknown>)
      : null;
  const pageOrder = Array.isArray(manifest?.pageOrder)
    ? manifest.pageOrder.filter(
        (item): item is string => typeof item === 'string'
      )
    : [];
  const pages =
    manifest?.pages &&
    typeof manifest.pages === 'object' &&
    !Array.isArray(manifest.pages)
      ? (manifest.pages as Record<string, unknown>)
      : {};

  return pageOrder.slice(0, PAGE_PREVIEW_LIMIT).map((pageKey) => {
    const page =
      pages[pageKey] && typeof pages[pageKey] === 'object'
        ? (pages[pageKey] as Record<string, unknown>)
        : {};
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    let blockCount = 0;
    const sourceTexts: string[] = [];
    const translations: string[] = [];

    for (const block of blocks) {
      if (!block || typeof block !== 'object') {
        continue;
      }

      const record = block as Record<string, unknown>;
      const sourceText = typeof record.text === 'string' ? record.text : '';
      const translation =
        typeof record.translation === 'string'
          ? cleanProviderTranslationText(record.translation)
          : '';

      if (
        shouldDropProviderTranslationBlock({
          sourceText,
          translation:
            typeof record.translation === 'string' ? record.translation : '',
        })
      ) {
        continue;
      }

      blockCount += 1;
      if (sourceText) {
        sourceTexts.push(sourceText);
      }
      if (translation) {
        translations.push(translation);
      }
    }

    return {
      blockCount,
      imageHeight: typeof page.imgHeight === 'number' ? page.imgHeight : null,
      imageWidth: typeof page.imgWidth === 'number' ? page.imgWidth : null,
      pageKey,
      sourcePreview: truncate(sourceTexts.join(' '), 220),
      translationPreview: truncate(translations.join(' '), 220),
    };
  });
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1))}...`
    : value;
}
