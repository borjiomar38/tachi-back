import type { BlogArticleCategory } from '@/features/blog/schema';

export interface LegacyBlogCategoryInput {
  excerpt: string;
  generationSource: string;
  keywords: readonly string[];
  manhwaTitle: string;
  searchIntent: string;
  slug: string;
  title: string;
}

const appUpdatePattern =
  /\b(app update|changelog|patch notes?|release notes?|nayovi update|tachiyomiat update|version \d|what(?:'s| is) new)\b/i;
const newsPattern =
  /\b(announc(?:e|ed|ement)|launch date|latest news|new season|premiere|release date|renew(?:ed|al)|returns?|season \d|serialization)\b/i;
const legacyRecommendationSources = new Set(['codex-cli-cron', 'daily-cron']);

export function resolveLegacyBlogArticleCategory(
  input: LegacyBlogCategoryInput
): BlogArticleCategory {
  const primarySignals = normalizeSearchText([
    input.generationSource,
    input.searchIntent,
    input.slug,
    input.title,
  ]);

  if (appUpdatePattern.test(primarySignals)) {
    return 'app_updates';
  }

  // These historical generators produced title spotlights and translation
  // guides. A guide may mention an adaptation or a future season without
  // becoming a news article.
  if (legacyRecommendationSources.has(input.generationSource.trim())) {
    return 'recommendations';
  }

  if (newsPattern.test(primarySignals)) {
    return 'manhwa_news';
  }

  return 'recommendations';
}

function normalizeSearchText(values: readonly (string | readonly string[])[]) {
  return values
    .flat()
    .join(' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
