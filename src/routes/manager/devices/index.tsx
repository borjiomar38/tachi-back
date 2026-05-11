import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageDevices } from '@/features/device/manager/page-devices';

export const Route = createFileRoute('/manager/devices/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      country: z.string().prefault('all'),
      linked: z.enum(['all', 'linked', 'unlinked']).prefault('all'),
      page: z.coerce.number().int().positive().prefault(1),
      searchTerm: z.string().prefault(''),
      status: z
        .enum(['all', 'pending', 'active', 'revoked', 'blocked'])
        .prefault('all'),
    })
  ),
  search: {
    middlewares: [
      stripSearchParams({
        country: 'all',
        linked: 'all',
        page: 1,
        searchTerm: '',
        status: 'all',
      }),
    ],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageDevices search={search} />;
}
