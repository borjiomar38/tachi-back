import { createFileRoute } from '@tanstack/react-router';

import { PageManhwaProduction } from '@/features/manhwa/manager/page-manhwa-production';
import { getManhwaManagerOverview } from '@/features/manhwa/manager/server';

export const Route = createFileRoute('/manager/manhwa/$slug/')({
  component: RouteComponent,
  loader: async ({ params }) =>
    await getManhwaManagerOverview({
      data: {
        seriesSlug: params.slug,
      },
    }),
});

function RouteComponent() {
  const overview = Route.useLoaderData();

  return <PageManhwaProduction overview={overview} />;
}
