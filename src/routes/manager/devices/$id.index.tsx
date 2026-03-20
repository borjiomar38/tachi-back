import { createFileRoute } from '@tanstack/react-router';

import { PageDevice } from '@/features/device/manager/page-device';

export const Route = createFileRoute('/manager/devices/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  return <PageDevice params={params} />;
}
