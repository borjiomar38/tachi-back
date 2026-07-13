import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

import {
  assertFreeTrialDeliveryCompatible,
  checkFreeTrialEligibility,
  createFreeTrialRedeemCode,
} from '@/server/licenses/free-trial';

describe('free trial delivery compatibility', () => {
  it('allows a capable client to use configured email delivery', () => {
    expect(() =>
      assertFreeTrialDeliveryCompatible({
        appBuild: '40',
        deliveryMode: 'email_code',
      })
    ).not.toThrow();
  });

  it('requires an update when an old client resumes an email verification', () => {
    expect(() =>
      assertFreeTrialDeliveryCompatible({
        appBuild: '39',
        deliveryMode: 'email_code',
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'client_update_required',
        statusCode: 426,
      })
    );
    expect(() =>
      assertFreeTrialDeliveryCompatible({
        deliveryMode: 'email_code',
      })
    ).toThrowError(expect.objectContaining({ statusCode: 426 }));
  });

  it('rejects a spoofed old build before creating pending trial state', async () => {
    const dbClient = {
      $transaction: vi.fn(),
      appConfig: {
        findUnique: vi.fn().mockResolvedValue({
          updatedAt: new Date('2026-07-13T10:00:00.000Z'),
          value: {
            deliveryMode: 'email_code',
            emailRiskReviewEnabled: false,
            enabled: true,
            tokenAmount: 25,
          },
        }),
      },
    };

    await expect(
      createFreeTrialRedeemCode(
        {
          appBuild: '39',
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          email: 'reader@example.com',
          installationId: 'install-1234567890abcd',
          platform: 'android',
        },
        {
          clientIp: '203.0.113.10',
          dbClient: dbClient as never,
        }
      )
    ).rejects.toMatchObject({
      code: 'client_update_required',
      statusCode: 426,
    });
    expect(dbClient.$transaction).not.toHaveBeenCalled();
  });
});

