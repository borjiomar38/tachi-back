import { describe, expect, it, vi } from 'vitest';

import {
  getFreeTrialRuntimeConfig,
  updateFreeTrialRuntimeConfig,
} from '@/server/licenses/free-trial-settings';

describe('free trial runtime config', () => {
  it('uses a 25-token direct trial by default', async () => {
    const dbClient = {
      appConfig: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await getFreeTrialRuntimeConfig({
      dbClient: dbClient as never,
    });

    expect(result).toEqual({
      current: {
        deliveryMode: 'direct',
        emailRiskReviewEnabled: false,
        enabled: true,
        tokenAmount: 25,
      },
      updatedAt: null,
    });
  });

  it('persists a dynamic token amount with the delivery controls', async () => {
    const updatedAt = new Date('2026-07-13T01:00:00.000Z');
    const current = {
      deliveryMode: 'email_code' as const,
      emailRiskReviewEnabled: true,
      enabled: true,
      tokenAmount: 40,
    };
    const dbClient = {
      appConfig: {
        upsert: vi.fn().mockResolvedValue({
          updatedAt,
          value: current,
        }),
      },
    };

    const result = await updateFreeTrialRuntimeConfig(current, {
      dbClient: dbClient as never,
    });

    expect(result).toEqual({ current, updatedAt });
    expect(dbClient.appConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ value: current }),
        update: { value: current },
      })
    );
  });
});
