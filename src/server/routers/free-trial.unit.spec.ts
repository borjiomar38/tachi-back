import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import freeTrialRouter from '@/server/routers/free-trial';
import {
  mockDb,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const now = new Date('2026-05-12T10:00:00.000Z');
const earlier = new Date('2026-05-11T10:00:00.000Z');

type FreeTrialClaimFixture = {
  createdAt: Date;
  deviceFingerprintHash: string | null;
  email: string;
  emailNormalized: string;
  id: string;
  identities: Array<{
    createdAt: Date;
    id: string;
    kind: string;
    value: string;
  }>;
  installationId: string;
  ipAddress: string | null;
  license: {
    id: string;
    jobs: Array<Record<string, unknown>>;
    key: string;
    ledgerEntries: Array<Record<string, unknown>>;
    orders: Array<Record<string, unknown>>;
    ownerEmail: string | null;
    status: string;
  };
  licenseId: string;
  redeemCode: {
    code: string;
    id: string;
    redeemedAt: Date | null;
    status: string;
  };
  redeemCodeId: string;
  tokenAmount: number;
  updatedAt: Date;
};

const baseClaim: FreeTrialClaimFixture = {
  createdAt: earlier,
  deviceFingerprintHash: 'fingerprint-hash-1234567890',
  email: 'reader@example.com',
  emailNormalized: 'reader@example.com',
  id: 'claim-1',
  identities: [
    {
      createdAt: earlier,
      id: 'identity-email-1',
      kind: 'email',
      value: 'reader@example.com',
    },
    {
      createdAt: earlier,
      id: 'identity-install-1',
      kind: 'installation',
      value: 'install-1',
    },
    {
      createdAt: earlier,
      id: 'identity-ip-1',
      kind: 'ip_address',
      value: '203.0.113.8',
    },
    {
      createdAt: earlier,
      id: 'identity-fingerprint-1',
      kind: 'device_fingerprint',
      value: 'fingerprint-hash-1234567890',
    },
  ],
  installationId: 'install-1',
  ipAddress: '203.0.113.8',
  license: {
    id: 'license-1',
    jobs: [],
    key: 'LIC-123',
    ledgerEntries: [],
    orders: [],
    ownerEmail: 'reader@example.com',
    status: 'active',
  },
  licenseId: 'license-1',
  redeemCode: {
    code: 'TB-FREE-1111',
    id: 'redeem-1',
    redeemedAt: now,
    status: 'redeemed',
  },
  redeemCodeId: 'redeem-1',
  tokenAmount: 100,
  updatedAt: now,
};

function buildClaim(overrides: Partial<FreeTrialClaimFixture> = {}) {
  return {
    ...baseClaim,
    ...overrides,
  };
}

describe('freeTrial router', () => {
  describe('list', () => {
    it('returns free-trial claims with token status and identity counts', async () => {
      const paidAt = new Date('2026-05-12T09:00:00.000Z');
      mockDb.freeTrialClaim.findMany.mockResolvedValue([
        buildClaim(),
        buildClaim({
          deviceFingerprintHash: null,
          email: 'buyer@example.com',
          emailNormalized: 'buyer@example.com',
          id: 'claim-2',
          identities: [
            {
              createdAt: earlier,
              id: 'identity-email-2',
              kind: 'email',
              value: 'buyer@example.com',
            },
            {
              createdAt: earlier,
              id: 'identity-install-2',
              kind: 'installation',
              value: 'install-2',
            },
          ],
          installationId: 'install-2',
          ipAddress: null,
          license: {
            id: 'license-2',
            jobs: [],
            key: 'LIC-456',
            ledgerEntries: [],
            orders: [
              {
                amountTotalCents: 200,
                billingPeriodEnd: null,
                currency: 'usd',
                id: 'order-1',
                paidAt,
                payerEmail: 'buyer@example.com',
                status: 'paid',
                tokenPack: {
                  name: 'Starter 50',
                },
              },
            ],
            ownerEmail: 'buyer@example.com',
            status: 'active',
          },
          licenseId: 'license-2',
          redeemCode: {
            code: 'TB-FREE-2222',
            id: 'redeem-2',
            redeemedAt: paidAt,
            status: 'redeemed',
          },
          redeemCodeId: 'redeem-2',
        }),
      ]);
      mockDb.appConfig.findUnique.mockResolvedValue({
        value: [
          {
            blockedAt: now.toISOString(),
            ipAddress: '203.0.113.8',
          },
        ],
      });
      mockDb.tokenLedger.groupBy.mockResolvedValue([
        {
          _sum: {
            deltaTokens: 90,
          },
          licenseId: 'license-1',
        },
        {
          _sum: {
            deltaTokens: 0,
          },
          licenseId: 'license-2',
        },
      ]);
      mockDb.device.findMany.mockResolvedValue([
        {
          id: 'device-1',
          installationId: 'install-1',
          lastIpAddress: '203.0.113.8',
          lastSeenAt: now,
          status: 'active',
        },
      ]);

      const result = await call(freeTrialRouter.list, {
        limit: 10,
        page: 1,
        query: '',
        status: 'all',
      });

      expect(result.stats).toEqual({
        active: 1,
        exhausted: 0,
        paidConverted: 1,
        total: 2,
        withFingerprint: 1,
        withIp: 1,
      });
      expect(result.items[0]).toMatchObject({
        availableTokens: 90,
        freeAccessIpBlocked: true,
        identityCounts: {
          deviceFingerprints: 1,
          emails: 1,
          installations: 1,
          ipAddresses: 1,
          total: 4,
        },
        spentTokens: 10,
        status: 'trial_active',
      });
      expect(result.items[1]).toMatchObject({
        availableTokens: 0,
        paidConversion: {
          amountTotalCents: 200,
          tokenPackName: 'Starter 50',
        },
        status: 'paid_converted',
      });
    });

    it('post-filters exhausted free trials after computing balances', async () => {
      mockDb.freeTrialClaim.findMany.mockResolvedValue([
        buildClaim({
          id: 'claim-exhausted',
          licenseId: 'license-exhausted',
        }),
        buildClaim({
          id: 'claim-active',
          licenseId: 'license-active',
        }),
      ]);
      mockDb.appConfig.findUnique.mockResolvedValue(null);
      mockDb.tokenLedger.groupBy.mockResolvedValue([
        {
          _sum: {
            deltaTokens: 0,
          },
          licenseId: 'license-exhausted',
        },
        {
          _sum: {
            deltaTokens: 50,
          },
          licenseId: 'license-active',
        },
      ]);
      mockDb.device.findMany.mockResolvedValue([]);

      const result = await call(freeTrialRouter.list, {
        limit: 10,
        page: 1,
        query: '',
        status: 'exhausted',
      });

      expect(result.total).toBe(1);
      expect(result.items[0]?.id).toBe('claim-exhausted');
      expect(result.items[0]?.status).toBe('exhausted');
    });

    it('requires device and license read permissions', async () => {
      mockDb.freeTrialClaim.findMany.mockResolvedValue([]);
      mockDb.appConfig.findUnique.mockResolvedValue(null);

      await call(freeTrialRouter.list, {
        limit: 10,
        page: 1,
        query: '',
        status: 'all',
      });

      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: {
            device: ['read'],
            license: ['read'],
          },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('getById', () => {
    it('returns free-trial detail with identities, network history, devices, ledger, and jobs', async () => {
      mockDb.freeTrialClaim.findUnique.mockResolvedValue(
        buildClaim({
          license: {
            id: 'license-1',
            jobs: [
              {
                completedAt: now,
                createdAt: earlier,
                id: 'job-1',
                pageCount: 12,
                spentTokens: 10,
                status: 'completed',
                targetLanguage: 'en',
              },
            ],
            key: 'LIC-123',
            ledgerEntries: [
              {
                createdAt: now,
                deltaTokens: -10,
                description: 'Chapter translation spend',
                id: 'ledger-1',
                status: 'posted',
                type: 'job_spend',
              },
            ],
            orders: [],
            ownerEmail: 'reader@example.com',
            status: 'active',
          },
        })
      );
      mockDb.appConfig.findUnique.mockResolvedValue(null);
      mockDb.tokenLedger.groupBy.mockResolvedValue([
        {
          _sum: {
            deltaTokens: 90,
          },
          licenseId: 'license-1',
        },
      ]);
      mockDb.device.findMany.mockResolvedValue([
        {
          id: 'device-1',
          installationId: 'install-1',
          lastIpAddress: '203.0.113.8',
          lastSeenAt: now,
          status: 'active',
        },
      ]);

      const result = await call(freeTrialRouter.getById, {
        claimId: 'claim-1',
      });

      expect(result.id).toBe('claim-1');
      expect(result.networkHistory).toEqual([
        expect.objectContaining({
          kind: 'ip_address',
          value: '203.0.113.8',
        }),
      ]);
      expect(result.relatedDevices).toEqual([
        expect.objectContaining({
          id: 'device-1',
          installationId: 'install-1',
        }),
      ]);
      expect(result.ledgerEntries).toEqual([
        expect.objectContaining({
          deltaTokens: -10,
          type: 'job_spend',
        }),
      ]);
      expect(result.recentJobs).toEqual([
        expect.objectContaining({
          id: 'job-1',
          status: 'completed',
        }),
      ]);
    });

    it('throws NOT_FOUND when the claim does not exist', async () => {
      mockDb.freeTrialClaim.findUnique.mockResolvedValue(null);
      mockDb.appConfig.findUnique.mockResolvedValue(null);

      await expect(
        call(freeTrialRouter.getById, {
          claimId: 'missing-claim',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });
});
