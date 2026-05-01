import { createFileRoute } from '@tanstack/react-router';

import { PageError } from '@/components/errors/page-error';

import { PageBlogArticle } from '@/features/blog/page-blog-article';
import { getPublicBlogArticleBySlug } from '@/features/blog/server';
import {
  buildPublicBlogArticleHead,
  buildPublicPageHead,
} from '@/features/public/head';

export const Route = createFileRoute('/blog/$slug')({
  component: RouteComponent,
  loader: async ({ params }) =>
    await getPublicBlogArticleBySlug({ data: { slug: params.slug } }),
  head: ({ loaderData }) =>
    loaderData
      ? buildPublicBlogArticleHead(loaderData)
      : buildPublicPageHead(
          'Article not found',
          'This TachiyomiAT blog article is not available.',
          '/blog'
        ),
});

function RouteComponent() {
  const article = Route.useLoaderData();

  if (!article) {
    return <PageError type="404" />;
  }

  return <PageBlogArticle article={article} />;
}
