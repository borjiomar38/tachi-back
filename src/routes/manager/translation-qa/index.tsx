import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageTranslationQa } from '@/features/translation-qa/manager/page-translation-qa';

export const Route = createFileRoute('/manager/translation-qa/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      status: z
        .enum(['all', 'issues_found', 'blocked', 'ok', 'unavailable'])
        .prefault('all'),
    })
  ),
  search: {
    middlewares: [stripSearchParams({ status: 'all' })],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageTranslationQa search={search} />;
}
