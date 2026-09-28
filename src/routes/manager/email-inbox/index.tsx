import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageEmailInbox } from '@/features/email-inbox/manager/page-email-inbox';
import { zEmailInboxFilter } from '@/server/email-inbox/schema';

export const Route = createFileRoute('/manager/email-inbox/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      filter: zEmailInboxFilter.prefault('all'),
      mailbox: z.string().prefault('all'),
      searchTerm: z.string().prefault(''),
    })
  ),
  search: {
    middlewares: [
      stripSearchParams({
        filter: 'all',
        mailbox: 'all',
        searchTerm: '',
      }),
    ],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageEmailInbox search={search} />;
}
