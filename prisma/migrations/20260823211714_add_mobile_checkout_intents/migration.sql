-- CreateEnum
CREATE TYPE "MobileCheckoutStatus" AS ENUM ('pending', 'paid', 'canceled', 'expired');

-- CreateTable
CREATE TABLE "mobile_checkout_intents" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "licenseId" TEXT,
    "tokenPackId" TEXT NOT NULL,
    "initiatingSessionId" TEXT,
    "orderId" TEXT,
    "lsCheckoutId" TEXT,
    "payerEmail" TEXT,
    "status" "MobileCheckoutStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "lastClaimedAt" TIMESTAMP(3),
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_checkout_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_checkout_intents_tokenHash_key" ON "mobile_checkout_intents"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_checkout_intents_orderId_key" ON "mobile_checkout_intents"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_checkout_intents_lsCheckoutId_key" ON "mobile_checkout_intents"("lsCheckoutId");

-- CreateIndex
CREATE INDEX "mobile_checkout_intents_deviceId_status_createdAt_idx" ON "mobile_checkout_intents"("deviceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "mobile_checkout_intents_licenseId_status_createdAt_idx" ON "mobile_checkout_intents"("licenseId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "mobile_checkout_intents_tokenPackId_status_createdAt_idx" ON "mobile_checkout_intents"("tokenPackId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "mobile_checkout_intents" ADD CONSTRAINT "mobile_checkout_intents_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_checkout_intents" ADD CONSTRAINT "mobile_checkout_intents_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_checkout_intents" ADD CONSTRAINT "mobile_checkout_intents_tokenPackId_fkey" FOREIGN KEY ("tokenPackId") REFERENCES "token_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_checkout_intents" ADD CONSTRAINT "mobile_checkout_intents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
