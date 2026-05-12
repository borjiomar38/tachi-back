import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageFreeTrials } from '@/features/free-trial/manager/page-free-trials';

export const Route = createFileRoute('/manager/free-trials/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      page: z.coerce.number().int().positive().prefault(1),
      query: z.string().prefault(''),
      status: z
        .enum([
          'all',
          'active',
          'exhausted',
          'paid_converted',
          'has_ip',
          'has_fingerprint',
        ])
        .prefault('all'),
    })
  ),
  search: {
    middlewares: [
      stripSearchParams({
        page: 1,
        query: '',
        status: 'all',
      }),
    ],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageFreeTrials search={search} />;
}
