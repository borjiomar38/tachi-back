import { createHash } from 'node:crypto';

import { zTranslationChapterIdentity } from '@/server/jobs/schema';

export type NormalizedTranslationChapterIdentity = {
  chapterName: string | null;
  chapterUrl: string;
  mangaTitle: string | null;
  mangaUrl: string | null;
  sourceId: string | null;
  sourceName: string | null;
};

export function normalizeTranslationChapterIdentity(
  rawIdentity: unknown
): NormalizedTranslationChapterIdentity | null {
  const identity = zTranslationChapterIdentity.safeParse(rawIdentity);

  if (!identity.success) {
    return null;
  }

  return {
    chapterName: identity.data.chapterName?.trim() || null,
    chapterUrl: identity.data.chapterUrl.trim(),
    mangaTitle: identity.data.mangaTitle?.trim() || null,
    mangaUrl: identity.data.mangaUrl?.trim() || null,
    sourceId: identity.data.sourceId?.trim() || null,
    sourceName: identity.data.sourceName?.trim() || null,
  };
}

export function buildTranslationChapterCacheKey(rawIdentity: unknown) {
  const identity = normalizeTranslationChapterIdentity(rawIdentity);

  if (!identity) {
    return null;
  }

  return createHash('sha256')
    .update(
      JSON.stringify({
        algorithm: '2026-04-24.chapter-url.v1',
        chapterUrl: identity.chapterUrl,
        sourceId: identity.sourceId,
        sourceName: identity.sourceName,
      })
    )
    .digest('hex');
}
