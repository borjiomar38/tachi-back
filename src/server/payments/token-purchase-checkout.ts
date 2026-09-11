import { createCheckout, getVariant } from '@lemonsqueezy/lemonsqueezy.js';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { initLemonSqueezy } from '@/server/payments/lemonsqueezy';
import {
  buildPurchaseReturnUrl,
  createPurchaseTicket,
  hashPurchaseTicket,
  PURCHASE_TICKET_TTL_MS,
  PurchaseError,
  resolvePurchaseTestMode,
  zPurchaseCheckoutInput,
} from '@/server/payments/purchase-policy';

export const createTokenPurchaseCheckout = async (
  rawInput: unknown,
  context: {
    licenseId?: string;
    installationId?: string;
  } = {}
) => {
  const input = zPurchaseCheckoutInput().parse(rawInput);
  if (!envServer.LEMONSQUEEZY_ENABLED || !envServer.LEMONSQUEEZY_STORE_ID) {
    throw new PurchaseError('checkout_unavailable', 503);
  }
  const testMode = resolvePurchaseTestMode({
    testMode: envServer.LEMONSQUEEZY_TEST_MODE,
    environmentName: envClient.VITE_ENV_NAME,
  });
  if (
    context.installationId &&
    input.installationId !== context.installationId
  ) {
    throw new PurchaseError('purchase_device_mismatch', 403);
  }
  const pack = await db.tokenPack.findFirst({
    where: { key: input.tokenPackKey, active: true, billingType: 'one_time' },
  });
  if (!pack || !pack.lsVariantId)
    throw new PurchaseError('token_pack_unavailable', 409);
  if (
    !Number.isSafeInteger(pack.tokenAmount + pack.bonusTokenAmount) ||
    pack.tokenAmount + pack.bonusTokenAmount <= 0 ||
    pack.priceAmountCents <= 0
  ) {
    throw new PurchaseError('token_pack_unavailable');
  }

  initLemonSqueezy();
  // Never accidentally route a new one-time purchase to an old recurring variant.
  const variant = await getVariant(pack.lsVariantId);
  if (
    variant.error ||
    !variant.data ||
    variant.data.data.attributes.is_subscription
  ) {
    throw new PurchaseError('one_time_variant_required', 409);
  }

  const ticket = createPurchaseTicket();
  const expiresAt = new Date(Date.now() + PURCHASE_TICKET_TTL_MS);
  const purchase = await db.tokenPurchase.create({
    data: {
      tokenPackId: pack.id,
      packKey: pack.key,
      packName: pack.name,
      totalTokens: pack.tokenAmount + pack.bonusTokenAmount,
      priceAmountCents: pack.priceAmountCents,
      currency: pack.currency.toLowerCase(),
      lsVariantId: pack.lsVariantId,
      testMode,
      payerEmail: input.payerEmail,
      targetLicenseId: context.licenseId,
      installationId: input.installationId,
      ticketHash: hashPurchaseTicket(ticket),
      ticketExpiresAt: expiresAt,
    },
  });
  const returnUrl = buildPurchaseReturnUrl(envClient.VITE_BASE_URL, ticket);
  try {
    const checkout = await createCheckout(
      envServer.LEMONSQUEEZY_STORE_ID,
      pack.lsVariantId,
      {
        checkoutData: {
          ...(input.payerEmail ? { email: input.payerEmail } : {}),
          custom: { token_purchase_id: purchase.id },
        },
        checkoutOptions: { embed: false, discount: false },
        productOptions: {
          enabledVariants: [Number(pack.lsVariantId)],
          redirectUrl: returnUrl,
          receiptButtonText: 'Open Nayovi',
          receiptLinkUrl: returnUrl,
        },
        customPrice: pack.priceAmountCents,
        testMode,
        expiresAt: expiresAt.toISOString(),
      }
    );
    if (
      checkout.error ||
      !checkout.data ||
      checkout.data.data.attributes.test_mode !== testMode
    ) {
      throw new PurchaseError('checkout_unavailable', 502);
    }
    const url = new URL(checkout.data.data.attributes.url);
    if (
      url.protocol !== 'https:' ||
      !(
        url.hostname === 'lemonsqueezy.com' ||
        url.hostname.endsWith('.lemonsqueezy.com')
      )
    ) {
      throw new PurchaseError('checkout_unavailable', 502);
    }
    await db.tokenPurchase.update({
      where: { id: purchase.id },
      data: { checkoutId: checkout.data.data.id },
    });
    return { url: url.toString(), ticket, purchaseId: purchase.id };
  } catch (error) {
    await db.tokenPurchase.updateMany({
      where: { id: purchase.id, status: 'pending' },
      data: { status: 'failed' },
    });
    throw error;
  }
};
