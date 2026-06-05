import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';

import { envServer } from '@/env/server';
import {
  getManhwaChapter,
  getNextManhwaChapter,
  getPreviousManhwaChapter,
  getPrivateManhwaReaderSeries,
  getPrivateManhwaReaderSeriesBySlug,
  getPublicManhwaSeries,
  getPublicManhwaSeriesBySlug,
} from '@/features/manhwa/data';
import {
  ManhwaChapterView,
  ManhwaPanelView,
  ManhwaSeriesView,
} from '@/features/manhwa/schema';
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
    const privatePanelPaths =
      canViewPrivate && chapter
        ? await getPrivateRenderedPanelPaths(data.slug, data.chapter)
        : new Map<number, string>();
    const enrichedChapter =
      canViewPrivate && chapter
        ? withPrivateRenderedPanels(chapter, privatePanelPaths)
        : chapter;
    const enrichedSeries =
      canViewPrivate && series
        ? withPrivateRenderedSeries(series, data.chapter, privatePanelPaths)
        : series;

    return {
      chapter: enrichedChapter,
      isPrivatePreview:
        canViewPrivate && enrichedChapter
          ? !isManhwaChapterPublic(enrichedChapter)
          : false,
      nextChapter: enrichedSeries
        ? getNextManhwaChapter(enrichedSeries, data.chapter, {
            includePrivate: canViewPrivate,
          })
        : undefined,
      previousChapter: enrichedSeries
        ? getPreviousManhwaChapter(enrichedSeries, data.chapter, {
            includePrivate: canViewPrivate,
          })
        : undefined,
      series: enrichedSeries,
    };
  });

function withPrivateRenderedSeries(
  series: ManhwaSeriesView,
  chapterNumber: number,
  panelPaths: Map<number, string>
): ManhwaSeriesView {
  const chapters = series.chapters.map((chapter) =>
    chapter.chapterNumber === chapterNumber
      ? withPrivateRenderedPanels(chapter, panelPaths)
      : chapter
  );
  const coverImagePath =
    chapters
      .flatMap((chapter) => chapter.panels)
      .find((panel) => panel.imagePath)?.imagePath ?? series.coverImagePath;

  return {
    ...series,
    chapters,
    coverImagePath,
  };
}

function withPrivateRenderedPanels(
  chapter: ManhwaChapterView,
  panelPaths: Map<number, string>
): ManhwaChapterView {
  if (panelPaths.size === 0) {
    return chapter;
  }

  return {
    ...chapter,
    panels: chapter.panels.map((panel, index): ManhwaPanelView => {
      const panelNumber = index + 1;
      const imagePath = panelPaths.get(panelNumber) ?? panel.imagePath;

      return imagePath
        ? {
            ...panel,
            imagePath,
          }
        : panel;
    }),
  };
}

async function getPrivateRenderedPanelPaths(
  slug: string,
  chapterNumber: number
) {
  const path = await import('node:path');
  const { readdir } = await import('node:fs/promises');
  const privateRoot = path.resolve(
    envServer.MANHWA_PRIVATE_ROOT ??
      path.join(process.cwd(), 'docs/manhwa/private')
  );
  const chapterDir = path.resolve(
    privateRoot,
    slug,
    `chapter-${String(chapterNumber).padStart(3, '0')}`
  );

  if (!chapterDir.startsWith(`${privateRoot}${path.sep}`)) {
    return new Map<number, string>();
  }

  try {
    const entries = await readdir(chapterDir, { withFileTypes: true });
    const panelPaths = new Map<number, string>();

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const match = /^panel-(\d+)\.(?:png|jpe?g|webp)$/i.exec(entry.name);
      const panelNumber = match ? Number.parseInt(match[1] ?? '0', 10) : 0;

      if (panelNumber > 0) {
        panelPaths.set(
          panelNumber,
          `/api/manhwa-private/${slug}/chapter/${chapterNumber}/panel/${panelNumber}`
        );
      }
    }

    return panelPaths;
  } catch {
    return new Map<number, string>();
  }
}
