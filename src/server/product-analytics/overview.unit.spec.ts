import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getFunnelOverview } from '@/server/product-analytics/overview';

const now = new Date('2026-07-31T12:00:00.000Z');

describe('product funnel overview', () => {
  const deviceFindMany = vi.fn();
  const freeTrialClaimFindMany = vi.fn();
  const funnelEventFindMany = vi.fn();
  const translationJobGroupBy = vi.fn();
  const dbClient = {
    device: {
      findMany: deviceFindMany,
    },
    freeTrialClaim: {
      findMany: freeTrialClaimFindMany,
    },
    funnelEvent: {
      findMany: funnelEventFindMany,
    },
    translationJob: {
      groupBy: translationJobGroupBy,
    },
  };

  beforeEach(() => {
    deviceFindMany.mockReset();
    freeTrialClaimFindMany.mockReset();
    funnelEventFindMany.mockReset();
    translationJobGroupBy.mockReset();
  });

  it('computes unique-device conversion for a recent installation cohort', async () => {
    deviceFindMany.mockResolvedValue([
      { id: 'device-1', installationId: 'installation-1' },
      { id: 'device-2', installationId: 'installation-2' },
      { id: 'device-3', installationId: 'installation-3' },
      { id: 'device-4', installationId: 'installation-4' },
    ]);
    freeTrialClaimFindMany.mockResolvedValue([
      { installationId: 'installation-1' },
      { installationId: 'installation-2' },
    ]);
    translationJobGroupBy.mockResolvedValue([
      { _count: { _all: 2 }, deviceId: 'device-1' },
      { _count: { _all: 1 }, deviceId: 'device-2' },
      { _count: { _all: 1 }, deviceId: 'device-3' },
    ]);
    funnelEventFindMany.mockResolvedValue([
      { deviceId: 'device-1', name: 'paywall_viewed' },
      { deviceId: 'device-1', name: 'paywall_subscribe_clicked' },
      { deviceId: 'device-2', name: 'paywall_viewed' },
      { deviceId: 'device-3', name: 'paywall_subscribe_clicked' },
    ]);

    const result = await getFunnelOverview(
      { days: 30 },
      {
        dbClient: dbClient as never,
        now,
      }
    );

    expect(result.counts).toEqual({
      firstTranslationDevices: 3,
      installs: 4,
      paywallSubscribeClickers: 2,
      paywallViewers: 2,
      secondTranslationDevices: 1,
      trials: 2,
    });
    expect(result.rates).toEqual({
      firstToSecondTranslation: 0.3333,
      installToTrial: 0.5,
      paywallViewToSubscribeClick: 0.5,
      trialToFirstTranslation: 1,
    });
    expect(result.period).toEqual({
      days: 30,
      from: '2026-07-01T12:00:00.000Z',
      generatedAt: now.toISOString(),
      to: now.toISOString(),
    });
  });

  it('returns an empty overview without running cohort detail queries', async () => {
    deviceFindMany.mockResolvedValue([]);

    const result = await getFunnelOverview(
      { days: 7 },
      {
        dbClient: dbClient as never,
        now,
      }
    );

    expect(result.counts.installs).toBe(0);
    expect(Object.values(result.rates)).toEqual([0, 0, 0, 0]);
    expect(freeTrialClaimFindMany).not.toHaveBeenCalled();
    expect(funnelEventFindMany).not.toHaveBeenCalled();
    expect(translationJobGroupBy).not.toHaveBeenCalled();
  });
});
