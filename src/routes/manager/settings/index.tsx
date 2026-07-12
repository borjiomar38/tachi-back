import { createFileRoute } from '@tanstack/react-router';

import { PageSettings } from '@/features/settings/manager/page-settings';

export const Route = createFileRoute('/manager/settings/')({
  component: PageSettings,
});