describe('free trial redeem creation', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
  });

  it('stores a temporary verification without consuming the free trial', async () => {
    const now = new Date('2026-05-11T10:00:00.000Z');
    const tx = {
      freeTrialClaim: {
        create: vi.fn().mockResolvedValue({ id: 'claim-1' }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialVerification: {
        create: vi.fn().mockResolvedValue({ id: 'verification-1' }),
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
    expect(result.claimId).toBeNull();
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
    expect(tx.freeTrialVerification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          deliveryMode: 'direct',
          email: 'Reader@Example.com',
          emailNormalized: 'reader@example.com',
          expiresAt: new Date('2026-05-11T10:30:00.000Z'),
          installationId: 'install-1234567890abcd',
          ipAddress: '203.0.113.10',
          licenseId: 'license-1',
          redeemCodeId: 'redeem-1',
          tokenAmount: 25,
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
    expect(tx.redeemCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: new Date('2026-05-11T10:30:00.000Z'),
          metadata: expect.objectContaining({
            ipAddress: '203.0.113.10',
            deviceFingerprintHash:
              '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            source: 'free_trial',
          }),
        }),
      })
    );
    expect(tx.freeTrialClaim.create).not.toHaveBeenCalled();
    expect(tx.freeTrialIdentity.createMany).not.toHaveBeenCalled();
    expect(tx.tokenLedger.create).not.toHaveBeenCalled();
  });

  it('reuses an unexpired code when the same device retries the same email', async () => {
    const now = new Date('2026-05-11T10:05:00.000Z');
    const tx = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialIdentity: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialVerification: {
        findFirst: vi.fn().mockResolvedValue({
          canceledAt: null,
          consumedAt: null,
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          deliveryMode: 'email_code',
          emailNormalized: 'reader@example.com',
          expiresAt: new Date('2026-05-11T10:30:00.000Z'),
          id: 'verification-1',
          installationId: 'install-1234567890abcd',
          licenseId: 'license-1',
          redeemCode: {
            code: 'TB-FREE-1111-2222',
            expiresAt: new Date('2026-05-11T10:30:00.000Z'),
            id: 'redeem-1',
            status: 'available',
          },
          tokenAmount: 20,
        }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await createFreeTrialRedeemCode(
      {
        appBuild: '40',
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        email: 'reader@example.com',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: mockDb as never,
        now,
      }
    );

    expect(result).toMatchObject({
      claimId: null,
      deliveryMode: 'email_code',
      licenseId: 'license-1',
      redeemCode: 'TB-FREE-1111-2222',
      tokenAmount: 20,
    });
  });

  it('cancels the old code and rotates it when the email is corrected', async () => {
    const now = new Date('2026-05-11T10:05:00.000Z');
    const tx = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialIdentity: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialVerification: {
        findFirst: vi.fn().mockResolvedValue({
          canceledAt: null,
          consumedAt: null,
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          deliveryMode: 'email_code',
          emailNormalized: 'wrong@example.com',
          expiresAt: new Date('2026-05-11T10:30:00.000Z'),
          id: 'verification-1',
          installationId: 'install-1234567890abcd',
          licenseId: 'license-1',
          redeemCode: {
            code: 'TB-FREE-OLD1-2222',
            expiresAt: new Date('2026-05-11T10:30:00.000Z'),
            id: 'redeem-old',
            status: 'available',
          },
          tokenAmount: 20,
        }),
        update: vi.fn().mockResolvedValue({ id: 'verification-1' }),
      },
      license: {
        update: vi.fn().mockResolvedValue({ id: 'license-1' }),
      },
      redeemCode: {
        create: vi.fn().mockResolvedValue({
          code: 'TB-FREE-NEW1-2222',
          id: 'redeem-new',
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await createFreeTrialRedeemCode(
      {
        appBuild: '40',
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        email: 'correct@example.com',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: mockDb as never,
        now,
      }
    );

    expect(result).toMatchObject({
      deliveryMode: 'email_code',
      redeemCode: 'TB-FREE-NEW1-2222',
      tokenAmount: 20,
    });
    expect(tx.redeemCode.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'redeem-old',
        status: 'available',
      },
      data: {
        status: 'canceled',
      },
    });
    expect(tx.license.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ownerEmail: 'correct@example.com' },
      })
    );
    expect(tx.freeTrialVerification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'correct@example.com',
          emailNormalized: 'correct@example.com',
          redeemCodeId: 'redeem-new',
          tokenAmount: 20,
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
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
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

  it('returns the generic free-access block when the device fingerprint is missing', async () => {
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
    expect(mockDb.$transaction).not.toHaveBeenCalled();
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

  it('binds a legacy existing claim to the first matching device fingerprint', async () => {
    const tx = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue({
          deviceFingerprintHash: null,
          emailNormalized: 'reader@example.com',
          id: 'claim-legacy',
          installationId: 'install-1234567890abcd',
          ipAddress: null,
          licenseId: 'license-legacy',
          redeemCode: {
            code: 'TB-FREE-AAAA-BBBB',
          },
          tokenAmount: 100,
        }),
        update: vi.fn().mockResolvedValue({ id: 'claim-legacy' }),
      },
      freeTrialIdentity: {
        createMany: vi.fn().mockResolvedValue({ count: 4 }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    mockDb.$transaction.mockImplementation((callback) => callback(tx));

    const result = await createFreeTrialRedeemCode(
      {
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        email: 'reader@example.com',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.30',
        dbClient: mockDb as never,
        now: new Date('2026-05-12T10:00:00.000Z'),
      }
    );

    expect(result).toEqual({
      claimId: 'claim-legacy',
      deliveryMode: 'direct',
      emailRiskReviewEnabled: false,
      licenseId: 'license-legacy',
      redeemCode: 'TB-FREE-AAAA-BBBB',
      tokenAmount: 100,
    });
    expect(tx.freeTrialClaim.update).toHaveBeenCalledWith({
      where: {
        id: 'claim-legacy',
      },
      data: {
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      },
      select: {
        id: true,
      },
    });
  });

  it('rejects an existing claim retry with a different device fingerprint', async () => {
    const tx = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue({
          deviceFingerprintHash:
            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          emailNormalized: 'reader@example.com',
          id: 'claim-1',
          installationId: 'install-1234567890abcd',
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
          clientIp: '203.0.113.31',
          dbClient: mockDb as never,
          now: new Date('2026-05-12T10:05:00.000Z'),
        }
      )
    ).rejects.toMatchObject({
      code: 'free_access_unavailable',
      statusCode: 402,
    });
  });
});

describe('free trial eligibility', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
  });

  it('allows the email form when installation, IP, and fingerprint are unused', async () => {
    const dbClient = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialIdentity: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await checkFreeTrialEligibility(
      {
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: dbClient as never,
      }
    );

    expect(result).toEqual({
      eligible: true,
    });
    expect(dbClient.freeTrialClaim.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
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
  });

  it('keeps the email form available while a code is only pending verification', async () => {
    const dbClient = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialIdentity: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      freeTrialVerification: {
        findFirst: vi.fn().mockResolvedValue({ id: 'verification-1' }),
      },
    };

    const result = await checkFreeTrialEligibility(
      {
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: dbClient as never,
      }
    );

    expect(result).toEqual({ eligible: true });
    expect(dbClient.freeTrialVerification.findFirst).not.toHaveBeenCalled();
  });

  it('hides the email form when the current identity already used a free trial', async () => {
    const dbClient = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue({
          deviceFingerprintHash:
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          id: 'claim-1',
          installationId: 'install-1234567890abcd',
          ipAddress: '203.0.113.10',
        }),
      },
      freeTrialIdentity: {
        findFirst: vi.fn(),
      },
    };

    const result = await checkFreeTrialEligibility(
      {
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: dbClient as never,
      }
    );

    expect(result).toEqual({
      eligible: false,
      reasonCode: 'free_trial_device_used',
    });
    expect(dbClient.freeTrialIdentity.findFirst).not.toHaveBeenCalled();
  });

  it('explains when free trial eligibility is blocked by IP identity', async () => {
    const dbClient = {
      freeTrialClaim: {
        findFirst: vi.fn().mockResolvedValue({
          deviceFingerprintHash:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          id: 'claim-1',
          installationId: 'install-other-1234567890',
          ipAddress: '203.0.113.10',
        }),
      },
      freeTrialIdentity: {
        findFirst: vi.fn(),
      },
    };

    const result = await checkFreeTrialEligibility(
      {
        deviceFingerprintHash:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: dbClient as never,
      }
    );

    expect(result).toEqual({
      eligible: false,
      reasonCode: 'free_access_ip_blocked',
    });
  });

  it('hides the email form when the fingerprint is missing', async () => {
    const dbClient = {
      freeTrialClaim: {
        findFirst: vi.fn(),
      },
      freeTrialIdentity: {
        findFirst: vi.fn(),
      },
    };

    const result = await checkFreeTrialEligibility(
      {
        installationId: 'install-1234567890abcd',
        platform: 'android',
      },
      {
        clientIp: '203.0.113.10',
        dbClient: dbClient as never,
      }
    );

    expect(result).toEqual({
      eligible: false,
      reasonCode: 'free_trial_unavailable',
    });
    expect(dbClient.freeTrialClaim.findFirst).not.toHaveBeenCalled();
    expect(dbClient.freeTrialIdentity.findFirst).not.toHaveBeenCalled();
  });
});
