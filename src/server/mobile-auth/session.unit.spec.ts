import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockLogger } = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
    mobileSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tokenLedger: {
      aggregate: vi.fn(),
    },
  },
  mockLogger: {
    info: vi.fn(),
  },
}));

vi.mock('@/env/server', () => ({
  envServer: {
    MOBILE_API_ACCESS_TOKEN_TTL_SECONDS: 3600,
    MOBILE_API_AUDIENCE: 'tachiyomiat',
    MOBILE_API_ENABLED: true,
    MOBILE_API_ISSUER: 'tachi-back',
    MOBILE_API_JWT_SECRET: '12345678901234567890123456789012',
    MOBILE_API_REFRESH_TOKEN_TTL_SECONDS: 2592000,
  },
}));

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/server/logger', () => ({
  logger: mockLogger,
}));

import {
  authenticateMobileAccessToken,
  createMobileSession,
  MobileAuthError,
  refreshMobileSession,
} from '@/server/mobile-auth/session';

describe('mobile auth session service', () => {
  beforeEach(() => {
    mockDb.$transaction.mockReset();
    mockDb.mobileSession.create.mockReset();
    mockDb.mobileSession.findUnique.mockReset();
    mockDb.mobileSession.update.mockReset();
    mockDb.tokenLedger.aggregate.mockReset();
    mockLogger.info.mockReset();
  });

  it('creates a device-bound access and refresh token bundle', async () => {
    const now = new Date('2026-03-19T23:00:00.000Z');

    mockDb.mobileSession.create.mockResolvedValue({
      createdAt: now,
      deviceId: 'device-1',
      expiresAt: new Date('2026-04-18T23:00:00.000Z'),
      id: 'session-1',
      licenseId: 'license-1',
    });

    const result = await createMobileSession(
      {
        appBuild: '100',
        appVersion: '1.0.0',
        buildChannel: 'stable',
        deviceId: 'device-1',
        installationId: 'install-1234567890abcd',
        licenseId: 'license-1',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
        userAgent: 'okhttp/test',
      }
    );

    expect(result.session.id).toBe('session-1');
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(result.refreshToken.length).toBeGreaterThan(30);
    expect(mockDb.mobileSession.create).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalledOnce();
  });

  it('refreshes a mobile session and rotates the refresh token', async () => {
    const now = new Date('2026-03-19T23:05:00.000Z');
    const issued = await createMobileSession(
      {
        appBuild: '100',
        appVersion: '1.0.0',
        deviceId: 'device-1',
        installationId: 'install-1234567890abcd',
        licenseId: 'license-1',
      },
      {
        dbClient: {
          ...mockDb,
          mobileSession: {
            ...mockDb.mobileSession,
            create: vi.fn().mockResolvedValue({
              createdAt: now,
              deviceId: 'device-1',
              expiresAt: new Date('2026-04-18T23:05:00.000Z'),
              id: 'session-1',
              licenseId: 'license-1',
            }),
          },
        } as never,
        log: mockLogger,
        now,
      }
    );

    mockDb.mobileSession.findUnique.mockResolvedValue({
      appBuild: '100',
      appVersion: '1.0.0',
      createdAt: now,
      device: {
        appBuild: '100',
        appVersion: '1.0.0',
        id: 'device-1',
        installationId: 'install-1234567890abcd',
        lastSeenAt: now,
        locale: 'en',
        metadata: null,
        platform: 'android',
        status: 'active',
      },
      deviceId: 'device-1',
      expiresAt: new Date('2026-04-18T23:05:00.000Z'),
      id: 'session-1',
      lastUsedAt: now,
      license: {
        activatedAt: now,
        deviceLimit: 1,
        id: 'license-1',
        key: 'license-key-1',
        ownerEmail: 'reader@example.com',
        status: 'active',
      },
      licenseId: 'license-1',
      refreshTokenHash: 'unused',
      revokedAt: null,
    });
    mockDb.mobileSession.update.mockResolvedValue({
      createdAt: now,
      deviceId: 'device-1',
      expiresAt: new Date('2026-04-18T23:06:00.000Z'),
      id: 'session-1',
      licenseId: 'license-1',
    });

    const refreshed = await refreshMobileSession(
      {
        appBuild: '101',
        appVersion: '1.0.1',
        installationId: 'install-1234567890abcd',
        refreshToken: issued.refreshToken,
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now: new Date('2026-03-19T23:06:00.000Z'),
      }
    );

    expect(refreshed.session.id).toBe('session-1');
    expect(refreshed.refreshToken).not.toBe(issued.refreshToken);
    expect(mockDb.mobileSession.update).toHaveBeenCalledOnce();
  });

  it('authenticates a bearer access token against the mobile session record', async () => {
    const now = new Date('2026-03-19T23:10:00.000Z');

    mockDb.mobileSession.create.mockResolvedValue({
      createdAt: now,
      deviceId: 'device-1',
      expiresAt: new Date('2026-04-18T23:10:00.000Z'),
      id: 'session-1',
      licenseId: 'license-1',
    });

    const issued = await createMobileSession(
      {
        appBuild: '100',
        appVersion: '1.0.0',
        deviceId: 'device-1',
        installationId: 'install-1234567890abcd',
        licenseId: 'license-1',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    mockDb.mobileSession.findUnique.mockResolvedValue({
      appBuild: '100',
      appVersion: '1.0.0',
      createdAt: now,
      device: {
        appBuild: '100',
        appVersion: '1.0.0',
        id: 'device-1',
        installationId: 'install-1234567890abcd',
        lastSeenAt: now,
        locale: 'en',
        metadata: null,
        platform: 'android',
        status: 'active',
      },
      deviceId: 'device-1',
      expiresAt: new Date('2026-04-18T23:10:00.000Z'),
      id: 'session-1',
      lastUsedAt: now,
      license: {
        activatedAt: now,
        deviceLimit: 1,
        id: 'license-1',
        key: 'license-key-1',
        ownerEmail: 'reader@example.com',
        status: 'active',
      },
      licenseId: 'license-1',
      refreshTokenHash: 'unused',
      revokedAt: null,
    });

    const auth = await authenticateMobileAccessToken(
      new Request('http://localhost/api/mobile/auth/session', {
        headers: {
          Authorization: `Bearer ${issued.accessToken}`,
        },
      }),
      {
        dbClient: mockDb as never,
        now: new Date('2026-03-19T23:11:00.000Z'),
      }
    );

    expect(auth.session.id).toBe('session-1');
    expect(auth.device.installationId).toBe('install-1234567890abcd');
  });

  it('rejects bearer auth for a revoked device', async () => {
    const now = new Date('2026-03-19T23:20:00.000Z');

    mockDb.mobileSession.create.mockResolvedValue({
      createdAt: now,
      deviceId: 'device-1',
      expiresAt: new Date('2026-04-18T23:20:00.000Z'),
      id: 'session-1',
      licenseId: 'license-1',
    });

    const issued = await createMobileSession(
      {
        deviceId: 'device-1',
        installationId: 'install-1234567890abcd',
        licenseId: 'license-1',
      },
      {
        dbClient: mockDb as never,
        log: mockLogger,
        now,
      }
    );

    mockDb.mobileSession.findUnique.mockResolvedValue({
      appBuild: null,
      appVersion: null,
      createdAt: now,
      device: {
        appBuild: null,
        appVersion: null,
        id: 'device-1',
        installationId: 'install-1234567890abcd',
        lastSeenAt: now,
        locale: null,
        metadata: null,
        platform: 'android',
        status: 'revoked',
      },
      deviceId: 'device-1',
      expiresAt: new Date('2026-04-18T23:20:00.000Z'),
      id: 'session-1',
      lastUsedAt: now,
      license: {
        activatedAt: now,
        deviceLimit: 1,
        id: 'license-1',
        key: 'license-key-1',
        ownerEmail: null,
        status: 'active',
      },
      licenseId: 'license-1',
      refreshTokenHash: 'unused',
      revokedAt: null,
    });

    await expect(
      authenticateMobileAccessToken(
        new Request('http://localhost/api/mobile/auth/session', {
          headers: {
            Authorization: `Bearer ${issued.accessToken}`,
          },
        }),
        {
          dbClient: mockDb as never,
          now: new Date('2026-03-19T23:21:00.000Z'),
        }
      )
    ).rejects.toEqual(
      expect.objectContaining<Partial<MobileAuthError>>({
        code: 'revoked_device',
      })
    );
  });
});
