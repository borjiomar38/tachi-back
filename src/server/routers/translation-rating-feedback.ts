import { z } from 'zod';

import { permissionJob } from '@/features/auth/permissions';
import { protectedProcedure } from '@/server/orpc';
import {
  zBackofficeTranslationRatingFeedbackListInput,
  zBackofficeTranslationRatingFeedbackListResponse,
} from '@/server/translation-rating-feedback/schema';

const tags = ['translation-rating-feedback'];

export default {
  list: protectedProcedure({
    permissions: permissionJob.read,
  })
    .route({
      method: 'GET',
      path: '/translation-rating-feedback',
      tags,
    })
    .input(zBackofficeTranslationRatingFeedbackListInput)
    .output(zBackofficeTranslationRatingFeedbackListResponse)
    .handler(async ({ context, input }) => {
      const searchTerm = input.searchTerm.trim();
      const where = {
        AND: [
          buildRatingWhere(input.rating),
          searchTerm ? buildSearchWhere(searchTerm) : {},
        ],
      };
      const [items, total, statsRows] = await Promise.all([
        context.db.translationRatingFeedback.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            appBuild: true,
            appVersion: true,
            chapterCacheKey: true,
            chapterName: true,
            chapterUrl: true,
            comment: true,
            createdAt: true,
            device: {
              select: {
                installationId: true,
              },
            },
            deviceId: true,
            id: true,
            license: {
              select: {
                key: true,
                ownerEmail: true,
              },
            },
            locale: true,
            mangaTitle: true,
            pageCount: true,
            rating: true,
            readDurationMs: true,
            sourceLanguage: true,
            sourceName: true,
            targetLanguage: true,
            translationCacheKey: true,
            translationJobId: true,
          },
          take: input.limit,
          where,
        }),
        context.db.translationRatingFeedback.count({
          where,
        }),
        context.db.translationRatingFeedback.findMany({
          select: {
            comment: true,
            rating: true,
          },
          where,
        }),
      ]);

      return {
        items: items.map((item) => ({
          appBuild: item.appBuild,
          appVersion: item.appVersion,
          chapterCacheKey: item.chapterCacheKey,
          chapterName: item.chapterName,
          chapterUrl: item.chapterUrl,
          comment: item.comment,
          createdAt: item.createdAt,
          deviceId: item.deviceId,
          id: item.id,
          installationId: item.device.installationId,
          licenseKey: item.license.key,
          locale: item.locale,
          mangaTitle: item.mangaTitle,
          ownerEmail: item.license.ownerEmail,
          pageCount: item.pageCount,
          rating: item.rating,
          readDurationMs: item.readDurationMs,
          sourceLanguage: item.sourceLanguage,
          sourceName: item.sourceName,
          targetLanguage: item.targetLanguage,
          translationCacheKey: item.translationCacheKey,
          translationJobId: item.translationJobId,
        })),
        stats: buildStats(statsRows),
        total,
      };
    }),
};

type RatingFilter = z.infer<
  typeof zBackofficeTranslationRatingFeedbackListInput
>['rating'];

function buildRatingWhere(rating: RatingFilter) {
  if (rating === 'all') {
    return {};
  }

  if (rating === 'low') {
    return {
      rating: {
        lte: 2,
      },
    };
  }

  return {
    rating: Number.parseInt(rating, 10),
  };
}

function buildSearchWhere(searchTerm: string) {
  return {
    OR: [
      {
        mangaTitle: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      },
      {
        chapterName: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      },
      {
        chapterUrl: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      },
      {
        comment: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      },
      {
        license: {
          key: {
            contains: searchTerm,
          },
        },
      },
      {
        license: {
          ownerEmail: {
            contains: searchTerm,
            mode: 'insensitive' as const,
          },
        },
      },
      {
        device: {
          installationId: {
            contains: searchTerm,
          },
        },
      },
    ],
  };
}

function buildStats(rows: Array<{ comment: string | null; rating: number }>) {
  const ratingTotal = rows.reduce((total, row) => total + row.rating, 0);

  return {
    averageRating: rows.length ? ratingTotal / rows.length : null,
    commentCount: rows.filter((row) => Boolean(row.comment)).length,
    lowRatingCount: rows.filter((row) => row.rating <= 2).length,
    total: rows.length,
  };
}
