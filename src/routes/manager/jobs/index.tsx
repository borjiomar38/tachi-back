import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageJobs } from '@/features/job/manager/page-jobs';

export const Route = createFileRoute('/manager/jobs/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      searchTerm: z.string().prefault(''),
      status: z
        .enum(['all', 'queued', 'processing', 'failed', 'completed'])
        .prefault('all'),
    })
  ),
  search: {
    middlewares: [stripSearchParams({ searchTerm: '', status: 'all' })],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageJobs search={search} />;
}
