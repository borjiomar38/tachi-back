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
  'free manga ia translator',
  'free manhwa ia translator',
  'free manhua ia translator',
  'free manga AI translator',
  'free manhwa AI translator',
  'free manhua AI translator',
  'manhwa AI translator',
  'manga AI translator',
  'manhua AI translator',
  'AI manhwa translation',
  'AI manga translation',
  'AI manhua translation',
  'manhwa OCR translator',
  'manga OCR translator',
  'manhua OCR translator',
  'translate manhwa online',
  'translate manga online',
  'translate manhua online',
  'manhwa translation app',
  'manhua translation app',
  'manga translator app',
  'manga OCR',
  'TachiyomiAT download',
  'Android manhwa reader',
] as const;

export const publicSeoKeywords = [
  ...highIntentBlogSeoKeywords,
  'free manga ia translator app',
  'free manhwa ia translator app',
  'free manhua ia translator app',
  'Android manga IA translator',
  'Android manhwa IA translator',
  'Android manhua IA translator',
  'TachiyomiAT APK',
  'TachiyomiAT Android app',
] as const;

export const buildPublicSeoKeywords = (
  keywords: readonly string[] = [],
  options: {
    limit?: number;
    type?: string | null;
  } = {}
) =>
  buildBlogSeoKeywords([...keywords, ...publicSeoKeywords], {
    limit: options.limit ?? 18,
    type: options.type,
  });

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
