/* eslint-disable no-process-env */
// This explicit loopback-only test gate must never load the application's database environment.
import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/env/server', () => ({
  envServer: {
    LOGGER_LEVEL: 'error',
    MOBILE_API_ENABLED: true,
    MOBILE_API_JWT_SECRET: 'local-token-tests-only-not-a-real-secret',
    MOBILE_API_ACCESS_TOKEN_TTL_SECONDS: 600,
    MOBILE_API_REFRESH_TOKEN_TTL_SECONDS: 86400,
    MOBILE_API_ISSUER: 'nayovi-test',
    MOBILE_API_AUDIENCE: 'nayovi-android',
    LEMONSQUEEZY_ENABLED: true,
    LEMONSQUEEZY_TEST_MODE: true,
    LEMONSQUEEZY_STORE_ID: '123',
    LEMONSQUEEZY_API_KEY: 'test-only',
    LEMONSQUEEZY_WEBHOOK_SECRET: 'test-webhook-secret',
    JOB_TOKENS_PER_CHAPTER: 10,
  },
}));
vi.mock('@/env/client', () => ({
  envClient: {
    VITE_ENV_NAME: 'local',
    VITE_IS_DEMO: false,
    VITE_BASE_URL: 'https://tachiyomiat.com',
  },
}));
vi.mock('@/server/db', async () => {
  const { PrismaClient } = await import('@/server/db/generated/client');
  const url =
    process.env.NAYOVI_PURCHASE_TEST_DB ??
    'postgresql://localhost:1/nayovi_token_packs_unused';
  const parsed = new URL(url);
  if (
    !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
    !parsed.pathname.startsWith('/nayovi_token_packs')
  ) {
    throw new Error(
      'Purchase integration tests require a dedicated loopback database.'
    );
  }
  return { db: new PrismaClient({ datasources: { db: { url } } }) };
});
vi.mock('@/server/email', () => ({
  sendEmail: vi
    .fn()
    .mockResolvedValue({ accepted: ['buyer@example.test'], rejected: [] }),
}));
vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: vi.fn(),
  getVariant: vi.fn().mockResolvedValue({
    data: { data: { attributes: { is_subscription: false } } },
  }),
  createCheckout: vi.fn().mockImplementation(async () => ({
    data: {
      data: {
        id: randomUUID(),
        attributes: {
          test_mode: true,
          url: 'https://nayovi.lemonsqueezy.com/checkout/test',
        },
      },
    },
  })),
}));

import { getVariant } from '@lemonsqueezy/lemonsqueezy.js';

import { db } from '@/server/db';
import { sendEmail } from '@/server/email';
import { redeemLicenseToDeviceWithContext } from '@/server/licenses/redeem';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
import { verifyLemonSqueezyWebhookSignature } from '@/server/payments/lemonsqueezy';
import { createTokenPurchaseCheckout } from '@/server/payments/token-purchase-checkout';
import {
  activateTokenPurchase,
  getTokenPurchaseStatus,
  prepareTokenPurchaseClaim,
} from '@/server/payments/token-purchase-claim';
import { processTokenPurchaseEvent } from '@/server/payments/token-purchase-fulfillment';
import { deliverPurchaseEmails } from '@/server/payments/token-purchase-mail';

const installation = () => 'nayovi-test-' + randomUUID();
const testPackIds: string[] = [];
const setup = async (targetLicenseId?: string) => {
  const variantId = String(Date.now() * 100 + Math.floor(Math.random() * 100));
  const pack = await db.tokenPack.create({
    data: {
      key: 'test-' + randomUUID(),
      name: 'Local test pack',
      tokenAmount: 250,
      bonusTokenAmount: 0,
      priceAmountCents: 200,
      currency: 'usd',
      billingType: 'one_time',
      lsVariantId: variantId,
    },
  });
  const installationId = installation();
  testPackIds.push(pack.id);
  const checkout = await createTokenPurchaseCheckout(
    {
      tokenPackKey: pack.key,
      installationId,
      payerEmail: 'buyer@example.test',
    },
    { licenseId: targetLicenseId, installationId }
  );
  const event = {
    meta: {
      event_name: 'order_created',
      test_mode: true,
      custom_data: { token_purchase_id: checkout.purchaseId },
    },
    data: {
      id: randomUUID(),
      attributes: {
        status: 'paid',
        test_mode: true,
        store_id: '123',
        currency: 'USD',
        user_email: 'buyer@example.test',
        subtotal: 200,
        total: 240,
        discount_total: 0,
        first_order_item: { variant_id: variantId, quantity: 1 },
      },
    },
  };
  return { pack, installationId, checkout, event };
};
const activationInput = (ticket: string, installationId: string) => ({
  ticket,
  installationId,
  platform: 'android',
  appVersion: 'local',
  locale: 'en',
});

