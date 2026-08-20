import {
  createFileRoute,
  notFound,
  stripSearchParams,
} from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { getBlogCategoryConfigBySlug } from '@/features/blog/category';
import { PageBlogCategory } from '@/features/blog/page-blog-category';
import { getPublicBlogCategoryArticlePage } from '@/features/blog/server';
import {
  buildPublicBlogCategoryHead,
  buildPublicNotFoundHead,
} from '@/features/public/head';

export const Route = createFileRoute('/blog/category/$category')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      page: fallback(z.coerce.number().int().min(1), 1),
    })
  ),
  search: {
    middlewares: [stripSearchParams({ page: 1 })],
  },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, params }) => {
    const category = getBlogCategoryConfigBySlug(params.category);

    if (!category) {
      throw notFound();
    }

    const articlePage = await getPublicBlogCategoryArticlePage({
      data: {
        category: category.category,
        page: deps.page,
      },
    });

    return { category, ...articlePage };
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildPublicBlogCategoryHead(
          loaderData.category,
          loaderData.pagination.page,
          loaderData.pagination.totalItems
        )
      : buildPublicNotFoundHead(
          'Blog category not found',
          'This Nayovi blog category is not available.'
        ),
});

function RouteComponent() {
  const articlePage = Route.useLoaderData();

  return (
    <PageBlogCategory
      articles={articlePage.articles}
      category={articlePage.category}
      pagination={articlePage.pagination}
    />
  );
}
