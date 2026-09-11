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
vi.mock('@/server/provider-gateway/manifest', () => ({
  getProviderGatewayManifestWithRuntimeConfig: vi.fn().mockResolvedValue({
    ocr: { defaultProvider: 'google_cloud_vision' },
    translation: { defaultProvider: 'openai', providers: [] },
  }),
}));
vi.mock('@/server/s3', () => ({
  uploadClient: {},
  objectStorageBuckets: {},
  shouldUseInlineObjectStorage: true,
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
import { createTranslationJob } from '@/server/jobs/service';
import { redeemLicenseToDeviceWithContext } from '@/server/licenses/redeem';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
import { generateRedeemCode } from '@/server/licenses/utils';
import { getDeviceSavedCodes } from '@/server/mobile-auth/saved-codes';
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
const setup = async (
  targetLicenseId?: string,
  targetCode?: string,
  options: { tokens?: number; installationId?: string } = {}
) => {
  const variantId = String(Date.now() * 100 + Math.floor(Math.random() * 100));
  const pack = await db.tokenPack.create({
    data: {
      key: 'test-' + randomUUID(),
      name: 'Local test pack',
      tokenAmount: options.tokens ?? 250,
      bonusTokenAmount: 0,
      priceAmountCents: 200,
      currency: 'usd',
      billingType: 'one_time',
      lsVariantId: variantId,
    },
  });
  const installationId = options.installationId ?? installation();
  testPackIds.push(pack.id);
  const checkout = await createTokenPurchaseCheckout(
    {
      tokenPackKey: pack.key,
      installationId,
      payerEmail: 'buyer@example.test',
      destination: targetCode ? 'recharge' : 'new_code',
      redeemCode: targetCode,
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
      const code = await db.redeemCode.create({
        data: { licenseId: account.id, code: generateRedeemCode() },
      });
      await db.tokenLedger.create({
        data: {
          licenseId: account.id,
          type: 'admin_adjustment',
          deltaTokens: 73,
          status: 'posted',
        },
      });
      const { checkout, event, installationId } = await setup(
        account.id,
        code.code
      );
      await processTokenPurchaseEvent(event);
      const result = await activateTokenPurchase(
        activationInput(checkout.ticket, installationId),
        { currentLicenseId: account.id }
      );
      expect(result.result.activation.license.id).toBe(account.id);
      expect(result.result.activation.license.availableTokens).toBe(323);
      expect(result.result.activation.redeemCode.code).toBe(code.code);
      expect(
        await db.redeemCode.count({ where: { licenseId: account.id } })
      ).toBe(1);
    });

    it('never merges a web purchase on return, even after switching the active code', async () => {
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
      expect(result.result.activation.license.id).not.toBe(account.id);
      expect(
        await getAvailableLicenseTokenBalance({ licenseId: account.id })
      ).toBe(0);
      const retry = await activateTokenPurchase(
        activationInput(checkout.ticket, installationId),
        { currentLicenseId: other.id }
      );
      expect(retry.result.activation.license.id).toBe(
        result.result.activation.license.id
      );
      await expect(
        activateTokenPurchase(activationInput(checkout.ticket, installation()))
      ).rejects.toMatchObject({ code: 'purchase_ticket_used' });
      expect(
        await getAvailableLicenseTokenBalance({ licenseId: other.id })
      ).toBe(0);
    });

    it('keeps A=4250 and B=1250 separate, retains both on the buyer device, and exposes only A to its recipient', async () => {
      const a = await setup(undefined, undefined, { tokens: 4250 });
      await processTokenPurchaseEvent(a.event);
      const activatedA = (
        await activateTokenPurchase(
          activationInput(a.checkout.ticket, a.installationId)
        )
      ).result.activation;
      const b = await setup(activatedA.license.id, undefined, {
        tokens: 1250,
        installationId: a.installationId,
      });
      await processTokenPurchaseEvent(b.event);
      const activatedB = (
        await activateTokenPurchase(
          activationInput(b.checkout.ticket, b.installationId),
          { currentLicenseId: activatedA.license.id }
        )
      ).result.activation;
      expect(activatedB.license.id).not.toBe(activatedA.license.id);
      expect(activatedB.license.availableTokens).toBe(1250);
      expect(
        await getAvailableLicenseTokenBalance({
          licenseId: activatedA.license.id,
        })
      ).toBe(4250);
      const buyerCodes = await getDeviceSavedCodes(activatedB.device.id);
      expect(buyerCodes.codes).toHaveLength(2);
      expect(
        buyerCodes.codes
          .map((code) => code.availableTokens)
          .sort((x, y) => x - y)
      ).toEqual([1250, 4250]);

      const salim = installation();
      await prepareTokenPurchaseClaim({
        redeemCode: activatedA.redeemCode.code,
        installationId: salim,
        currentLicenseId: activatedB.license.id,
      });
      const shared = (
        await redeemLicenseToDeviceWithContext({
          redeemCode: activatedA.redeemCode.code,
          installationId: salim,
          platform: 'android',
        })
      ).activation;
      expect(shared.license.id).toBe(activatedA.license.id);
      const salimCodes = await getDeviceSavedCodes(shared.device.id);
      expect(salimCodes.codes.map((code) => code.licenseId)).toEqual([
        activatedA.license.id,
      ]);

      // Exhaust A only: the actual ledger and reservation balance reader are
      // license-scoped. B is neither transferred nor offered as a fallback.
      await db.tokenLedger.create({
        data: {
          licenseId: shared.license.id,
          deviceId: shared.device.id,
          type: 'job_spend',
          status: 'posted',
          deltaTokens: -4250,
        },
      });
      expect(
        await getAvailableLicenseTokenBalance({ licenseId: shared.license.id })
      ).toBe(0);
      await expect(
        createTranslationJob(
          {
            targetLanguage: 'fr',
            pages: [
              { fileName: 'page.png', mimeType: 'image/png', sizeBytes: 100 },
            ],
          },
          {
            actor: { deviceId: shared.device.id, licenseId: shared.license.id },
          }
        )
      ).rejects.toMatchObject({ code: 'insufficient_tokens' });
      expect(
        await getAvailableLicenseTokenBalance({
          licenseId: activatedB.license.id,
        })
      ).toBe(1250);
      const switchedBack = (
        await redeemLicenseToDeviceWithContext({
          redeemCode: activatedA.redeemCode.code,
          installationId: a.installationId,
          platform: 'android',
        })
      ).activation;
      expect(switchedBack.license.id).toBe(activatedA.license.id);
      expect(switchedBack.license.availableTokens).toBe(0);
    });

    it('reuses the exact redeem for concurrent recharges and keeps return tickets independent', async () => {
      const first = await setup();
      await processTokenPurchaseEvent(first.event);
      const activation = (
        await activateTokenPurchase(
          activationInput(first.checkout.ticket, first.installationId)
        )
      ).result.activation;
      const [topup1, topup2] = await Promise.all([
        setup(activation.license.id, activation.redeemCode.code),
        setup(activation.license.id, activation.redeemCode.code),
      ]);
      await Promise.all([
        processTokenPurchaseEvent(topup1.event),
        processTokenPurchaseEvent(topup2.event),
        processTokenPurchaseEvent(topup1.event),
      ]);
      expect(
        await getAvailableLicenseTokenBalance({
          licenseId: activation.license.id,
        })
      ).toBe(750);
      expect(
        await db.redeemCode.count({
          where: { licenseId: activation.license.id },
        })
      ).toBe(1);
      expect(
        (await getTokenPurchaseStatus({ ticket: topup1.checkout.ticket }))
          .activated
      ).toBe(false);
      for (const topup of [topup1, topup2]) {
        const paid = await db.tokenPurchase.findUniqueOrThrow({
          where: { id: topup.checkout.purchaseId },
          include: { redeemCode: true },
        });
        expect(paid.redeemCode?.code).toBe(activation.redeemCode.code);
        expect(paid.emailSentAt).not.toBeNull();
        const resumed = await activateTokenPurchase(
          activationInput(topup.checkout.ticket, topup.installationId)
        );
        expect(resumed.result.activation.redeemCode.code).toBe(
          activation.redeemCode.code
        );
      }
    });

    it('upgrades a trial code in place without deleting the one-trial claim', async () => {
      const ownerInstallation = installation();
      const license = await db.license.create({ data: { status: 'active' } });
      const redeem = await db.redeemCode.create({
        data: {
          code: generateRedeemCode(),
          licenseId: license.id,
          metadata: { source: 'free_trial' },
        },
      });
      const email = randomUUID() + '@example.test';
      const claim = await db.freeTrialClaim.create({
        data: {
          email,
          emailNormalized: email,
          installationId: ownerInstallation,
          licenseId: license.id,
          redeemCodeId: redeem.id,
        },
      });
      await db.tokenLedger.create({
        data: {
          licenseId: license.id,
          redeemCodeId: redeem.id,
          type: 'admin_adjustment',
          status: 'posted',
          deltaTokens: 25,
        },
      });
      const topup = await setup(license.id, redeem.code, {
        installationId: ownerInstallation,
      });
      await processTokenPurchaseEvent(topup.event);
      const result = await activateTokenPurchase(
        activationInput(topup.checkout.ticket, ownerInstallation)
      );
      expect(result.result.activation.redeemCode.code).toBe(redeem.code);
      expect(result.result.activation.license.availableTokens).toBe(275);
      const external = await redeemLicenseToDeviceWithContext({
        redeemCode: redeem.code,
        installationId: installation(),
        platform: 'android',
      });
      expect(external.activation.license.availableTokens).toBe(275);
      expect(
        await db.freeTrialClaim.findUnique({ where: { id: claim.id } })
      ).not.toBeNull();
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
