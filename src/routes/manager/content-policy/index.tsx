import { createFileRoute } from '@tanstack/react-router';

import { PageContentPolicy } from '@/features/content-policy/manager/page-content-policy';

export const Route = createFileRoute('/manager/content-policy/')({
  component: PageContentPolicy,
});
