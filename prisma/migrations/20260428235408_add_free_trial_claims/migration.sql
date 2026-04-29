-- CreateTable
CREATE TABLE "free_trial_claims" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "redeemCodeId" TEXT NOT NULL,
    "tokenAmount" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_trial_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_claims_emailNormalized_key" ON "free_trial_claims"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_claims_installationId_key" ON "free_trial_claims"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_claims_licenseId_key" ON "free_trial_claims"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_claims_redeemCodeId_key" ON "free_trial_claims"("redeemCodeId");

-- CreateIndex
CREATE INDEX "free_trial_claims_createdAt_idx" ON "free_trial_claims"("createdAt");

-- AddForeignKey
ALTER TABLE "free_trial_claims" ADD CONSTRAINT "free_trial_claims_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_trial_claims" ADD CONSTRAINT "free_trial_claims_redeemCodeId_fkey" FOREIGN KEY ("redeemCodeId") REFERENCES "redeem_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
