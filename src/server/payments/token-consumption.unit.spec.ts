import { beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({
  JOB_TOKENS_PER_CHAPTER: 10,
  LEMONSQUEEZY_ENABLED: false,
}));
vi.mock('@/env/server', () => ({ envServer: settings }));
vi.mock('@/server/db', () => ({
  db: { tokenPack: { findMany: vi.fn().mockResolvedValue([]) } },
}));
vi.mock('@/server/licenses/free-trial-settings', () => ({
  getFreeTrialRuntimeConfig: vi
    .fn()
    .mockResolvedValue({ current: { enabled: true, tokenAmount: 25 } }),
}));

import { getTokenCatalog } from '@/server/payments/token-catalog';
import { getTokenConsumption } from '@/server/payments/token-consumption';
import { getAdvancedSearchTokenCost } from '@/server/source-discovery/token-cost-policy';

describe('public token consumption', () => {
  beforeEach(() => {
    settings.JOB_TOKENS_PER_CHAPTER = 10;
  });

  it('publishes only standard translation and advanced search, using billing values', () => {
    expect(getTokenConsumption()).toEqual({
      variesByMode: false,
      chapterModes: [{ key: 'standard', name: 'Standard', tokenCost: 10 }],
      advancedSearch: { tokenCost: getAdvancedSearchTokenCost() },
    });
    expect(getAdvancedSearchTokenCost()).toBe(5);
  });

  it('the mobile catalog follows server configuration without frontend defaults', async () => {
    settings.JOB_TOKENS_PER_CHAPTER = 17;
    const catalog = await getTokenCatalog();
    expect(catalog.consumption).toEqual(getTokenConsumption());
    expect(catalog.consumption.chapterModes[0]?.tokenCost).toBe(17);
  });
});
