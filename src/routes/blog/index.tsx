import { createFileRoute } from '@tanstack/react-router';

import { PageBlogIndex } from '@/features/blog/page-blog-index';
import { getPublicBlogArticles } from '@/features/blog/server';
import { buildPublicBlogIndexHead } from '@/features/public/head';

export const Route = createFileRoute('/blog/')({
  component: RouteComponent,
  loader: async () => await getPublicBlogArticles(),
  head: () => buildPublicBlogIndexHead(),
});

function RouteComponent() {
  const articles = Route.useLoaderData();

  return <PageBlogIndex articles={articles} />;
}
