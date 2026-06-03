import { createFileRoute } from '@tanstack/react-router';

import { PageManhwaProduction } from '@/features/manhwa/manager/page-manhwa-production';
import { getManhwaManagerOverview } from '@/features/manhwa/manager/server';

export const Route = createFileRoute('/manager/manhwa/')({
  component: RouteComponent,
  loader: () => getManhwaManagerOverview(),
});

function RouteComponent() {
  const overview = Route.useLoaderData();

  return <PageManhwaProduction overview={overview} />;
}
