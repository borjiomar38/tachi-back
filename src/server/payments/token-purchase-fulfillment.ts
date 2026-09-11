import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { UNLIMITED_DEVICE_LIMIT } from '@/server/licenses/device-limit';
import { generateRedeemCode } from '@/server/licenses/utils';
import {
  assertPurchasePaymentMatches,
  PurchaseError,
  zPaidPurchaseEvent,
} from '@/server/payments/purchase-policy';
import { deliverPurchaseEmails } from '@/server/payments/token-purchase-mail';

export const processTokenPurchaseEvent = async (rawEvent: unknown) => {
  const event = zPaidPurchaseEvent().parse(rawEvent);
  const purchaseId = event.meta.custom_data.token_purchase_id;
  const attrs = event.data.attributes;
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM token_purchases WHERE id = ${purchaseId} FOR UPDATE`;
    const purchase = await tx.tokenPurchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) throw new PurchaseError('purchase_not_found', 404);
    assertPurchasePaymentMatches(
      purchase,
      event,
      envServer.LEMONSQUEEZY_STORE_ID ?? ''
    );
    if (purchase.orderId) {
      const existing = await tx.order.findUniqueOrThrow({
        where: { id: purchase.orderId },
      });
      if (existing.lsOrderId !== event.data.id)
        throw new PurchaseError('purchase_order_mismatch', 409);
      return {
        purchaseId,
        orderId: existing.id,
        status: 'already_processed' as const,
      };
    }
    // An unsuccessful checkout creation call can race with a successful provider
    // response. Only a verified paid webhook, never a redirect, can recover it.
    if (!['pending', 'failed'].includes(purchase.status))
      throw new PurchaseError('purchase_unavailable');
    const targetLicense = purchase.targetLicenseId
      ? await tx.license.findUnique({ where: { id: purchase.targetLicenseId } })
      : null;
    if (
      purchase.targetLicenseId &&
      (!targetLicense || !['active', 'pending'].includes(targetLicense.status))
    ) {
      throw new PurchaseError('license_unavailable', 403);
    }
    const license =
      targetLicense ??
      (await tx.license.create({
        data: {
          ownerEmail: attrs.user_email,
          deviceLimit: UNLIMITED_DEVICE_LIMIT,
          fulfillmentKey: `token-purchase:${purchase.id}`,
          notes: `One-time token purchase ${purchase.id}`,
        },
      }));
    const order = await tx.order.create({
      data: {
        lsOrderId: event.data.id,
        tokenPackId: purchase.tokenPackId,
        licenseId: license.id,
        status: 'paid',
        paidAt: new Date(),
        payerEmail: attrs.user_email,
        currency: purchase.currency,
        amountSubtotalCents: attrs.subtotal,
        amountTotalCents: attrs.total,
        amountDiscountCents: attrs.discount_total,
        lsCustomerId: attrs.customer_id ? String(attrs.customer_id) : null,
        rawPayload: event as unknown as Prisma.InputJsonValue,
      },
    });
    const rechargeCode = purchase.targetRedeemCodeId
      ? await tx.redeemCode.findUnique({
          where: { id: purchase.targetRedeemCodeId },
        })
      : null;
    if (
      purchase.targetRedeemCodeId &&
      (!rechargeCode ||
        rechargeCode.licenseId !== license.id ||
        !['available', 'redeemed'].includes(rechargeCode.status))
    ) {
      throw new PurchaseError('redeem_code_unavailable', 409);
    }
    const redeem =
      rechargeCode ??
      (await tx.redeemCode.create({
        data: {
          code: generateRedeemCode(),
          fulfillmentKey: `token-purchase:${purchase.id}:redeem`,
          licenseId: license.id,
          orderId: order.id,
          metadata: { tokenPurchaseId: purchase.id, purchaseType: 'one_time' },
        },
      }));
    if (rechargeCode) {
      // Paid recharge promotes the existing trial code without deleting its
      // trial identity/history (which must still block another free trial).
      await tx.license.update({
        where: { id: license.id },
        data: { deviceLimit: UNLIMITED_DEVICE_LIMIT },
      });
      await tx.redeemCode.update({
        where: { id: redeem.id },
        data: { expiresAt: null },
      });
    }
    await tx.tokenLedger.create({
      data: {
        idempotencyKey: `token-purchase:${purchase.id}:credit`,
        licenseId: license.id,
        orderId: order.id,
        redeemCodeId: redeem.id,
        type: 'purchase_credit',
        status: 'posted',
        deltaTokens: purchase.totalTokens,
        description: `${purchase.packName} one-time purchase`,
        metadata: { tokenPurchaseId: purchase.id, purchaseType: 'one_time' },
      },
    });
    await tx.tokenPurchase.update({
      where: { id: purchase.id },
      data: {
        orderId: order.id,
        redeemCodeId: redeem.id,
        status: 'paid',
        payerEmail: attrs.user_email,
        emailNextAttemptAt: new Date(),
      },
    });
    await tx.webhookEvent.upsert({
      where: { lsEventId: `order_created:${event.data.id}` },
      create: {
        lsEventId: `order_created:${event.data.id}`,
        type: 'order_created',
        orderId: order.id,
        status: 'processed',
        processedAt: new Date(),
        payload: event as unknown as Prisma.InputJsonValue,
      },
      update: {
        orderId: order.id,
        status: 'processed',
        processedAt: new Date(),
      },
    });
    return { purchaseId, orderId: order.id, status: 'processed' as const };
  });
  // Durable outbox: retries never repeat fulfillment or reset a redeemed code.
  await deliverPurchaseEmails({ purchaseId: result.purchaseId });
  return result;
};
