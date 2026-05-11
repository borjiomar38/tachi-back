import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageDevicesMap } from '@/features/device/manager/page-devices-map';

export const Route = createFileRoute('/manager/devices/map/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      country: z.string().prefault('all'),
      linked: z.enum(['all', 'linked', 'unlinked']).prefault('all'),
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
        searchTerm: '',
        status: 'all',
      }),
    ],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageDevicesMap search={search} />;
}
