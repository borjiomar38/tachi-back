import { describe, expect, it } from 'vitest';

import { buildContentPolicyMangaKey } from '@/server/content-policy/manual-manga-policy';

describe('manual manga policy', () => {
  it('keeps the same key when presentation metadata changes', () => {
    const firstKey = buildContentPolicyMangaKey({
      mangaTitle: 'Example Title',
      mangaUrl: 'https://example.test/manga/example/',
      sourceId: 'source-1',
      sourceName: 'Old Source Name',
    });
    const secondKey = buildContentPolicyMangaKey({
      mangaTitle: 'Renamed Example Title',
      mangaUrl: 'https://example.test/manga/example',
      sourceId: 'source-1',
      sourceName: 'New Source Name',
    });

    expect(secondKey).toBe(firstKey);
  });

  it('separates identical URLs from different sources', () => {
    const firstKey = buildContentPolicyMangaKey({
      mangaTitle: 'Example Title',
      mangaUrl: '/manga/example',
      sourceId: 'source-1',
    });
    const secondKey = buildContentPolicyMangaKey({
      mangaTitle: 'Example Title',
      mangaUrl: '/manga/example',
      sourceId: 'source-2',
    });

    expect(secondKey).not.toBe(firstKey);
  });
});
