import { normalizeRedeemCode } from '@/server/licenses/utils';
import {
  createPurchaseTicket,
  hashPurchaseTicket,
  PURCHASE_TICKET_TTL_MS,
} from '@/server/payments/purchase-policy';

import { oneTimeTokenPacks } from '../prisma/seed/token-pack';
import { PrismaClient } from '../src/server/db/generated/client';

const main = async () => {
  const url = process.env.NAYOVI_PURCHASE_TEST_DB;
  if (!url)
    throw new Error(
      'Set NAYOVI_PURCHASE_TEST_DB to a dedicated loopback database.'
    );
  const parsed = new URL(url);
  if (
    !['127.0.0.1', 'localhost'].includes(parsed.hostname) ||
    !parsed.pathname.startsWith('/nayovi_token_packs')
  ) {
    throw new Error(
      'Local-only fixture. Refusing a shared or remote database.'
    );
  }
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    // Only our synthetic integration-test catalog entries are hidden from local preview.
    await db.tokenPack.updateMany({
      where: { key: { startsWith: 'test-' }, name: 'Local test pack' },
      data: { active: false },
    });
    for (const pack of oneTimeTokenPacks)
      await db.tokenPack.upsert({
        where: { key: pack.key },
        create: { ...pack, billingType: 'one_time', currency: 'usd' },
        update: {},
      });
    const license = await db.license.upsert({
      where: { fulfillmentKey: 'local-wallet-preview' },
      create: {
        fulfillmentKey: 'local-wallet-preview',
        status: 'active',
        ownerEmail: 'wallet@example.test',
        deviceLimit: 999,
      },
      update: {},
    });
    const redeemCode = normalizeRedeemCode('TB-LOCAL-WALLET-DEMO');
    await db.redeemCode.upsert({
      where: { code: redeemCode },
      create: { code: redeemCode, licenseId: license.id },
      update: {},
    });
    await db.tokenLedger.upsert({
      where: { idempotencyKey: 'local-wallet-preview:balance' },
      create: {
        idempotencyKey: 'local-wallet-preview:balance',
        licenseId: license.id,
        type: 'admin_adjustment',
        status: 'posted',
        deltaTokens: 2450,
        description: 'Isolated local UX fixture — no monetary value',
      },
      update: {},
    });
    console.log(
      `Local preview ready. Demo redeem code: ${redeemCode} (local database only).`
    );
    if (process.argv.includes('--simulate-purchase-return')) {
      // LOCAL UI FIXTURE ONLY. This simulates the already-paid database state;
      // signed-webhook verification is covered separately by integration tests.
      const ticket = createPurchaseTicket();
      await db.$transaction(async (tx) => {
        const pack = await tx.tokenPack.findUniqueOrThrow({
          where: { key: 'starter-tokens' },
        });
        const order = await tx.order.upsert({
          where: { lsOrderId: 'local-wallet-preview-order' },
          create: {
            lsOrderId: 'local-wallet-preview-order',
            tokenPackId: pack.id,
            licenseId: license.id,
            status: 'paid',
            payerEmail: 'wallet@example.test',
            currency: 'usd',
            amountSubtotalCents: 200,
            amountTotalCents: 200,
          },
          update: {},
        });
        const code = await tx.redeemCode.upsert({
          where: { code: 'TB-LOCA-LPAI-D250' },
          create: {
            code: 'TB-LOCA-LPAI-D250',
            licenseId: license.id,
            orderId: order.id,
          },
          update: {},
        });
        const purchase = await tx.tokenPurchase.upsert({
          where: { checkoutId: 'local-wallet-preview-checkout' },
          create: {
            checkoutId: 'local-wallet-preview-checkout',
            tokenPackId: pack.id,
            packKey: pack.key,
            packName: pack.name,
            totalTokens: 250,
            priceAmountCents: 200,
            currency: 'usd',
            lsVariantId: 'local-simulation-only',
            testMode: true,
            targetLicenseId: license.id,
            ticketHash: hashPurchaseTicket(ticket),
            ticketExpiresAt: new Date(Date.now() + PURCHASE_TICKET_TTL_MS),
            status: 'paid',
            orderId: order.id,
            redeemCodeId: code.id,
          },
          update: {
            ticketHash: hashPurchaseTicket(ticket),
            ticketExpiresAt: new Date(Date.now() + PURCHASE_TICKET_TTL_MS),
          },
        });
        await tx.tokenLedger.upsert({
          where: { idempotencyKey: `token-purchase:${purchase.id}:credit` },
          create: {
            idempotencyKey: `token-purchase:${purchase.id}:credit`,
            licenseId: license.id,
            orderId: order.id,
            redeemCodeId: code.id,
            type: 'purchase_credit',
            status: 'posted',
            deltaTokens: 250,
            metadata: {
              purchaseType: 'one_time',
              tokenPurchaseId: purchase.id,
            },
            description: 'LOCAL UI SIMULATION — no payment',
          },
          update: {},
        });
      });
      console.log(
        `LOCAL simulated return: https://tachiyomiat.com/app/payment#ticket=${ticket}`
      );
    }
  } finally {
    await db.$disconnect();
  }
};
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Fixture failed');
  process.exitCode = 1;
});
