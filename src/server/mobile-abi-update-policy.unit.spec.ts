import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetObject, mockPutObject, mockUploadClient } = vi.hoisted(() => ({
  mockGetObject: vi.fn(),
  mockPutObject: vi.fn(),
  mockUploadClient: { name: 'test-upload-client' },
}));

vi.mock('@better-upload/server/helpers', () => ({
  getObject: mockGetObject,
  putObject: mockPutObject,
}));

vi.mock('@/server/s3', () => ({
  objectStorageBuckets: {
    legacyPublic: 'legacy-public-test',
  },
  uploadClient: mockUploadClient,
}));

import {
  getEffectiveMobileAbiAppUpdatePolicy,
  MOBILE_ABI_APP_UPDATE_POLICY_OBJECT_KEY,
  putMobileAbiAppUpdatePolicy,
  withMobileAbiAppUpdateRequestContext,
  zMobileAbiAppUpdatePolicy,
} from '@/server/mobile-abi-update-policy';

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
  apkVariant: 'per-abi' as const,
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

describe('mobile ABI app update policy', () => {
  beforeEach(() => {
    mockGetObject.mockReset();
    mockPutObject.mockReset();
  });

  it('requires exactly the four supported ABI routes', () => {
    const policy = buildPolicy();
    const parsed = zMobileAbiAppUpdatePolicy.parse(policy);

    expect(Object.keys(parsed.apkByAbi)).toEqual([
      'arm64-v8a',
      'armeabi-v7a',
      'x86',
      'x86_64',
    ]);
    expect(
      zMobileAbiAppUpdatePolicy.safeParse({
        ...policy,
        apkByAbi: {
          'arm64-v8a': policy.apkByAbi['arm64-v8a'],
          'armeabi-v7a': policy.apkByAbi['armeabi-v7a'],
          x86: policy.apkByAbi.x86,
        },
      }).success
    ).toBe(false);
    expect(
      zMobileAbiAppUpdatePolicy.safeParse({
        ...policy,
        apkByAbi: {
          ...policy.apkByAbi,
          mips: policy.apkByAbi.x86,
        },
      }).success
    ).toBe(false);
  });

  it('binds each ABI to the release filename', () => {
    const policy = buildPolicy();
    const parsed = zMobileAbiAppUpdatePolicy.safeParse({
      ...policy,
      apkByAbi: {
        ...policy.apkByAbi,
        'arm64-v8a': {
          ...policy.apkByAbi['arm64-v8a'],
          filename: 'TachiyomiAT-v0.17.38.apk',
        },
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects duplicate or oversized routed artifacts', () => {
    const policy = buildPolicy();
    const duplicateArtifact = zMobileAbiAppUpdatePolicy.safeParse({
      ...policy,
      apkByAbi: {
        ...policy.apkByAbi,
        x86_64: {
          ...policy.apkByAbi.x86_64,
          sha256: policy.apkByAbi.x86.sha256,
          url: policy.apkByAbi.x86.url,
        },
      },
    });
    const oversizedArtifact = zMobileAbiAppUpdatePolicy.safeParse({
      ...policy,
      apkByAbi: {
        ...policy.apkByAbi,
        'arm64-v8a': {
          ...policy.apkByAbi['arm64-v8a'],
          sizeBytes: 75_000_001,
        },
      },
    });

    expect(duplicateArtifact.success).toBe(false);
    expect(oversizedArtifact.success).toBe(false);
  });

  it('rejects a forced policy that cannot lead to a newer release', () => {
    const policy = buildPolicy();

    expect(
      zMobileAbiAppUpdatePolicy.safeParse({
        ...policy,
        forceUpdate: true,
        minimumSupportedVersionCode: 49,
      }).success
    ).toBe(false);
    expect(
      zMobileAbiAppUpdatePolicy.safeParse({
        ...policy,
        forceUpdate: true,
        minimumSupportedVersionCode: 0,
      }).success
    ).toBe(false);
  });

  it('computes requiresUpdate from the requesting client version', () => {
    const forcedPolicy = zMobileAbiAppUpdatePolicy.parse({
      ...buildPolicy(),
      forceUpdate: true,
      minimumSupportedVersionCode: 48,
    });

    expect(
      withMobileAbiAppUpdateRequestContext(forcedPolicy, {
        channel: 'standard-release',
        currentVersionCode: 47,
        currentVersionName: '0.17.37',
        platform: 'android',
      })
    ).toMatchObject({
      currentVersionCode: 47,
      currentVersionName: '0.17.37',
      requiresUpdate: true,
    });
    expect(
      withMobileAbiAppUpdateRequestContext(forcedPolicy, {
        channel: 'standard-release',
        currentVersionCode: 48,
        currentVersionName: '0.17.38',
        platform: 'android',
      }).requiresUpdate
    ).toBe(false);
  });

  it('reads the distinct ABI policy object and applies request context', async () => {
    mockGetObject.mockResolvedValue({
      blob: new Blob([JSON.stringify(buildPolicy())]),
    });

    await expect(
      getEffectiveMobileAbiAppUpdatePolicy({
        channel: 'preview-release',
        currentVersionCode: 48,
        platform: 'android',
      })
    ).resolves.toMatchObject({
      channel: 'preview-release',
      currentVersionCode: 48,
      requiresUpdate: false,
    });
    expect(mockGetObject).toHaveBeenCalledWith(mockUploadClient, {
      bucket: 'legacy-public-test',
      key: MOBILE_ABI_APP_UPDATE_POLICY_OBJECT_KEY,
    });
  });

  it('writes only the distinct ABI policy object', async () => {
    const policy = buildPolicy();

    await expect(putMobileAbiAppUpdatePolicy(policy)).resolves.toEqual(policy);
    expect(mockPutObject).toHaveBeenCalledWith(mockUploadClient, {
      body: JSON.stringify(policy, null, 2),
      bucket: 'legacy-public-test',
      cacheControl: 'no-store',
      contentType: 'application/json',
      key: MOBILE_ABI_APP_UPDATE_POLICY_OBJECT_KEY,
    });
  });
});
