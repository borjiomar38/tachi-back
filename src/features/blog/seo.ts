export type BlogSeoContentType = 'manga' | 'manhua' | 'manhwa';

export const coreBlogSeoKeywords = [
  'manga translate ia',
  'manhwa translate ia',
  'manhua translate ia',
] as const;

export const requiredBlogSeoKeyword = 'manhwa translate ia';

export const buildRequiredBlogSeoKeyword = (type?: string | null) => {
  if (type === 'manga' || type === 'manhua' || type === 'manhwa') {
    return `${type} translate ia`;
  }

  return requiredBlogSeoKeyword;
};

export const highIntentBlogSeoKeywords = [
  ...coreBlogSeoKeywords,
  'manhwa AI translator',
  'AI manhwa translation',
  'manhwa OCR translator',
  'translate manhwa online',
  'manhwa translation app',
  'manhua translation app',
  'manga translator app',
  'manga OCR',
  'TachiyomiAT download',
  'Android manhwa reader',
] as const;

export const buildBlogSeoKeywords = (
  keywords: readonly string[],
  options: {
    limit?: number;
    type?: string | null;
  } = {}
) => {
  const limit = options.limit ?? 12;
  const requiredKeyword = buildRequiredBlogSeoKeyword(options.type);
  const candidates = [
    requiredKeyword,
    ...keywords,
    ...highIntentBlogSeoKeywords,
  ];

  return candidates
    .map(normalizeKeyword)
    .filter((keyword): keyword is string => Boolean(keyword))
    .filter((keyword, index, list) => {
      const normalizedKeyword = keyword.toLowerCase();

      return (
        list.findIndex((item) => item.toLowerCase() === normalizedKeyword) ===
        index
      );
    })
    .slice(0, limit);
};

function normalizeKeyword(keyword: string) {
  const normalized = keyword.trim().replace(/\s+/g, ' ');

  return normalized.length > 0 ? normalized : null;
}
