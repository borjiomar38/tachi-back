import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { PageTranslationRatingFeedback } from '@/features/translation-rating-feedback/manager/page-translation-rating-feedback';

export const Route = createFileRoute('/manager/translation-feedback/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      rating: z.enum(['all', 'low', '1', '2', '3', '4', '5']).prefault('all'),
      searchTerm: z.string().prefault(''),
    })
  ),
  search: {
    middlewares: [stripSearchParams({ rating: 'all', searchTerm: '' })],
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  return <PageTranslationRatingFeedback search={search} />;
}
