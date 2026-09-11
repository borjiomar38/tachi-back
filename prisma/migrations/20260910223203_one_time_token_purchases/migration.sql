-- CreateEnum
CREATE TYPE "TokenPackBillingType" AS ENUM ('subscription', 'one_time');

-- AlterTable
ALTER TABLE "token_packs" ADD COLUMN     "billingType" "TokenPackBillingType" NOT NULL DEFAULT 'subscription';

-- CreateTable
CREATE TABLE "token_purchases" (
    "id" TEXT NOT NULL,
    "tokenPackId" TEXT NOT NULL,
    "packKey" TEXT NOT NULL,
    "packName" TEXT NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "priceAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "lsVariantId" TEXT NOT NULL,
    "testMode" BOOLEAN NOT NULL,
    "payerEmail" TEXT,
    "targetLicenseId" TEXT,
    "claimedLicenseId" TEXT,
    "installationId" TEXT,
    "claimedInstallationId" TEXT,
    "ticketHash" TEXT NOT NULL,
    "ticketExpiresAt" TIMESTAMP(3) NOT NULL,
    "ticketConsumedAt" TIMESTAMP(3),
    "checkoutId" TEXT,
    "orderId" TEXT,
    "redeemCodeId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "claimedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "emailAttempts" INTEGER NOT NULL DEFAULT 0,
    "emailNextAttemptAt" TIMESTAMP(3),
    "emailLeaseUntil" TIMESTAMP(3),
    "lastEmailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_ticketHash_key" ON "token_purchases"("ticketHash");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_checkoutId_key" ON "token_purchases"("checkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_orderId_key" ON "token_purchases"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_redeemCodeId_key" ON "token_purchases"("redeemCodeId");

-- CreateIndex
CREATE INDEX "token_purchases_status_emailSentAt_emailNextAttemptAt_idx" ON "token_purchases"("status", "emailSentAt", "emailNextAttemptAt");

-- CreateIndex
CREATE INDEX "token_purchases_targetLicenseId_createdAt_idx" ON "token_purchases"("targetLicenseId", "createdAt");

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_tokenPackId_fkey" FOREIGN KEY ("tokenPackId") REFERENCES "token_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_targetLicenseId_fkey" FOREIGN KEY ("targetLicenseId") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_claimedLicenseId_fkey" FOREIGN KEY ("claimedLicenseId") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_redeemCodeId_fkey" FOREIGN KEY ("redeemCodeId") REFERENCES "redeem_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
