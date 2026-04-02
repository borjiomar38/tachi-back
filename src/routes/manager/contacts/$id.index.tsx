import { createFileRoute } from '@tanstack/react-router';

import { PageContact } from '@/features/contact/manager/page-contact';

export const Route = createFileRoute('/manager/contacts/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  return <PageContact params={params} />;
}
