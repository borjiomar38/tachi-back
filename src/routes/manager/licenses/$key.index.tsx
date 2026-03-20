import { createFileRoute } from '@tanstack/react-router';

import { PageLicense } from '@/features/license/manager/page-license';

export const Route = createFileRoute('/manager/licenses/$key/')({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  return <PageLicense params={params} />;
}
