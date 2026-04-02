import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageContacts } from '@/features/contact/manager/page-contacts';

export const Route = createFileRoute('/manager/contacts/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      searchTerm: z.string().prefault(''),
      status: z
        .enum(['all', 'unread', 'in_progress', 'resolved', 'spam'])
        .prefault('all'),
    })
  ),
  search: {
    middlewares: [
      stripSearchParams({
        searchTerm: '',
        status: 'all',
      }),
    ],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageContacts search={search} />;
}
