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

import { revokeDeviceActivation } from '@/server/licenses/revoke-device';

describe('device revoke activation', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
  });

  it('revokes the device and active bindings', async () => {
    const now = new Date('2026-03-19T22:15:00.000Z');
    const tx = {
      device: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'device-1',
          installationId: 'install-1234567890abcd',
          metadata: null,
          status: 'active',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'device-1',
          installationId: 'install-1234567890abcd',
          status: 'revoked',
        }),
      },
      licenseDevice: {
        updateMany: vi.fn().mockResolvedValue({
          count: 1,
        }),
      },
      mobileSession: {
        updateMany: vi.fn().mockResolvedValue({
          count: 1,
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await revokeDeviceActivation(
      {
        deviceId: 'device-1',
        reason: 'Support reset',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.status).toBe('revoked');
    expect(tx.licenseDevice.updateMany).toHaveBeenCalledOnce();
    expect(tx.mobileSession.updateMany).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalledOnce();
  });
});
