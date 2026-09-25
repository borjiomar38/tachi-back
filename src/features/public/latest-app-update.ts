import latestAppUpdateData from '@/features/public/latest-app-update.json';
import { parseLatestPublicAppUpdate } from '@/features/public/latest-app-update-policy';

export const latestPublicAppUpdate =
  parseLatestPublicAppUpdate(latestAppUpdateData);
