import type { BlogArticleCategory } from '@/features/blog/schema';

export interface BlogCategoryConfig {
  category: BlogArticleCategory;
  description: string;
  keywords: readonly string[];
  label: string;
  slug: string;
  title: string;
}

export const blogCategoryConfigs = [
  {
    category: 'recommendations',
    description:
      'Find your next manhwa with focused suggestions based on genre, pacing, mood, and verified official sources.',
    keywords: [
      'manhwa recommendations',
      'best manhwa to read',
      'what manhwa to read next',
    ],
    label: 'Recommendations',
    slug: 'recommendations',
    title: 'Manhwa recommendations',
  },
  {
    category: 'manhwa_news',
    description:
      'Follow verified manhwa announcements, new seasons, release dates, and official publishing news without unsupported rumors.',
    keywords: [
      'manhwa news',
      'new manhwa releases',
      'manhwa season announcements',
    ],
    label: 'Manhwa news',
    slug: 'manhwa-news',
    title: 'Latest manhwa news',
  },
  {
    category: 'app_updates',
    description:
      'See what changed in Nayovi through concise release notes based on new, user-visible application updates.',
    keywords: [
      'Nayovi updates',
      'Nayovi release notes',
      'manga reader updates',
    ],
    label: 'App updates',
    slug: 'app-updates',
    title: 'Nayovi app updates',
  },
] as const satisfies readonly BlogCategoryConfig[];

export function getBlogCategoryConfig(
  category: BlogArticleCategory
): BlogCategoryConfig {
  return blogCategoryConfigs.find((config) => config.category === category)!;
}

export function getBlogCategoryConfigBySlug(
  slug: string
): BlogCategoryConfig | null {
  return blogCategoryConfigs.find((config) => config.slug === slug) ?? null;
}

export function getBlogCategoryPath(category: BlogArticleCategory): string {
  return `/blog/category/${getBlogCategoryConfig(category).slug}`;
}
