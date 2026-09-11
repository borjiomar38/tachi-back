import { z } from 'zod';

import { db } from '@/server/db';
import { redeemLicenseToDeviceWithContext } from '@/server/licenses/redeem';
import { zRedeemActivationInput } from '@/server/licenses/schema';
import { normalizeRedeemCode } from '@/server/licenses/utils';
import { createMobileSession } from '@/server/mobile-auth/session';
import {
  assertPurchaseClaimable,
  hashPurchaseTicket,
  PurchaseError,
  resolvePurchaseLicenseId,
  zPurchaseTicket,
} from '@/server/payments/purchase-policy';

export const zPurchaseClaimInput = () =>
  zRedeemActivationInput.omit({ redeemCode: true }).extend({
    ticket: zPurchaseTicket(),
  });

export const prepareTokenPurchaseClaim = async (input: {
  ticket?: string;
  redeemCode?: string;
  installationId: string;
  currentLicenseId?: string;
}) => {
  const where = input.ticket
    ? { ticketHash: hashPurchaseTicket(input.ticket) }
    : { redeemCode: { code: normalizeRedeemCode(input.redeemCode ?? '') } };
  const found = await db.tokenPurchase.findFirst({ where });
  if (!found) {
    if (input.ticket) throw new PurchaseError('purchase_not_found', 404);
    return null; // Preserve the existing free-trial / legacy redeem workflow.
  }
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM token_purchases WHERE id = ${found.id} FOR UPDATE`;
    const purchase = await tx.tokenPurchase.findUniqueOrThrow({
      where: { id: found.id },
      include: { order: true, redeemCode: true },
    });
    assertPurchaseClaimable({
      purchase,
      installationId: input.installationId,
      currentLicenseId: input.currentLicenseId,
      viaTicket: Boolean(input.ticket),
      now: new Date(),
    });
    if (!purchase.order?.licenseId || !purchase.redeemCode)
      throw new PurchaseError('payment_pending');
    const licenseId = resolvePurchaseLicenseId({
      purchase,
      currentLicenseId: input.currentLicenseId,
      fundedLicenseId: purchase.order.licenseId,
    });
    const [license, device] = await Promise.all([
      tx.license.findUnique({ where: { id: licenseId } }),
      tx.device.findUnique({ where: { installationId: input.installationId } }),
    ]);
    if (!license || !['active', 'pending'].includes(license.status)) {
      throw new PurchaseError('license_unavailable', 403);
    }
    if (device && ['revoked', 'blocked'].includes(device.status)) {
      throw new PurchaseError('device_revoked', 403);
    }
    if (!['available', 'redeemed'].includes(purchase.redeemCode.status)) {
      throw new PurchaseError('redeem_code_unavailable', 409);
    }
    if (licenseId !== purchase.order.licenseId) {
      // A web purchase may have no account until the buyer returns to the app.
      // Move only this unclaimed purchase, never another license's balance.
      if (
        purchase.claimedAt ||
        purchase.targetLicenseId ||
        purchase.redeemCode.redeemedAt ||
        (await tx.mobileSession.count({
          where: { licenseId: purchase.order.licenseId },
        }))
      ) {
        throw new PurchaseError('purchase_account_mismatch', 403);
      }
      await tx.tokenLedger.update({
        where: { idempotencyKey: `token-purchase:${purchase.id}:credit` },
        data: { licenseId },
      });
      await tx.order.update({
        where: { id: purchase.order.id },
        data: { licenseId },
      });
      await tx.redeemCode.update({
        where: { id: purchase.redeemCode.id },
        data: { licenseId },
      });
    }
    await tx.tokenPurchase.update({
      where: { id: purchase.id },
      data: {
        claimedLicenseId: licenseId,
        claimedAt: purchase.claimedAt ?? new Date(),
        // An interrupted HTTP response can retry on the same device. Another
        // device cannot reuse the return ticket; email remains a recovery route.
        ...(input.ticket
          ? {
              ticketConsumedAt: purchase.ticketConsumedAt ?? new Date(),
              claimedInstallationId:
                purchase.claimedInstallationId ?? input.installationId,
            }
          : {}),
      },
    });
    return {
      redeemCode: purchase.redeemCode.code,
      totalTokens: purchase.totalTokens,
    };
  });
};

export const activateTokenPurchase = async (
  rawInput: unknown,
  context: {
    currentLicenseId?: string;
    clientIp?: string | null;
    userAgent?: string | null;
  } = {}
) => {
  const input = zPurchaseClaimInput().parse(rawInput);
  const purchase = await prepareTokenPurchaseClaim({
    ticket: input.ticket,
    installationId: input.installationId,
    currentLicenseId: context.currentLicenseId,
  });
  if (!purchase) throw new PurchaseError('purchase_not_found', 404);
  const redemption = await redeemLicenseToDeviceWithContext(
    { ...input, redeemCode: purchase.redeemCode },
    context
  );
  const { activation } = redemption;
  const auth = await createMobileSession(
    {
      ...input,
      deviceId: activation.device.id,
      licenseId: activation.license.id,
    },
    context
  );
  return {
    result: { activation, auth },
    purchasedTokens: purchase.totalTokens,
    state: 'activated' as const,
  };
};

export const getTokenPurchaseStatus = async (rawInput: unknown) => {
  const { ticket } = z.object({ ticket: zPurchaseTicket() }).parse(rawInput);
  const purchase = await db.tokenPurchase.findUnique({
    where: { ticketHash: hashPurchaseTicket(ticket) },
    include: { redeemCode: { select: { redeemedAt: true } } },
  });
  if (!purchase) throw new PurchaseError('purchase_not_found', 404);
  if (purchase.ticketExpiresAt <= new Date())
    throw new PurchaseError('purchase_ticket_expired', 410);
  return {
    state: purchase.status,
    activated: Boolean(purchase.redeemCode?.redeemedAt),
    packName: purchase.packName,
    totalTokens: purchase.totalTokens,
    emailSent: Boolean(purchase.emailSentAt),
  };
};
