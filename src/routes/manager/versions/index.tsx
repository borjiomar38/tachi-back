import { createFileRoute } from '@tanstack/react-router';

import { PageVersionHistory } from '@/features/version-history/manager/page-version-history';

export const Route = createFileRoute('/manager/versions/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <PageVersionHistory />;
}
