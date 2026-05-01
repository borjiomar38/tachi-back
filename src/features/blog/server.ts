import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  fallbackBlogArticle,
  fallbackBlogArticleSummary,
} from '@/features/blog/fallback';
import { BlogArticleDetail, BlogArticleSummary } from '@/features/blog/schema';
import {
  getPublishedBlogArticleBySlug,
  getPublishedBlogArticleSummaries,
} from '@/server/blog/service';

const zBlogArticleBySlugInput = z.object({
  slug: z.string().trim().min(1).max(120),
});

export const getPublicBlogArticles = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BlogArticleSummary[]> => {
    try {
      const articles = await getPublishedBlogArticleSummaries();

      return [
        fallbackBlogArticleSummary,
        ...articles.filter(
          (article) => article.slug !== fallbackBlogArticleSummary.slug
        ),
      ];
    } catch (error) {
      console.error('Failed to load public blog articles', error);
      return [fallbackBlogArticleSummary];
    }
  }
);

export const getPublicBlogArticleBySlug = createServerFn({ method: 'GET' })
  .inputValidator(zBlogArticleBySlugInput)
  .handler(async ({ data }): Promise<BlogArticleDetail | null> => {
    if (data.slug === fallbackBlogArticle.slug) {
      return fallbackBlogArticle;
    }

    try {
      return await getPublishedBlogArticleBySlug(data.slug);
    } catch (error) {
      console.error('Failed to load public blog article', error);
      return null;
    }
  });
