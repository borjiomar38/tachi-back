import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAssertPolicySyncAuthorized,
  mockGetEffectiveMobileAbiAppUpdatePolicy,
  mockPutMobileAbiAppUpdatePolicy,
} = vi.hoisted(() => ({
  mockAssertPolicySyncAuthorized: vi.fn(),
  mockGetEffectiveMobileAbiAppUpdatePolicy: vi.fn(),
  mockPutMobileAbiAppUpdatePolicy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
  }),
}));

vi.mock('@/server/mobile-abi-update-policy', () => ({
  getEffectiveMobileAbiAppUpdatePolicy:
    mockGetEffectiveMobileAbiAppUpdatePolicy,
  putMobileAbiAppUpdatePolicy: mockPutMobileAbiAppUpdatePolicy,
}));

vi.mock('@/server/mobile-update-policy', () => ({
  assertPolicySyncAuthorized: mockAssertPolicySyncAuthorized,
}));

import { Route } from './abi';

const buildPolicy = () => ({
  apkByAbi: {
    'arm64-v8a': {
      filename: 'TachiyomiAT-arm64-v8a-v0.17.38.apk',
      sha256:
        '1111111111111111111111111111111111111111111111111111111111111111',
      sizeBytes: 68_304_840,
      url: 'https://downloads.example.test/android/arm64-v8a.apk',
    },
    'armeabi-v7a': {
      filename: 'TachiyomiAT-armeabi-v7a-v0.17.38.apk',
      sha256:
        '2222222222222222222222222222222222222222222222222222222222222222',
      sizeBytes: 55_868_366,
      url: 'https://downloads.example.test/android/armeabi-v7a.apk',
    },
    x86: {
      filename: 'TachiyomiAT-x86-v0.17.38.apk',
      sha256:
        '3333333333333333333333333333333333333333333333333333333333333333',
      sizeBytes: 71_330_662,
      url: 'https://downloads.example.test/android/x86.apk',
    },
    x86_64: {
      filename: 'TachiyomiAT-x86_64-v0.17.38.apk',
      sha256:
        '4444444444444444444444444444444444444444444444444444444444444444',
      sizeBytes: 72_518_277,
      url: 'https://downloads.example.test/android/x86_64.apk',
    },
  },
  apkVariant: 'per-abi',
  channel: 'standard-release',
  checkedAt: '2026-08-13T08:00:00.000Z',
  currentVersionCode: 48,
  currentVersionName: '0.17.38',
  forceUpdate: false,
  latestVersionCode: 48,
  latestVersionName: '0.17.38',
  message: 'Version 0.17.38 is available.',
  minimumSupportedVersionCode: 0,
  platform: 'android',
  releaseUrl: 'https://tachiyomiat.com/download',
  requiresUpdate: false,
  updateUrl: 'https://tachiyomiat.com/download',
});

type AbiPolicyRouteHandlers = {
  GET: (input: { request: Request }) => Promise<Response>;
  POST: (input: { request: Request }) => Promise<Response>;
};

const handlers = (
  Route as never as {
    options: {
      server: {
        handlers: AbiPolicyRouteHandlers;
      };
    };
  }
).options.server.handlers;

describe('/api/mobile/app-update-policy/abi', () => {
  beforeEach(() => {
    mockAssertPolicySyncAuthorized.mockReset();
    mockGetEffectiveMobileAbiAppUpdatePolicy.mockReset();
    mockPutMobileAbiAppUpdatePolicy.mockReset();
  });

  it('returns the ABI policy with client request context', async () => {
    const policy = buildPolicy();
    mockGetEffectiveMobileAbiAppUpdatePolicy.mockResolvedValue(policy);

    const response = await handlers.GET({
      request: new Request(
        'https://nayovi.com/api/mobile/app-update-policy/abi?platform=android&channel=standard-release&versionCode=47&versionName=0.17.37'
      ),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual(policy);
    expect(mockGetEffectiveMobileAbiAppUpdatePolicy).toHaveBeenCalledWith({
      channel: 'standard-release',
      currentVersionCode: 47,
      currentVersionName: '0.17.37',
      platform: 'android',
    });
  });

  it('fails safely while no ABI policy has been published', async () => {
    mockGetEffectiveMobileAbiAppUpdatePolicy.mockResolvedValue(null);

    const response = await handlers.GET({
      request: new Request(
        'https://nayovi.com/api/mobile/app-update-policy/abi'
      ),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'app_update_policy_not_configured',
      },
      ok: false,
    });
  });

  it('rejects an unauthorized policy write', async () => {
    mockAssertPolicySyncAuthorized.mockReturnValue(false);

    const response = await handlers.POST({
      request: new Request(
        'https://nayovi.com/api/mobile/app-update-policy/abi',
        {
          body: JSON.stringify(buildPolicy()),
          headers: {
            'content-type': 'application/json',
          },
          method: 'POST',
        }
      ),
    });

    expect(response.status).toBe(401);
    expect(mockPutMobileAbiAppUpdatePolicy).not.toHaveBeenCalled();
  });

  it('publishes an authorized policy through the ABI storage service', async () => {
    const policy = buildPolicy();
    mockAssertPolicySyncAuthorized.mockReturnValue(true);
    mockPutMobileAbiAppUpdatePolicy.mockResolvedValue(policy);

    const response = await handlers.POST({
      request: new Request(
        'https://nayovi.com/api/mobile/app-update-policy/abi',
        {
          body: JSON.stringify(policy),
          headers: {
            authorization: 'Bearer test-token',
            'content-type': 'application/json',
          },
          method: 'POST',
        }
      ),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: policy,
      ok: true,
    });
    expect(mockPutMobileAbiAppUpdatePolicy).toHaveBeenCalledWith(policy);
  });
});
