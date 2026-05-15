import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  fallbackBlogArticle,
  fallbackBlogArticleSummary,
} from '@/features/blog/fallback';
import {
  BlogArticleDetail,
  BlogArticlePagination,
  BlogArticleSummaryPage,
} from '@/features/blog/schema';
import {
  getPublishedBlogArticleBySlug,
  getPublishedBlogArticleSummaries,
  getPublishedBlogArticleSummaryCount,
} from '@/server/blog/service';

const publicBlogArticlesPageSize = 14;

const zPublicBlogArticlesInput = z.object({
  page: z.number().int().min(1).max(10_000).catch(1),
});

const zBlogArticleBySlugInput = z.object({
  slug: z.string().trim().min(1).max(120),
});

export const getPublicBlogArticles = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BlogArticleSummaryPage> =>
    await loadPublicBlogArticlePage(1)
);

export const getPublicBlogArticlePage = createServerFn({ method: 'GET' })
  .inputValidator(zPublicBlogArticlesInput)
  .handler(
    async ({ data }): Promise<BlogArticleSummaryPage> =>
      await loadPublicBlogArticlePage(data.page)
  );

async function loadPublicBlogArticlePage(
  requestedPage: number
): Promise<BlogArticleSummaryPage> {
  const excludedSlugs = [fallbackBlogArticleSummary.slug];

  try {
    const totalPublishedArticles = await getPublishedBlogArticleSummaryCount({
      excludedSlugs,
    });
    const pagination = buildBlogArticlePagination({
      page: requestedPage,
      pageSize: publicBlogArticlesPageSize,
      totalItems: totalPublishedArticles + 1,
    });
    const fallbackIndex = await getFallbackArticleIndex(excludedSlugs);
    const articleWindow = buildBlogArticleWindow({
      fallbackIndex,
      pagination,
    });
    const articles = await getPublishedBlogArticleSummaries({
      excludedSlugs,
      skip: articleWindow.skip,
      take: articleWindow.take,
    });

    return {
      articles: mergeFallbackArticle({
        articles,
        fallbackOffset: articleWindow.fallbackOffset,
        includesFallback: articleWindow.includesFallback,
      }),
      pagination,
    };
  } catch (error) {
    console.error('Failed to load public blog articles', error);
    return {
      articles: [fallbackBlogArticleSummary],
      pagination: buildBlogArticlePagination({
        page: 1,
        pageSize: publicBlogArticlesPageSize,
        totalItems: 1,
      }),
    };
  }
}

async function getFallbackArticleIndex(
  excludedSlugs: string[]
): Promise<number> {
  return await getPublishedBlogArticleSummaryCount({
    excludedSlugs,
    publishedAtFrom: new Date(fallbackBlogArticleSummary.publishedAt),
  });
}

function mergeFallbackArticle(input: {
  articles: BlogArticleSummaryPage['articles'];
  fallbackOffset: number;
  includesFallback: boolean;
}): BlogArticleSummaryPage['articles'] {
  if (!input.includesFallback) {
    return input.articles;
  }

  return [
    ...input.articles.slice(0, input.fallbackOffset),
    fallbackBlogArticleSummary,
    ...input.articles.slice(input.fallbackOffset),
  ];
}

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

function buildBlogArticlePagination(input: {
  page: number;
  pageSize: number;
  totalItems: number;
}): BlogArticlePagination {
  const totalPages = Math.max(1, Math.ceil(input.totalItems / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const pageStart =
    input.totalItems === 0 ? 0 : (page - 1) * input.pageSize + 1;
  const pageEnd = Math.min(input.totalItems, page * input.pageSize);

  return {
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    page,
    pageEnd,
    pageSize: input.pageSize,
    pageStart,
    totalItems: input.totalItems,
    totalPages,
  };
}

function buildBlogArticleWindow(input: {
  fallbackIndex: number;
  pagination: BlogArticlePagination;
}) {
  const pagination = input.pagination;
  const firstItemIndex = (pagination.page - 1) * pagination.pageSize;
  const lastItemIndex = firstItemIndex + pagination.pageSize;
  const includesFallback =
    input.fallbackIndex >= firstItemIndex &&
    input.fallbackIndex < lastItemIndex;
  const isFallbackBeforePage = input.fallbackIndex < firstItemIndex;

  return {
    fallbackOffset: Math.max(0, input.fallbackIndex - firstItemIndex),
    includesFallback,
    skip: Math.max(0, firstItemIndex - Number(isFallbackBeforePage)),
    take: pagination.pageSize - Number(includesFallback),
  };
}
