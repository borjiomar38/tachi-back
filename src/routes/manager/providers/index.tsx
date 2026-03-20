import {
  createFileRoute,
  stripSearchParams,
  useRouter,
} from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageProviderOps } from '@/features/provider/manager/page-provider-ops';

export const Route = createFileRoute('/manager/providers/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      windowHours: z.coerce
        .number()
        .int()
        .positive()
        .max(24 * 30)
        .prefault(24),
    })
  ),
  search: {
    middlewares: [stripSearchParams({ windowHours: 24 })],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  const router = useRouter();

  return (
    <PageProviderOps
      search={search}
      setWindowHours={(windowHours) => {
        router.navigate({
          replace: true,
          search: {
            windowHours,
          },
          to: '.',
        });
      }}
    />
  );
}
