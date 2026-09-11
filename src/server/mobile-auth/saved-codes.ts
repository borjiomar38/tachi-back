import { z } from 'zod';

import { db } from '@/server/db';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';

// Possessing a code grants its wallet, not the other wallets of its payer.
// Activation history is scoped to the device, but a client-supplied installation
// identifier is not proof of possession of every historical redeem. Refresh only
// codes the app already holds; never disclose an unknown bearer credential.
export const zSavedCodesRequest = () =>
  z.object({
    codes: z.array(z.string().trim().min(1).max(128)).max(200).default([]),
  });

export const getDeviceSavedCodes = async (
  deviceId: string,
  knownCodes: string[]
) => {
  if (knownCodes.length === 0) return { codes: [] };
  const activations = await db.redeemActivation.findMany({
    where: { deviceId, redeemCode: { code: { in: knownCodes } } },
    orderBy: [{ lastActivatedAt: 'desc' }, { id: 'desc' }],
    select: {
      redeemCode: {
        select: {
          code: true,
          licenseId: true,
          status: true,
          expiresAt: true,
          license: { select: { status: true } },
        },
      },
    },
  });
  const seen = new Set<string>();
  const codes = activations
    .map(({ redeemCode }) => redeemCode)
    .filter((code) => {
      // Older purchases produced aliases of one wallet. Never show their balance
      // twice or pretend these aliases are independent wallets.
      if (seen.has(code.licenseId)) return false;
      seen.add(code.licenseId);
      return true;
    });
  return {
    codes: await Promise.all(
      codes.map(async (code) => ({
        code: code.code,
        licenseId: code.licenseId,
        availableTokens: await getAvailableLicenseTokenBalance({
          licenseId: code.licenseId,
        }),
        activeDeviceCount: await db.licenseDevice.count({
          where: { licenseId: code.licenseId, status: 'active' },
        }),
        available:
          ['available', 'redeemed'].includes(code.status) &&
          ['active', 'pending'].includes(code.license.status) &&
          (!code.expiresAt || code.expiresAt > new Date()),
      }))
    ),
  };
};
