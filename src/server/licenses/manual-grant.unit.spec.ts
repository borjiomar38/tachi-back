import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockLogger } = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
  },
  mockLogger: {
    info: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

import { createManualLicenseGrant } from '@/server/licenses/manual-grant';

describe('manual license grant', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
    mockLogger.info.mockReset();
  });

  it('creates a pending license with redeem code and manual credit', async () => {
    const now = new Date('2026-03-19T22:00:00.000Z');
    const tx = {
      license: {
        create: vi.fn().mockResolvedValue({
          createdAt: now,
          deviceLimit: 2,
          id: 'license-1',
          key: 'license-key-1',
        }),
      },
      redeemCode: {
        create: vi.fn().mockResolvedValue({
          code: 'TB-AAAA-BBBB-CCCC',
        }),
      },
      tokenLedger: {
        create: vi.fn().mockResolvedValue({
          id: 'ledger-1',
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await createManualLicenseGrant(
      {
        deviceLimit: 2,
        notes: 'Support test grant',
        ownerEmail: 'reader@example.com',
        tokenAmount: 5000,
      },
      {
        createdByUserId: 'user-admin-1',
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    expect(result.licenseId).toBe('license-1');
    expect(result.tokenAmount).toBe(5000);
    expect(tx.tokenLedger.create).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalledOnce();
  });
});