describe.skipIf(!process.env.NAYOVI_PURCHASE_TEST_DB)(
  'one-time purchases — isolated PostgreSQL integration',
  () => {
    afterAll(async () => {
      await db.tokenPack.updateMany({
        where: { id: { in: testPackIds } },
        data: { active: false },
      });
      await db.$disconnect();
    });

    it('accepts only an exact signature, including malformed length and modified bodies', () => {
      const payload = '{"paid":true}';
      const signature = createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');
      expect(verifyLemonSqueezyWebhookSignature({ payload, signature })).toBe(
        true
      );
      expect(
        verifyLemonSqueezyWebhookSignature({
          payload: payload + ' ',
          signature,
        })
      ).toBe(false);
      expect(
        verifyLemonSqueezyWebhookSignature({ payload, signature: 'bad' })
      ).toBe(false);
    });

    it('does not activate a redirect before the payment webhook', async () => {
      const { checkout, installationId } = await setup();
      await expect(
        activateTokenPurchase(activationInput(checkout.ticket, installationId))
      ).rejects.toMatchObject({ code: 'payment_pending' });
      expect(
        await db.order.count({
          where: { tokenPurchase: { id: checkout.purchaseId } },
        })
      ).toBe(0);
    });

    it('fulfills concurrent duplicate webhooks once using snapshotted quantities', async () => {
      const { checkout, pack, event, installationId } = await setup();
      await db.tokenPack.update({
        where: { id: pack.id },
        data: { tokenAmount: 9999 },
      });
      await Promise.all([
        processTokenPurchaseEvent(event),
        processTokenPurchaseEvent(event),
        processTokenPurchaseEvent(event),
      ]);
      const purchase = await db.tokenPurchase.findUniqueOrThrow({
        where: { id: checkout.purchaseId },
        include: { redeemCode: true },
      });
      expect(
        await db.tokenLedger.count({ where: { orderId: purchase.orderId } })
      ).toBe(1);
      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
      const first = await activateTokenPurchase(
        activationInput(checkout.ticket, installationId)
      );
      expect(first.result.activation.license.availableTokens).toBe(250);
      const retry = await activateTokenPurchase(
        activationInput(checkout.ticket, installationId)
      );
      expect(retry.result.activation.license.id).toBe(
        first.result.activation.license.id
      );
      expect(retry.result.activation.license.availableTokens).toBe(250);
      const code = purchase.redeemCode!.code;
      await prepareTokenPurchaseClaim({
        redeemCode: code,
        installationId,
        currentLicenseId: first.result.activation.license.id,
      });
      await redeemLicenseToDeviceWithContext({
        redeemCode: code,
        installationId,
        platform: 'android',
      });
      expect(
        await getAvailableLicenseTokenBalance({
          licenseId: first.result.activation.license.id,
        })
      ).toBe(250);
      expect(
        await getTokenPurchaseStatus({ ticket: checkout.ticket })
      ).toMatchObject({ state: 'paid', activated: true });
    });

    it('tops up the current account without replacing its existing balance', async () => {
      const account = await db.license.create({
        data: { status: 'active', deviceLimit: 999 },
      });
      await db.tokenLedger.create({
        data: {
          licenseId: account.id,
          type: 'admin_adjustment',
          deltaTokens: 73,
          status: 'posted',
        },
      });
      const { checkout, event, installationId } = await setup(account.id);
      await processTokenPurchaseEvent(event);
      const result = await activateTokenPurchase(
        activationInput(checkout.ticket, installationId),
        { currentLicenseId: account.id }
      );
      expect(result.result.activation.license.id).toBe(account.id);
      expect(result.result.activation.license.availableTokens).toBe(323);
    });

    it('merges only an unclaimed web grant, and rejects another account/device afterwards', async () => {
      const account = await db.license.create({
        data: { status: 'active', deviceLimit: 999 },
      });
      const other = await db.license.create({ data: { status: 'active' } });
      const { checkout, event, installationId } = await setup();
      await db.tokenPurchase.update({
        where: { id: checkout.purchaseId },
        data: { installationId: null },
      });
      await processTokenPurchaseEvent(event);
      const result = await activateTokenPurchase(
        activationInput(checkout.ticket, installationId),
        { currentLicenseId: account.id }
      );
      expect(result.result.activation.license.id).toBe(account.id);
      await expect(
        activateTokenPurchase(
          activationInput(checkout.ticket, installationId),
          { currentLicenseId: other.id }
        )
      ).rejects.toMatchObject({ code: 'purchase_account_mismatch' });
      await expect(
        activateTokenPurchase(activationInput(checkout.ticket, installation()))
      ).rejects.toMatchObject({ code: 'purchase_ticket_used' });
      expect(
        await getAvailableLicenseTokenBalance({ licenseId: other.id })
      ).toBe(0);
    });

    it('rejects wrong store, variant, currency, test mode, amount, and quantity without credit', async () => {
      const { checkout, event } = await setup();
      for (const attrs of [
        { store_id: '999' },
        { currency: 'EUR' },
        { test_mode: false },
        { subtotal: 1 },
        { first_order_item: { variant_id: '999', quantity: 1 } },
        {
          first_order_item: {
            variant_id: event.data.attributes.first_order_item.variant_id,
            quantity: 2,
          },
        },
      ]) {
        await expect(
          processTokenPurchaseEvent({
            ...event,
            data: {
              ...event.data,
              attributes: { ...event.data.attributes, ...attrs },
            },
          })
        ).rejects.toMatchObject({ code: 'purchase_payment_mismatch' });
      }
      expect(
        (
          await db.tokenPurchase.findUniqueOrThrow({
            where: { id: checkout.purchaseId },
          })
        ).status
      ).toBe('pending');
    });

    it('retries failed mail delivery without minting another grant or changing the redeem code', async () => {
      const { checkout, event } = await setup();
      vi.mocked(sendEmail).mockRejectedValueOnce(
        new Error('local smtp unavailable')
      );
      await processTokenPurchaseEvent(event);
      const first = await db.tokenPurchase.findUniqueOrThrow({
        where: { id: checkout.purchaseId },
      });
      expect(first.emailSentAt).toBeNull();
      expect(first.emailAttempts).toBe(1);
      await db.tokenPurchase.update({
        where: { id: first.id },
        data: { emailNextAttemptAt: new Date(0) },
      });
      await deliverPurchaseEmails({ purchaseId: first.id });
      const second = await db.tokenPurchase.findUniqueOrThrow({
        where: { id: first.id },
      });
      expect(second.emailSentAt).not.toBeNull();
      expect(second.emailAttempts).toBe(2);
      expect(second.redeemCodeId).toBe(first.redeemCodeId);
      expect(
        await db.tokenLedger.count({ where: { orderId: first.orderId } })
      ).toBe(1);
    });

    it('expired return links can still recover with the same email code', async () => {
      const { checkout, event, installationId } = await setup();
      await processTokenPurchaseEvent(event);
      const purchase = await db.tokenPurchase.update({
        where: { id: checkout.purchaseId },
        data: { ticketExpiresAt: new Date(0) },
        include: { redeemCode: true },
      });
      await expect(
        activateTokenPurchase(activationInput(checkout.ticket, installationId))
      ).rejects.toMatchObject({ code: 'purchase_ticket_expired' });
      expect(
        await prepareTokenPurchaseClaim({
          redeemCode: purchase.redeemCode!.code,
          installationId,
        })
      ).toMatchObject({ totalTokens: 250 });
    });

    it('refuses a subscription variant for a one-time pack', async () => {
      vi.mocked(getVariant).mockResolvedValueOnce({
        data: { data: { attributes: { is_subscription: true } } },
      } as Awaited<ReturnType<typeof getVariant>>);
      await expect(setup()).rejects.toMatchObject({
        code: 'one_time_variant_required',
      });
    });
  }
);
