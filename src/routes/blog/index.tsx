import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageBlogIndex } from '@/features/blog/page-blog-index';
import { getPublicBlogArticlePage } from '@/features/blog/server';
import { buildPublicBlogIndexHead } from '@/features/public/head';

export const Route = createFileRoute('/blog/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      page: fallback(z.coerce.number().int().min(1), 1),
    })
  ),
  search: {
    middlewares: [stripSearchParams({ page: 1 })],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
  }),
  loader: async ({ deps }) =>
    await getPublicBlogArticlePage({ data: { page: deps.page } }),
  head: () => buildPublicBlogIndexHead(),
});

function RouteComponent() {
  const blogArticlePage = Route.useLoaderData();

  return (
    <PageBlogIndex
      articles={blogArticlePage.articles}
      pagination={blogArticlePage.pagination}
    />
  );
}
