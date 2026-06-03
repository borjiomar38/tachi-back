import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';

import {
  getManhwaChapter,
  getNextManhwaChapter,
  getPreviousManhwaChapter,
  getPrivateManhwaReaderSeries,
  getPrivateManhwaReaderSeriesBySlug,
  getPublicManhwaSeries,
  getPublicManhwaSeriesBySlug,
} from '@/features/manhwa/data';
import { ManhwaChapterView, ManhwaSeriesView } from '@/features/manhwa/schema';
import { isManhwaChapterPublic } from '@/features/manhwa/visibility';
import { auth } from '@/server/auth';

interface ManhwaIndexPageData {
  isPrivatePreview: boolean;
  series: ManhwaSeriesView[];
  showPrivateContext: boolean;
}

interface ManhwaSeriesPageData {
  isPrivatePreview: boolean;
  series?: ManhwaSeriesView;
}

interface ManhwaChapterPageData {
  chapter?: ManhwaChapterView;
  isPrivatePreview: boolean;
  nextChapter?: ManhwaChapterView;
  previousChapter?: ManhwaChapterView;
  series?: ManhwaSeriesView;
}

const zManhwaSlugInput = z.object({
  slug: z.string().trim().min(1).max(160),
});

const zManhwaChapterInput = z.object({
  chapter: z.coerce.number().int().min(1).max(10_000),
  slug: z.string().trim().min(1).max(160),
});

async function canViewPrivateManhwaProgressFromRequest() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  return session?.user.role === 'admin';
}

export const canViewPrivateManhwaProgress = createServerFn({
  method: 'GET',
}).handler(canViewPrivateManhwaProgressFromRequest);

export const getManhwaIndexPageData = createServerFn({
  method: 'GET',
}).handler(async (): Promise<ManhwaIndexPageData> => {
  const canViewPrivate = await canViewPrivateManhwaProgressFromRequest();

  return {
    isPrivatePreview: canViewPrivate,
    series: canViewPrivate
      ? getPrivateManhwaReaderSeries()
      : getPublicManhwaSeries(),
    showPrivateContext: canViewPrivate,
  };
});

export const getManhwaSeriesPageData = createServerFn({ method: 'GET' })
  .inputValidator(zManhwaSlugInput)
  .handler(async ({ data }): Promise<ManhwaSeriesPageData> => {
    const canViewPrivate = await canViewPrivateManhwaProgressFromRequest();
    const series = canViewPrivate
      ? getPrivateManhwaReaderSeriesBySlug(data.slug)
      : getPublicManhwaSeriesBySlug(data.slug);

    return {
      isPrivatePreview:
        canViewPrivate &&
        Boolean(
          series?.chapters.some((chapter) => !isManhwaChapterPublic(chapter))
        ),
      series,
    };
  });

export const getManhwaChapterPageData = createServerFn({ method: 'GET' })
  .inputValidator(zManhwaChapterInput)
  .handler(async ({ data }): Promise<ManhwaChapterPageData> => {
    const canViewPrivate = await canViewPrivateManhwaProgressFromRequest();
    const series = canViewPrivate
      ? getPrivateManhwaReaderSeriesBySlug(data.slug)
      : getPublicManhwaSeriesBySlug(data.slug);
    const chapter = series
      ? getManhwaChapter(series, data.chapter, {
          includePrivate: canViewPrivate,
        })
      : undefined;

    return {
      chapter,
      isPrivatePreview:
        canViewPrivate && chapter ? !isManhwaChapterPublic(chapter) : false,
      nextChapter: series
        ? getNextManhwaChapter(series, data.chapter, {
            includePrivate: canViewPrivate,
          })
        : undefined,
      previousChapter: series
        ? getPreviousManhwaChapter(series, data.chapter, {
            includePrivate: canViewPrivate,
          })
        : undefined,
      series,
    };
  });
