import { createFileRoute } from '@tanstack/react-router';

import { PageFreeTrial } from '@/features/free-trial/manager/page-free-trial';

export const Route = createFileRoute('/manager/free-trials/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  return <PageFreeTrial params={params} />;
}
