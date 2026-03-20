import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import deviceRouter from '@/server/routers/device';
import {
  mockDb,
  mockGetSession,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const now = new Date('2026-03-19T20:00:00.000Z');

describe('device router', () => {
  describe('getById', () => {
    it('returns the device detail with active and historical license bindings', async () => {
      mockDb.device.findUnique.mockResolvedValue({
        appBuild: '120',
        appVersion: '1.2.0',
        createdAt: now,
        id: 'device-1',
        installationId: 'install-123',
        lastIpAddress: '127.0.0.1',
        lastSeenAt: now,
        licenseBindings: [
          {
            boundAt: now,
            id: 'binding-1',
            license: {
              id: 'license-1',
              key: 'LIC-123',
              ownerEmail: 'customer@example.com',
              status: 'active',
            },
            status: 'active',
            unboundAt: null,
          },
          {
            boundAt: new Date('2026-03-18T20:00:00.000Z'),
            id: 'binding-2',
            license: {
              id: 'license-2',
              key: 'LIC-OLD',
              ownerEmail: null,
              status: 'revoked',
            },
            status: 'revoked',
            unboundAt: now,
          },
        ],
        locale: 'en-US',
        metadata: {
          manufacturer: 'Google',
        },
        platform: 'android',
        status: 'active',
      });

      const result = await call(deviceRouter.getById, {
        deviceId: 'device-1',
      });

      expect(result).toEqual({
        activeLicense: {
          boundAt: now,
          id: 'license-1',
          key: 'LIC-123',
          ownerEmail: 'customer@example.com',
          status: 'active',
        },
        appBuild: '120',
        appVersion: '1.2.0',
        bindings: [
          {
            boundAt: now,
            key: 'LIC-123',
            licenseBindingId: 'binding-1',
            licenseId: 'license-1',
            licenseStatus: 'active',
            ownerEmail: 'customer@example.com',
            status: 'active',
            unboundAt: null,
          },
          {
            boundAt: new Date('2026-03-18T20:00:00.000Z'),
            key: 'LIC-OLD',
            licenseBindingId: 'binding-2',
            licenseId: 'license-2',
            licenseStatus: 'revoked',
            ownerEmail: null,
            status: 'revoked',
            unboundAt: now,
          },
        ],
        createdAt: now,
        id: 'device-1',
        installationId: 'install-123',
        lastIpAddress: '127.0.0.1',
        lastSeenAt: now,
        locale: 'en-US',
        metadata: {
          manufacturer: 'Google',
        },
        platform: 'android',
        status: 'active',
      });
    });

    it('requires device read permission', async () => {
      mockDb.device.findUnique.mockResolvedValue({
        appBuild: null,
        appVersion: null,
        createdAt: now,
        id: 'device-1',
        installationId: 'install-123',
        lastIpAddress: null,
        lastSeenAt: null,
        licenseBindings: [],
        locale: null,
        metadata: null,
        platform: 'android',
        status: 'pending',
      });

      await call(deviceRouter.getById, {
        deviceId: 'device-1',
      });

      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: {
            device: ['read'],
          },
          userId: mockUser.id,
        },
      });
    });

    it('throws NOT_FOUND when the device does not exist', async () => {
      mockDb.device.findUnique.mockResolvedValue(null);

      await expect(
        call(deviceRouter.getById, {
          deviceId: 'missing-device',
        })
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  it('throws UNAUTHORIZED for device reads when there is no staff session', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(
      call(deviceRouter.getById, {
        deviceId: 'device-1',
      })
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});
