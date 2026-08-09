import { createFileRoute, notFound } from '@tanstack/react-router';

import { PageBlogArticle } from '@/features/blog/page-blog-article';
import { getPublicBlogArticleBySlug } from '@/features/blog/server';
import {
  buildPublicBlogArticleHead,
  buildPublicNotFoundHead,
} from '@/features/public/head';

export const Route = createFileRoute('/blog/$slug')({
  component: RouteComponent,
  loader: async ({ params }) => {
    const article = await getPublicBlogArticleBySlug({
      data: { slug: params.slug },
    });

    if (!article) {
      throw notFound();
    }

    return article;
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildPublicBlogArticleHead(loaderData)
      : buildPublicNotFoundHead(
          'Article not found',
          'This Nayovi blog article is not available.'
        ),
});

function RouteComponent() {
  const article = Route.useLoaderData();

  return <PageBlogArticle article={article} />;
}
