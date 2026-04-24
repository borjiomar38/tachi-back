import { createFileRoute } from '@tanstack/react-router';

import { PageChapter } from '@/features/chapter/manager/page-chapter';

export const Route = createFileRoute('/manager/chapters/$cacheKey/')({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  return <PageChapter params={params} />;
}
