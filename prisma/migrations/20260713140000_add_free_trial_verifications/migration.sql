-- CreateTable
CREATE TABLE "free_trial_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceFingerprintHash" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "redeemCodeId" TEXT NOT NULL,
    "tokenAmount" INTEGER NOT NULL DEFAULT 25,
    "deliveryMode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_trial_verifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "free_trial_verifications_tokenAmount_check" CHECK ("tokenAmount" > 0),
    CONSTRAINT "free_trial_verifications_deliveryMode_check" CHECK ("deliveryMode" IN ('direct', 'email_code')),
    CONSTRAINT "free_trial_verifications_terminal_state_check" CHECK (NOT ("consumedAt" IS NOT NULL AND "canceledAt" IS NOT NULL))
);

-- CreateIndex
CREATE UNIQUE INDEX "redeem_codes_id_licenseId_key" ON "redeem_codes"("id", "licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_verifications_installationId_key" ON "free_trial_verifications"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_verifications_deviceFingerprintHash_key" ON "free_trial_verifications"("deviceFingerprintHash");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_verifications_licenseId_key" ON "free_trial_verifications"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_verifications_redeemCodeId_key" ON "free_trial_verifications"("redeemCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_verifications_redeemCodeId_licenseId_key" ON "free_trial_verifications"("redeemCodeId", "licenseId");

-- CreateIndex
CREATE INDEX "free_trial_verifications_emailNormalized_expiresAt_idx" ON "free_trial_verifications"("emailNormalized", "expiresAt");

-- CreateIndex
CREATE INDEX "free_trial_verifications_expiresAt_consumedAt_canceledAt_idx" ON "free_trial_verifications"("expiresAt", "consumedAt", "canceledAt");

-- AddForeignKey
ALTER TABLE "free_trial_verifications" ADD CONSTRAINT "free_trial_verifications_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_trial_verifications" ADD CONSTRAINT "free_trial_verifications_redeemCodeId_licenseId_fkey" FOREIGN KEY ("redeemCodeId", "licenseId") REFERENCES "redeem_codes"("id", "licenseId") ON DELETE CASCADE ON UPDATE CASCADE;
