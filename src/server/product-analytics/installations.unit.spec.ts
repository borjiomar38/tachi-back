import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getInstallationOverview } from '@/server/product-analytics/installations';

const now = new Date('2026-09-08T12:00:00.000Z');

describe('installation overview', () => {
  const deviceCount = vi.fn();
  const deviceFindMany = vi.fn();
  const dbClient = {
    device: {
      count: deviceCount,
      findMany: deviceFindMany,
    },
  };

  beforeEach(() => {
    deviceCount.mockReset();
    deviceFindMany.mockReset();
  });

  it('counts first installation rows without treating later updates as installs', async () => {
    deviceCount
      .mockResolvedValueOnce(1284)
      .mockResolvedValueOnce(18)
      .mockResolvedValueOnce(127)
      .mockResolvedValueOnce(463);
    deviceFindMany.mockResolvedValue([
      {
        appVersion: '0.17.38',
        createdAt: new Date('2026-09-08T10:00:00.000Z'),
        id: 'device-1',
        installationId: 'android-installation-1',
        locale: 'fr-FR',
      },
    ]);

    const result = await getInstallationOverview({
      dbClient: dbClient as never,
      now,
    });

    expect(deviceCount.mock.calls).toEqual([
      [{ where: { createdAt: { lte: now } } }],
      [
        {
          where: {
            createdAt: {
              gte: new Date('2026-09-07T12:00:00.000Z'),
              lte: now,
            },
          },
        },
      ],
      [
        {
          where: {
            createdAt: {
              gte: new Date('2026-09-01T12:00:00.000Z'),
              lte: now,
            },
          },
        },
      ],
      [
        {
          where: {
            createdAt: {
              gte: new Date('2026-08-09T12:00:00.000Z'),
              lte: now,
            },
          },
        },
      ],
    ]);
    expect(deviceFindMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        appVersion: true,
        createdAt: true,
        id: true,
        installationId: true,
        locale: true,
      },
      take: 5,
      where: {
        createdAt: {
          lte: now,
        },
      },
    });
    expect(result).toEqual({
      counts: {
        last24Hours: 18,
        last30Days: 463,
        last7Days: 127,
        total: 1284,
      },
      generatedAt: now,
      recentFirstInstallations: [
        {
          appVersion: '0.17.38',
          firstInstalledAt: new Date('2026-09-08T10:00:00.000Z'),
          id: 'device-1',
          installationId: 'android-installation-1',
          locale: 'fr-FR',
        },
      ],
    });
  });
});
