import { envServer } from '@/env/server';
import { getAdvancedSearchTokenCost } from '@/server/source-discovery/token-cost-policy';

// Publish only available operations and use the same values as their billing.
export const getTokenConsumption = () => ({
  variesByMode: false,
  chapterModes: [
    {
      key: 'standard',
      name: 'Standard',
      tokenCost: envServer.JOB_TOKENS_PER_CHAPTER,
    },
  ],
  advancedSearch: { tokenCost: getAdvancedSearchTokenCost() },
});
