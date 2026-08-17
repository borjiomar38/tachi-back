import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetEffectiveMobileAbiAppUpdatePolicy,
  mockGetEffectiveMobileAppUpdatePolicy,
} = vi.hoisted(() => ({
  mockGetEffectiveMobileAbiAppUpdatePolicy: vi.fn(),
  mockGetEffectiveMobileAppUpdatePolicy: vi.fn(),
}));

vi.mock('@/server/mobile-abi-update-policy', () => ({
  getEffectiveMobileAbiAppUpdatePolicy:
    mockGetEffectiveMobileAbiAppUpdatePolicy,
}));

vi.mock('@/server/mobile-update-policy', () => ({
  getEffectiveMobileAppUpdatePolicy: mockGetEffectiveMobileAppUpdatePolicy,
}));

import {
  getEffectiveMobileUpdatePolicyForClient,
  MOBILE_ABI_POLICY_MIN_VERSION_CODE,
  usesMobileAbiUpdatePolicy,
} from '@/server/mobile-update-policy-resolver';

describe('mobile update policy resolver', () => {
  beforeEach(() => {
    mockGetEffectiveMobileAbiAppUpdatePolicy.mockReset();
    mockGetEffectiveMobileAppUpdatePolicy.mockReset();
  });

  it('keeps Android clients below version code 48 on the legacy policy', async () => {
    const context = {
      channel: 'standard-release',
      currentVersionCode: MOBILE_ABI_POLICY_MIN_VERSION_CODE - 1,
      platform: 'android',
    };
    const legacyPolicy = { apkVariant: 'universal' };
    mockGetEffectiveMobileAppUpdatePolicy.mockResolvedValue(legacyPolicy);

    await expect(
      getEffectiveMobileUpdatePolicyForClient(context)
    ).resolves.toBe(legacyPolicy);
    expect(mockGetEffectiveMobileAppUpdatePolicy).toHaveBeenCalledWith(context);
    expect(mockGetEffectiveMobileAbiAppUpdatePolicy).not.toHaveBeenCalled();
  });

  it('routes Android clients from version code 48 to the ABI policy', async () => {
    const context = {
      channel: 'standard-release',
      currentVersionCode: MOBILE_ABI_POLICY_MIN_VERSION_CODE,
      currentVersionName: '0.17.38',
      platform: 'android',
    };
    const abiPolicy = { apkVariant: 'per-abi' };
    mockGetEffectiveMobileAbiAppUpdatePolicy.mockResolvedValue(abiPolicy);

    await expect(
      getEffectiveMobileUpdatePolicyForClient(context)
    ).resolves.toBe(abiPolicy);
    expect(mockGetEffectiveMobileAbiAppUpdatePolicy).toHaveBeenCalledWith(
      context
    );
    expect(mockGetEffectiveMobileAppUpdatePolicy).not.toHaveBeenCalled();
  });

  it('does not fall back to the legacy bridge when an ABI policy is missing', async () => {
    mockGetEffectiveMobileAbiAppUpdatePolicy.mockResolvedValue(null);

    await expect(
      getEffectiveMobileUpdatePolicyForClient({
        channel: 'standard-release',
        currentVersionCode: 50,
        platform: 'android',
      })
    ).resolves.toBeNull();
    expect(mockGetEffectiveMobileAppUpdatePolicy).not.toHaveBeenCalled();
  });

  it('keeps non-Android clients on the legacy policy', () => {
    expect(
      usesMobileAbiUpdatePolicy({
        currentVersionCode: 50,
        platform: 'ios',
      })
    ).toBe(false);
  });
});
