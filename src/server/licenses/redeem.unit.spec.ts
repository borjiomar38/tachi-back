import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockLogger } = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
  },
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

import { redeemLicenseToDevice } from '@/server/licenses/redeem';

describe('license redeem activation', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
  });

  it('binds an available redeem code to a new installation', async () => {
    const now = new Date('2026-03-19T21:00:00.000Z');
    const tx = {
      device: {
        create: vi.fn().mockResolvedValue({
          appBuild: '100',
          appVersion: '1.0.0',
          id: 'device-1',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: 'en',
          platform: 'android',
          status: 'active',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      license: {
        update: vi.fn().mockResolvedValue({
          activatedAt: now,
          deviceLimit: 1,
          id: 'license-1',
          key: 'license-key-1',
          status: 'active',
        }),
      },
      licenseDevice: {
        count: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
        create: vi.fn().mockResolvedValue({
          boundAt: now,
          id: 'binding-1',
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-1',
          license: {
            activatedAt: null,
            deviceLimit: 1,
            id: 'license-1',
            key: 'license-key-1',
            status: 'pending',
          },
          metadata: null,
          redeemedAt: null,
          redeemedByDevice: null,
          redeemedByDeviceId: null,
          status: 'available',
        }),
        update: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          redeemedAt: now,
          status: 'redeemed',
        }),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 2750,
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await redeemLicenseToDevice(
      {
        appBuild: '100',
        appVersion: '1.0.0',
        installationId: 'install-1234567890abcd',
        locale: 'en',
        platform: 'android',
        redeemCode: 'tb aaaa bbbb cccc',
      },
      {
        clientIp: '127.0.0.1',
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.activationStatus).toBe('activated');
    expect(result.license.availableTokens).toBe(2750);
    expect(result.device.installationId).toBe('install-1234567890abcd');
    expect(tx.licenseDevice.create).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalledOnce();
  });

  it('treats a retry from the same installation as idempotent', async () => {
    const now = new Date('2026-03-19T21:10:00.000Z');
    const tx = {
      device: {
        findUnique: vi.fn().mockResolvedValue({
          appBuild: '100',
          appVersion: '1.0.0',
          id: 'device-1',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: 'en',
          metadata: null,
          platform: 'android',
          status: 'active',
        }),
        update: vi.fn().mockResolvedValue({
          appBuild: '100',
          appVersion: '1.0.0',
          id: 'device-1',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: 'en',
          platform: 'android',
          status: 'active',
        }),
      },
      license: {
        update: vi.fn().mockResolvedValue({
          activatedAt: now,
          deviceLimit: 1,
          id: 'license-1',
          key: 'license-key-1',
          status: 'active',
        }),
      },
      licenseDevice: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({
          boundAt: now,
          id: 'binding-1',
          status: 'active',
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        update: vi.fn().mockResolvedValue({
          boundAt: now,
          id: 'binding-1',
        }),
      },
      mobileSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-1',
          license: {
            activatedAt: now,
            deviceLimit: 1,
            id: 'license-1',
            key: 'license-key-1',
            status: 'active',
          },
          metadata: null,
          redeemedAt: now,
          redeemedByDevice: {
            id: 'device-1',
            installationId: 'install-1234567890abcd',
            status: 'active',
          },
          redeemedByDeviceId: 'device-1',
          status: 'redeemed',
        }),
        update: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          redeemedAt: now,
          status: 'redeemed',
        }),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 2750,
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await redeemLicenseToDevice(
      {
        appBuild: '100',
        appVersion: '1.0.0',
        installationId: 'install-1234567890abcd',
        locale: 'en',
        platform: 'android',
        redeemCode: 'TB-AAAA-BBBB-CCCC',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.activationStatus).toBe('already_activated');
    expect(tx.licenseDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          licenseId: {
            not: 'license-1',
          },
        }),
      })
    );
    expect(tx.licenseDevice.update).toHaveBeenCalledOnce();
  });

  it('replaces a different active license binding only for the same installation', async () => {
    const now = new Date('2026-03-19T21:15:00.000Z');
    const tx = {
      device: {
        findUnique: vi.fn().mockResolvedValue({
          appBuild: '100',
          appVersion: '1.0.0',
          id: 'device-1',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: 'en',
          metadata: null,
          platform: 'android',
          status: 'active',
        }),
        update: vi.fn().mockResolvedValue({
          appBuild: '101',
          appVersion: '1.0.1',
          id: 'device-1',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: 'en',
          platform: 'android',
          status: 'active',
        }),
      },
      license: {
        update: vi.fn().mockResolvedValue({
          activatedAt: now,
          deviceLimit: 1,
          id: 'license-new',
          key: 'license-key-new',
          status: 'active',
        }),
      },
      licenseDevice: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({
          boundAt: now,
          id: 'binding-new',
        }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'binding-old',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      mobileSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue({
          code: 'TB-NEWC-ODE1-2345',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-new',
          license: {
            activatedAt: null,
            deviceLimit: 1,
            id: 'license-new',
            key: 'license-key-new',
            status: 'pending',
          },
          metadata: null,
          redeemedAt: null,
          redeemedByDevice: null,
          redeemedByDeviceId: null,
          status: 'available',
        }),
        update: vi.fn().mockResolvedValue({
          code: 'TB-NEWC-ODE1-2345',
          redeemedAt: now,
          status: 'redeemed',
        }),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 500,
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await redeemLicenseToDevice(
      {
        appBuild: '101',
        appVersion: '1.0.1',
        installationId: 'install-1234567890abcd',
        locale: 'en',
        platform: 'android',
        redeemCode: 'TB-NEWC-ODE1-2345',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.activationStatus).toBe('activated');
    expect(tx.licenseDevice.updateMany).toHaveBeenCalledWith({
      where: {
        deviceId: 'device-1',
        licenseId: {
          not: 'license-new',
        },
        status: 'active',
      },
      data: {
        status: 'released',
        unboundAt: now,
      },
    });
    expect(tx.mobileSession.updateMany).toHaveBeenCalledWith({
      where: {
        deviceId: 'device-1',
        licenseId: {
          not: 'license-new',
        },
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revokeReason: 'redeem_replaced',
      },
    });
    expect(tx.licenseDevice.create).toHaveBeenCalledOnce();
  });

  it('allows a non-expired redeemed code on another installation', async () => {
    const now = new Date('2026-03-19T21:20:00.000Z');
    const tx = {
      device: {
        create: vi.fn().mockResolvedValue({
          appBuild: null,
          appVersion: null,
          id: 'device-2',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: null,
          platform: 'android',
          status: 'active',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      license: {
        update: vi.fn().mockResolvedValue({
          activatedAt: now,
          deviceLimit: 1,
          id: 'license-1',
          key: 'license-key-1',
          status: 'active',
        }),
      },
      licenseDevice: {
        count: vi.fn().mockResolvedValue(2),
        create: vi.fn().mockResolvedValue({
          boundAt: now,
          id: 'binding-2',
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-1',
          license: {
            activatedAt: now,
            deviceLimit: 1,
            id: 'license-1',
            key: 'license-key-1',
            status: 'active',
          },
          metadata: null,
          redeemedAt: now,
          redeemedByDevice: {
            id: 'device-1',
            installationId: 'install-other-123456',
            status: 'active',
          },
          redeemedByDeviceId: 'device-1',
          status: 'redeemed',
        }),
        update: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          redeemedAt: now,
          status: 'redeemed',
        }),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 2750,
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await redeemLicenseToDevice(
      {
        installationId: 'install-1234567890abcd',
        platform: 'android',
        redeemCode: 'TB-AAAA-BBBB-CCCC',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.activationStatus).toBe('activated');
    expect(result.device.id).toBe('device-2');
    expect(tx.licenseDevice.create).toHaveBeenCalledOnce();
    expect(tx.redeemCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          redeemedByDeviceId: 'device-2',
          status: 'redeemed',
        }),
      })
    );
  });

  it('does not block activation when the old license device limit is reached', async () => {
    const now = new Date('2026-03-19T21:30:00.000Z');
    const tx = {
      device: {
        create: vi.fn().mockResolvedValue({
          appBuild: null,
          appVersion: null,
          id: 'device-2',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: null,
          platform: 'android',
          status: 'active',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      licenseDevice: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({
          boundAt: now,
          id: 'binding-2',
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      license: {
        update: vi.fn().mockResolvedValue({
          activatedAt: now,
          deviceLimit: 1,
          id: 'license-1',
          key: 'license-key-1',
          status: 'active',
        }),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-1',
          license: {
            activatedAt: null,
            deviceLimit: 1,
            id: 'license-1',
            key: 'license-key-1',
            status: 'pending',
          },
          metadata: null,
          redeemedAt: null,
          redeemedByDevice: null,
          redeemedByDeviceId: null,
          status: 'available',
        }),
        update: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          redeemedAt: now,
          status: 'redeemed',
        }),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 2750,
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await redeemLicenseToDevice(
      {
        installationId: 'install-1234567890abcd',
        platform: 'android',
        redeemCode: 'TB-AAAA-BBBB-CCCC',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.activationStatus).toBe('activated');
    expect(result.license.deviceLimit).toBe(1);
    expect(tx.licenseDevice.create).toHaveBeenCalledOnce();
  });

  it('treats deviceLimit=0 as unlimited', async () => {
    const now = new Date('2026-03-19T21:40:00.000Z');
    const tx = {
      device: {
        create: vi.fn().mockResolvedValue({
          appBuild: null,
          appVersion: null,
          id: 'device-3',
          installationId: 'install-1234567890abcd',
          lastSeenAt: now,
          locale: null,
          platform: 'android',
          status: 'active',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      license: {
        update: vi.fn().mockResolvedValue({
          activatedAt: now,
          deviceLimit: 0,
          id: 'license-1',
          key: 'license-key-1',
          status: 'active',
        }),
      },
      licenseDevice: {
        count: vi.fn().mockResolvedValueOnce(25).mockResolvedValueOnce(26),
        create: vi.fn().mockResolvedValue({
          boundAt: now,
          id: 'binding-3',
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      redeemCode: {
        findUnique: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-1',
          license: {
            activatedAt: null,
            deviceLimit: 0,
            id: 'license-1',
            key: 'license-key-1',
            status: 'pending',
          },
          metadata: null,
          redeemedAt: null,
          redeemedByDevice: null,
          redeemedByDeviceId: null,
          status: 'available',
        }),
        update: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
          redeemedAt: now,
          status: 'redeemed',
        }),
      },
      tokenLedger: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: {
            deltaTokens: 2750,
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await redeemLicenseToDevice(
      {
        installationId: 'install-1234567890abcd',
        platform: 'android',
        redeemCode: 'TB-AAAA-BBBB-CCCC',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.activationStatus).toBe('activated');
    expect(result.license.deviceLimit).toBe(0);
    expect(tx.licenseDevice.create).toHaveBeenCalledOnce();
  });
});
