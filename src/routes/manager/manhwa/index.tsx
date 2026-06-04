import { createFileRoute } from '@tanstack/react-router';

import { PageManhwaSeriesList } from '@/features/manhwa/manager/page-manhwa-series-list';
import { getManhwaManagerSeriesList } from '@/features/manhwa/manager/server';

export const Route = createFileRoute('/manager/manhwa/')({
  component: RouteComponent,
  loader: () => getManhwaManagerSeriesList(),
});

function RouteComponent() {
  const data = Route.useLoaderData();

  return <PageManhwaSeriesList data={data} />;
}
