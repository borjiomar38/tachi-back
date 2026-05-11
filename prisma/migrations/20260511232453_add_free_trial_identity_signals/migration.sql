-- CreateTable
CREATE TABLE "free_trial_identities" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_trial_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "free_trial_identities_claimId_idx" ON "free_trial_identities"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "free_trial_identities_kind_value_key" ON "free_trial_identities"("kind", "value");

-- AddForeignKey
ALTER TABLE "free_trial_identities" ADD CONSTRAINT "free_trial_identities_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "free_trial_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
