import { z } from 'zod';

import { zMobileReleaseInformation } from '@/server/mobile-release-information';
import { protectedProcedure } from '@/server/orpc';

export const mobileReleaseRouter = {
  list: protectedProcedure({ permissions: { device: ['read'] } })
    .route({ method: 'GET', path: '/mobile-releases', tags: ['devices'] })
    .input(
      z.object({
        beforeVersionCode: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .output(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            platform: z.string(),
            channel: z.string(),
            versionCode: z.number(),
            versionName: z.string(),
            createdAt: z.date(),
            publishedAt: z.date().nullable(),
            releaseInfo: zMobileReleaseInformation(),
          })
        ),
        nextCursor: z.number().nullable(),
      })
    )
    .handler(async ({ context, input }) => {
      const rows = await context.db.mobileAppRelease.findMany({
        where: {
          platform: 'android',
          channel: 'standard-release',
          versionCode: input.beforeVersionCode
            ? { lt: input.beforeVersionCode }
            : undefined,
        },
        orderBy: { versionCode: 'desc' },
        take: input.limit + 1,
      });
      const items = rows.slice(0, input.limit).map((row) => ({
        ...row,
        releaseInfo: zMobileReleaseInformation().parse(row.releaseInfo),
      }));
      return {
        items,
        nextCursor:
          rows.length > input.limit
            ? (items.at(-1)?.versionCode ?? null)
            : null,
      };
    }),
};
