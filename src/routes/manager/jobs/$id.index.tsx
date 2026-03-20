import { createFileRoute } from '@tanstack/react-router';

import { PageJob } from '@/features/job/manager/page-job';

export const Route = createFileRoute('/manager/jobs/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  return <PageJob params={params} />;
}
