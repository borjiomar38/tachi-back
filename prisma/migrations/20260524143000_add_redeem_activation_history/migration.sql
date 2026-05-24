-- CreateTable
CREATE TABLE "redeem_activations" (
    "id" TEXT NOT NULL,
    "redeemCodeId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "activationCount" INTEGER NOT NULL DEFAULT 1,
    "firstActivatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIpAddress" TEXT,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "appBuild" TEXT,
    "buildChannel" TEXT,
    "locale" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redeem_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "redeem_activations_redeemCodeId_lastActivatedAt_idx" ON "redeem_activations"("redeemCodeId", "lastActivatedAt");

-- CreateIndex
CREATE INDEX "redeem_activations_licenseId_lastActivatedAt_idx" ON "redeem_activations"("licenseId", "lastActivatedAt");

-- CreateIndex
CREATE INDEX "redeem_activations_deviceId_lastActivatedAt_idx" ON "redeem_activations"("deviceId", "lastActivatedAt");

-- CreateIndex
CREATE INDEX "redeem_activations_installationId_idx" ON "redeem_activations"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "redeem_activations_redeemCodeId_deviceId_key" ON "redeem_activations"("redeemCodeId", "deviceId");

-- AddForeignKey
ALTER TABLE "redeem_activations" ADD CONSTRAINT "redeem_activations_redeemCodeId_fkey" FOREIGN KEY ("redeemCodeId") REFERENCES "redeem_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_activations" ADD CONSTRAINT "redeem_activations_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_activations" ADD CONSTRAINT "redeem_activations_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

