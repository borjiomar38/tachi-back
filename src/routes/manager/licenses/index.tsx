import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageLicenses } from '@/features/license/manager/page-licenses';

export const Route = createFileRoute('/manager/licenses/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      searchTerm: z.string().prefault(''),
      status: z
        .enum(['all', 'available', 'redeemed', 'expired', 'canceled'])
        .prefault('all'),
    })
  ),
  search: {
    middlewares: [stripSearchParams({ searchTerm: '', status: 'all' })],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageLicenses search={search} />;
}
