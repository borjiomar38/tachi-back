import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerMobileInstallation } from '@/server/services/mobile-installation-registration';

const now = new Date('2026-07-19T12:00:00.000Z');
const installationInput = {
  appBuild: '13',
  appVersion: '0.17.2',
  buildChannel: 'release',
  installationId: 'android-12345678-1234-1234-1234-123456789abc',
  locale: 'en-SA',
  platform: 'android' as const,
};

describe('mobile installation registration', () => {
  const deviceFindUnique = vi.fn();
  const deviceUpdate = vi.fn();
  const deviceUpsert = vi.fn();
  const logInfo = vi.fn();
  const dbClient = {
    device: {
      findUnique: deviceFindUnique,
      update: deviceUpdate,
      upsert: deviceUpsert,
    },
  };

  beforeEach(() => {
    deviceFindUnique.mockReset();
    deviceUpdate.mockReset();
    deviceUpsert.mockReset();
    logInfo.mockReset();
  });

  it('creates an unlinked pending device on the first app ping', async () => {
    deviceFindUnique.mockResolvedValue(null);
    deviceUpsert.mockResolvedValue({
      appBuild: installationInput.appBuild,
      appVersion: installationInput.appVersion,
      id: 'device-1',
      installationId: installationInput.installationId,
      lastSeenAt: now,
      locale: installationInput.locale,
      platform: 'android',
      status: 'pending',
    });

    const result = await registerMobileInstallation(installationInput, {
      clientIp: '203.0.113.10',
      dbClient: dbClient as never,
      log: { info: logInfo },
      now,
      userAgent: 'okhttp/test',
    });

    expect(result.registrationStatus).toBe('registered');
    expect(result.device.status).toBe('pending');
    expect(deviceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          installationId: installationInput.installationId,
          lastIpAddress: '203.0.113.10',
          status: 'pending',
        }),
        update: expect.not.objectContaining({
          status: expect.anything(),
        }),
      })
    );
    expect(deviceUpdate).not.toHaveBeenCalled();
  });

  it('updates an existing device without changing its activation status', async () => {
    deviceFindUnique.mockResolvedValue({
      id: 'device-1',
      metadata: {
        firstInstallPingAt: '2026-07-18T12:00:00.000Z',
      },
    });
    deviceUpdate.mockResolvedValue({
      appBuild: installationInput.appBuild,
      appVersion: installationInput.appVersion,
      id: 'device-1',
      installationId: installationInput.installationId,
      lastSeenAt: now,
      locale: installationInput.locale,
      platform: 'android',
      status: 'active',
    });

    const result = await registerMobileInstallation(installationInput, {
      clientIp: '203.0.113.11',
      dbClient: dbClient as never,
      log: { info: logInfo },
      now,
    });

    expect(result.registrationStatus).toBe('updated');
    expect(result.device.status).toBe('active');
    expect(deviceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          status: expect.anything(),
        }),
      })
    );
    expect(deviceUpsert).not.toHaveBeenCalled();
  });

  it('rejects fabricated installation identifiers before querying the database', async () => {
    await expect(
      registerMobileInstallation(
        {
          ...installationInput,
          installationId: 'fabricated-installation',
        },
        {
          dbClient: dbClient as never,
          log: { info: logInfo },
          now,
        }
      )
    ).rejects.toMatchObject({
      name: 'ZodError',
    });
    expect(deviceFindUnique).not.toHaveBeenCalled();
  });
});
