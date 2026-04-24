import { call } from '@orpc/server';
import { describe, expect, it, type Mock, vi } from 'vitest';

import licenseRouter from '@/server/routers/license';
import {
  mockDb,
  mockGetSession,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const now = new Date('2026-03-19T20:00:00.000Z');

describe('license router', () => {
  describe('searchSupport', () => {
    it('returns mixed support lookup results and deduplicates entities', async () => {
      mockDb.license.findMany.mockResolvedValue([
        {
          _count: {
            devices: 2,
          },
          key: 'LIC-123',
          ownerEmail: 'customer@example.com',
          status: 'active',
        },
      ]);
      mockDb.redeemCode.findMany.mockResolvedValue([
        {
          code: 'RED-123',
          createdAt: now,
          license: {
            key: 'LIC-123',
            ownerEmail: 'customer@example.com',
          },
          redeemedAt: null,
          status: 'available',
        },
      ]);
      mockDb.device.findMany.mockResolvedValue([
        {
          id: 'device-1',
          installationId: 'install-123',
          lastSeenAt: now,
          licenseBindings: [
            {
              license: {
                key: 'LIC-123',
              },
              status: 'active',
            },
          ],
          status: 'active',
        },
      ]);
      mockDb.order.findMany.mockResolvedValue([
        {
          amountTotalCents: 999,
          currency: 'usd',
          id: 'order-1',
          license: {
            key: 'LIC-123',
          },
          paidAt: now,
          payerEmail: 'customer@example.com',
          status: 'paid',
          lsOrderId: 'ls-order-123',
          lsSubscriptionId: 'ls-sub-999',
        },
      ]);

      const result = await call(licenseRouter.searchSupport, {
        query: '123',
      });

      expect(result).toEqual([
        {
          activeDeviceCount: 2,
          entityType: 'license',
          key: 'LIC-123',
          matchedOn: 'license_key',
          matchedValue: 'LIC-123',
          ownerEmail: 'customer@example.com',
          status: 'active',
        },
        {
          code: 'RED-123',
          entityType: 'redeem_code',
          key: 'LIC-123',
          matchedOn: 'redeem_code',
          matchedValue: 'RED-123',
          ownerEmail: 'customer@example.com',
          redeemedAt: null,
          status: 'available',
        },
        {
          deviceId: 'device-1',
          entityType: 'device',
          installationId: 'install-123',
          key: 'LIC-123',
          lastSeenAt: now,
          matchedOn: 'installation_id',
          matchedValue: 'install-123',
          status: 'active',
        },
        {
          amountTotalCents: 999,
          currency: 'usd',
          entityType: 'order',
          id: 'order-1',
          key: 'LIC-123',
          matchedOn: 'ls_order_id',
          matchedValue: 'ls-order-123',
          paidAt: now,
          payerEmail: 'customer@example.com',
          status: 'paid',
        },
      ]);
    });

    it('requires combined support lookup permissions', async () => {
      mockDb.license.findMany.mockResolvedValue([]);
      mockDb.redeemCode.findMany.mockResolvedValue([]);
      mockDb.device.findMany.mockResolvedValue([]);
      mockDb.order.findMany.mockResolvedValue([]);

      await call(licenseRouter.searchSupport, {
        query: 'ab',
      });

      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: {
            device: ['read'],
            license: ['read'],
            order: ['read'],
          },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('listRedeemCodes', () => {
    it('returns redeem codes with token consumption details', async () => {
      mockDb.redeemCode.findMany.mockResolvedValue([
        {
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-1',
          ledgerEntries: [
            {
              createdAt: now,
              deltaTokens: 2000,
              status: 'posted',
            },
          ],
          license: {
            deviceLimit: 0,
            id: 'license-1',
            key: 'LIC-123',
            ownerEmail: 'reader@example.com',
            status: 'active',
          },
          orderId: null,
          redeemedAt: null,
          redeemedByDevice: null,
          status: 'available',
        },
      ]);
      mockDb.tokenLedger.aggregate
        .mockResolvedValueOnce({
          _sum: {
            deltaTokens: 1930,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            deltaTokens: 2000,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            deltaTokens: -70,
          },
        });

      const result = await call(licenseRouter.listRedeemCodes, {
        status: 'all',
      });

      expect(result).toEqual([
        {
          availableTokens: 1930,
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          creditedTokens: 2000,
          deviceLimit: 0,
          expiresAt: null,
          id: 'redeem-1',
          lastLedgerAt: now,
          licenseId: 'license-1',
          licenseKey: 'LIC-123',
          licenseStatus: 'active',
          orderId: null,
          ownerEmail: 'reader@example.com',
          redeemedAt: null,
          redeemedByDevice: null,
          spentTokens: 70,
          status: 'available',
        },
      ]);
    });

    it('shows license-level totals consistently across multiple redeem codes', async () => {
      mockDb.redeemCode.findMany.mockResolvedValue([
        {
          code: 'TB-AAAA-BBBB-CCCC',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-1',
          ledgerEntries: [
            {
              createdAt: now,
              deltaTokens: 2000,
              status: 'posted',
            },
          ],
          license: {
            deviceLimit: 1,
            id: 'license-1',
            key: 'LIC-123',
            ownerEmail: 'reader@example.com',
            status: 'active',
          },
          orderId: null,
          redeemedAt: now,
          redeemedByDevice: null,
          status: 'redeemed',
        },
        {
          code: 'TB-DDDD-EEEE-FFFF',
          createdAt: now,
          expiresAt: null,
          id: 'redeem-2',
          ledgerEntries: [],
          license: {
            deviceLimit: 1,
            id: 'license-1',
            key: 'LIC-123',
            ownerEmail: 'reader@example.com',
            status: 'active',
          },
          orderId: null,
          redeemedAt: null,
          redeemedByDevice: null,
          status: 'canceled',
        },
      ]);
      mockDb.tokenLedger.aggregate
        .mockResolvedValueOnce({
          _sum: {
            deltaTokens: 17470,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            deltaTokens: 20000,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            deltaTokens: -2530,
          },
        });

      const result = await call(licenseRouter.listRedeemCodes, {
        status: 'all',
      });

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            availableTokens: 17470,
            code: 'TB-AAAA-BBBB-CCCC',
            creditedTokens: 20000,
            spentTokens: 2530,
          }),
          expect.objectContaining({
            availableTokens: 17470,
            code: 'TB-DDDD-EEEE-FFFF',
            creditedTokens: 20000,
            spentTokens: 2530,
          }),
        ])
      );
      expect(mockDb.tokenLedger.aggregate).toHaveBeenCalledTimes(3);
    });
  });

  describe('getByKey', () => {
    it('returns license summary with live token balance', async () => {
      mockDb.license.findUnique.mockResolvedValue({
        activatedAt: now,
        createdAt: now,
        deviceLimit: 2,
        id: 'license-1',
        key: 'LIC-123',
        ownerEmail: 'customer@example.com',
        redeemCodes: [
          {
            code: 'RED-123',
            createdAt: now,
            expiresAt: null,
            redeemedAt: null,
            status: 'available',
          },
        ],
        revokedAt: null,
        status: 'active',
      });
      mockDb.licenseDevice.count.mockResolvedValue(1);
      mockDb.tokenLedger.aggregate.mockResolvedValue({
        _sum: {
          deltaTokens: 420,
        },
      });

      const result = await call(licenseRouter.getByKey, {
        key: 'LIC-123',
      });

      expect(result).toEqual({
        activatedAt: now,
        activeDeviceCount: 1,
        availableTokens: 420,
        createdAt: now,
        deviceLimit: 2,
        id: 'license-1',
        key: 'LIC-123',
        ownerEmail: 'customer@example.com',
        redeemCodes: [
          {
            code: 'RED-123',
            createdAt: now,
            expiresAt: null,
            redeemedAt: null,
            status: 'available',
          },
        ],
        revokedAt: null,
        status: 'active',
      });
    });

    it('throws NOT_FOUND when the license does not exist', async () => {
      mockDb.license.findUnique.mockResolvedValue(null);

      await expect(
        call(licenseRouter.getByKey, {
          key: 'missing',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('getOrders', () => {
    it('returns order summaries for a license', async () => {
      mockDb.license.findUnique.mockResolvedValue({
        id: 'license-1',
      });
      mockDb.order.findMany.mockResolvedValue([
        {
          amountTotalCents: 1999,
          createdAt: now,
          currency: 'usd',
          id: 'order-1',
          paidAt: now,
          payerEmail: 'customer@example.com',
          provider: 'lemonsqueezy',
          status: 'paid',
          lsOrderId: 'ls-order-123',
          lsSubscriptionId: 'ls-sub-999',
          tokenPack: {
            name: 'Starter Pack',
          },
        },
      ]);

      const result = await call(licenseRouter.getOrders, {
        key: 'LIC-123',
      });

      expect(result).toEqual([
        {
          amountTotalCents: 1999,
          createdAt: now,
          currency: 'usd',
          id: 'order-1',
          paidAt: now,
          payerEmail: 'customer@example.com',
          provider: 'lemonsqueezy',
          status: 'paid',
          lsOrderId: 'ls-order-123',
          lsSubscriptionId: 'ls-sub-999',
          tokenPackName: 'Starter Pack',
        },
      ]);
    });
  });

  describe('getLedger', () => {
    it('returns append-only ledger entries for a license', async () => {
      mockDb.license.findUnique.mockResolvedValue({
        id: 'license-1',
      });
      mockDb.tokenLedger.findMany.mockResolvedValue([
        {
          createdAt: now,
          deltaTokens: 250,
          description: 'Manual support credit',
          deviceId: null,
          id: 'ledger-1',
          jobId: null,
          orderId: null,
          redeemCode: {
            code: 'RED-123',
          },
          status: 'posted',
          type: 'manual_credit',
        },
      ]);

      const result = await call(licenseRouter.getLedger, {
        key: 'LIC-123',
      });

      expect(result).toEqual([
        {
          createdAt: now,
          deltaTokens: 250,
          description: 'Manual support credit',
          deviceId: null,
          id: 'ledger-1',
          jobId: null,
          orderId: null,
          redeemCode: 'RED-123',
          status: 'posted',
          type: 'manual_credit',
        },
      ]);
    });
  });

  describe('redeem code management', () => {
    it('creates a redeem code on an existing license by email', async () => {
      const tx = {
        license: {
          create: vi.fn(),
          findFirst: vi.fn().mockResolvedValue({
            createdAt: now,
            deviceLimit: 0,
            id: 'license-1',
            key: 'LIC-123',
            ownerEmail: 'reader@example.com',
          }),
          findUnique: vi.fn(),
          update: vi.fn().mockResolvedValue({
            createdAt: now,
            deviceLimit: 0,
            id: 'license-1',
            key: 'LIC-123',
          }),
        },
        redeemCode: {
          create: vi.fn().mockResolvedValue({
            code: 'TB-AAAA-BBBB-CCCC',
            id: 'redeem-1',
          }),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        tokenLedger: {
          create: vi.fn().mockResolvedValue({
            id: 'ledger-1',
          }),
        },
      };

      mockTransaction(tx);

      const result = await call(licenseRouter.createRedeemCode, {
        ownerEmail: 'reader@example.com',
        tokenAmount: 2000,
      });

      expect(result).toEqual({
        createdAt: now,
        deviceLimit: 0,
        licenseId: 'license-1',
        licenseKey: 'LIC-123',
        redeemCode: 'TB-AAAA-BBBB-CCCC',
        tokenAmount: 2000,
      });
      expect(tx.license.create).not.toHaveBeenCalled();
      expect(tx.tokenLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deltaTokens: 2000,
            licenseId: 'license-1',
            redeemCodeId: 'redeem-1',
          }),
        })
      );
    });

    it('reactivates a non-redeemed code and clears its expiry', async () => {
      mockDb.redeemCode.findUnique.mockResolvedValue({
        id: 'redeem-1',
        status: 'expired',
      });
      mockDb.redeemCode.update.mockResolvedValue({
        code: 'TB-AAAA-BBBB-CCCC',
        status: 'available',
      });

      const result = await call(licenseRouter.updateRedeemCodeStatus, {
        code: 'tb aaaa bbbb cccc',
        status: 'available',
      });

      expect(result).toEqual({
        code: 'TB-AAAA-BBBB-CCCC',
        status: 'available',
      });
      expect(mockDb.redeemCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            expiresAt: null,
            status: 'available',
          },
          where: {
            id: 'redeem-1',
          },
        })
      );
    });

    it('regenerates a new code and cancels the old available code', async () => {
      const tx = {
        redeemCode: {
          create: vi.fn().mockResolvedValue({
            code: 'TB-DDDD-EEEE-FFFF',
            status: 'available',
          }),
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({
              expiresAt: null,
              id: 'redeem-1',
              licenseId: 'license-1',
              metadata: null,
              status: 'available',
            })
            .mockResolvedValueOnce(null),
          update: vi.fn().mockResolvedValue({
            id: 'redeem-1',
          }),
        },
      };

      mockTransaction(tx);

      const result = await call(licenseRouter.regenerateRedeemCode, {
        code: 'TB-AAAA-BBBB-CCCC',
      });

      expect(result).toEqual({
        oldCode: 'TB-AAAA-BBBB-CCCC',
        redeemCode: 'TB-DDDD-EEEE-FFFF',
        status: 'available',
      });
      expect(tx.redeemCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'canceled',
          },
          where: {
            id: 'redeem-1',
          },
        })
      );
    });

    it('adjusts redeem access and writes an admin token ledger entry', async () => {
      const tx = {
        license: {
          update: vi.fn().mockResolvedValue({
            deviceLimit: 2,
            id: 'license-1',
            status: 'suspended',
          }),
        },
        redeemCode: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'redeem-1',
            license: {
              deviceLimit: 1,
              id: 'license-1',
              status: 'active',
            },
            status: 'available',
          }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            code: 'TB-AAAA-BBBB-CCCC',
            status: 'canceled',
          }),
          update: vi.fn().mockResolvedValue({
            id: 'redeem-1',
          }),
        },
        tokenLedger: {
          create: vi.fn().mockResolvedValue({
            id: 'ledger-1',
          }),
        },
      };

      mockTransaction(tx);
      mockDb.tokenLedger.aggregate.mockResolvedValue({
        _sum: {
          deltaTokens: 1500,
        },
      });

      const result = await call(licenseRouter.adjustRedeemCode, {
        code: 'TB-AAAA-BBBB-CCCC',
        deviceLimit: 2,
        licenseStatus: 'suspended',
        notes: 'Support adjustment',
        status: 'canceled',
        tokenDelta: -500,
      });

      expect(result).toEqual({
        availableTokens: 1500,
        code: 'TB-AAAA-BBBB-CCCC',
        deviceLimit: 2,
        licenseStatus: 'suspended',
        status: 'canceled',
      });
      expect(tx.redeemCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            expiresAt: undefined,
            status: 'canceled',
          },
          where: {
            id: 'redeem-1',
          },
        })
      );
      expect(tx.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            deviceLimit: 2,
            status: 'suspended',
          },
        })
      );
      expect(tx.tokenLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deltaTokens: -500,
            description: 'Support adjustment',
            licenseId: 'license-1',
            redeemCodeId: 'redeem-1',
            type: 'admin_adjustment',
          }),
        })
      );
    });
  });

  it('throws UNAUTHORIZED for protected reads when there is no staff session', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(
      call(licenseRouter.getByKey, {
        key: 'LIC-123',
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

function mockTransaction<TTx>(tx: TTx) {
  const dbWithTransaction = mockDb as typeof mockDb & {
    $transaction: Mock;
  };

  dbWithTransaction.$transaction = vi.fn((callback: (tx: TTx) => unknown) =>
    callback(tx)
  );
}
