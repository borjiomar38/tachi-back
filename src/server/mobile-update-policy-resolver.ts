import {
  getEffectiveMobileAbiAppUpdatePolicy,
  type MobileAbiAppUpdatePolicy,
} from '@/server/mobile-abi-update-policy';
import {
  getEffectiveMobileAppUpdatePolicy,
  type MobileAppUpdatePolicy,
} from '@/server/mobile-update-policy';

export const MOBILE_ABI_POLICY_MIN_VERSION_CODE = 48;

export interface MobileUpdatePolicyClientContext {
  channel: string;
  currentVersionCode: number;
  currentVersionName?: string;
  platform: string;
}

export function usesMobileAbiUpdatePolicy(
  input: Pick<
    MobileUpdatePolicyClientContext,
    'currentVersionCode' | 'platform'
  >
) {
  return (
    input.platform.trim().toLowerCase() === 'android' &&
    input.currentVersionCode >= MOBILE_ABI_POLICY_MIN_VERSION_CODE
  );
}

export async function getEffectiveMobileUpdatePolicyForClient(
  input: MobileUpdatePolicyClientContext
): Promise<MobileAbiAppUpdatePolicy | MobileAppUpdatePolicy | null> {
  if (usesMobileAbiUpdatePolicy(input)) {
    return getEffectiveMobileAbiAppUpdatePolicy(input);
  }

  return getEffectiveMobileAppUpdatePolicy(input);
}
