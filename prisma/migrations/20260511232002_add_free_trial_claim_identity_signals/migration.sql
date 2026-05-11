/*
  Warnings:

  - A unique constraint covering the columns `[ipAddress]` on the table `free_trial_claims` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[deviceFingerprintHash]` on the table `free_trial_claims` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "free_trial_claims" ADD COLUMN     "deviceFingerprintHash" TEXT,
ADD COLUMN     "ipAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_claims_ipAddress_key" ON "free_trial_claims"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_claims_deviceFingerprintHash_key" ON "free_trial_claims"("deviceFingerprintHash");
