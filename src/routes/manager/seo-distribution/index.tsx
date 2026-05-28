import { createFileRoute } from '@tanstack/react-router';

import { PageSeoDistribution } from '@/features/seo-distribution/manager/page-seo-distribution';

export const Route = createFileRoute('/manager/seo-distribution/')({
  component: PageSeoDistribution,
});
