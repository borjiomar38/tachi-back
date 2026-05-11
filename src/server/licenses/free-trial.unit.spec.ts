import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

import { createFreeTrialRedeemCode } from '@/server/licenses/free-trial';

describe('free trial redeem creation', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
  });

  it('stores the claiming IP address with the free trial claim', async () => {
    const now = new Date('2026-05-11T10:00:00.000Z');
    const tx = {
      freeTrialClaim: {
        create: vi.fn().mockResolvedValue({ id: 'claim-1' }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialIdentity: {
        createMany: vi.fn().mockResolvedValue({ count: 4 }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      license: {
        create: vi.fn().mockResolvedValue({ id: 'license-1' }),
      },
      redeemCode: {
        create: vi.fn().mockResolvedValue({
          code: 'TB-FREE-1111-2222',
          id: 'redeem-1',
        }),
      },
      tokenLedger: {
        create: vi.fn().mockResolvedValue({ id: 'ledger-1' }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await createFreeTrialRedeemCode(
      {
        email: 'Reader@Example.com',
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: mockDb as never,
        now,
      }
    );

    expect(result.redeemCode).toBe('TB-FREE-1111-2222');
    expect(tx.freeTrialClaim.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { emailNormalized: 'reader@example.com' },
            { installationId: 'install-1234567890abcd' },
            { ipAddress: '203.0.113.10' },
            {
              deviceFingerprintHash:
                '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            },
          ]),
        }),
      })
    );
    expect(tx.freeTrialClaim.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          ipAddress: '203.0.113.10',
        }),
      })
    );
    expect(tx.freeTrialIdentity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { kind: 'email', value: 'reader@example.com' },
            { kind: 'installation', value: 'install-1234567890abcd' },
            { kind: 'ip_address', value: '203.0.113.10' },
            {
              kind: 'device_fingerprint',
              value:
                '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            },
          ]),
        }),
      })
    );
    expect(tx.freeTrialIdentity.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { claimId: 'claim-1', kind: 'email', value: 'reader@example.com' },
        {
          claimId: 'claim-1',
          kind: 'installation',
          value: 'install-1234567890abcd',
        },
        { claimId: 'claim-1', kind: 'ip_address', value: '203.0.113.10' },
        {
          claimId: 'claim-1',
          kind: 'device_fingerprint',
          value:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
      ]),
    });
    expect(tx.redeemCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            ipAddress: '203.0.113.10',
            deviceFingerprintHash:
              '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            source: 'free_trial',
          }),
        }),
      })
    );
  });

  it('returns the generic free-access block when the IP has already claimed', async () => {
    const tx = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue({
          emailNormalized: 'other@example.com',
          installationId: 'install-other-123456',
          ipAddress: '203.0.113.10',
          redeemCode: {
            code: 'TB-FREE-AAAA-BBBB',
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      createFreeTrialRedeemCode(
        {
          email: 'reader@example.com',
          installationId: 'install-1234567890abcd',
          platform: 'android',
        },
        {
          clientIp: '203.0.113.10',
          dbClient: mockDb as never,
          now: new Date('2026-05-11T10:00:00.000Z'),
        }
      )
    ).rejects.toMatchObject({
      code: 'free_access_unavailable',
      statusCode: 402,
    });
  });

  it('returns the generic free-access block when the device fingerprint has already claimed', async () => {
    const tx = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue({
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          emailNormalized: 'other@example.com',
          installationId: 'install-other-123456',
          ipAddress: null,
          redeemCode: {
            code: 'TB-FREE-AAAA-BBBB',
          },
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    await expect(
      createFreeTrialRedeemCode(
        {
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          email: 'reader@example.com',
          installationId: 'install-1234567890abcd',
          platform: 'android',
        },
        {
          clientIp: '203.0.113.20',
          dbClient: mockDb as never,
          now: new Date('2026-05-12T10:00:00.000Z'),
        }
      )
    ).rejects.toMatchObject({
      code: 'free_access_unavailable',
      statusCode: 402,
    });
  });
});
