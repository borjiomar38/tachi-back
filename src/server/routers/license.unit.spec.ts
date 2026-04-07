import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

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
