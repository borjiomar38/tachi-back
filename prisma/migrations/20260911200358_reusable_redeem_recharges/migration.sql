-- DropIndex
DROP INDEX "token_purchases_redeemCodeId_key";

-- AlterTable
ALTER TABLE "token_purchases" ADD COLUMN     "targetRedeemCodeId" TEXT;

-- CreateIndex
CREATE INDEX "token_purchases_redeemCodeId_idx" ON "token_purchases"("redeemCodeId");

-- CreateIndex
CREATE INDEX "token_purchases_targetRedeemCodeId_idx" ON "token_purchases"("targetRedeemCodeId");

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_targetRedeemCodeId_fkey" FOREIGN KEY ("targetRedeemCodeId") REFERENCES "redeem_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
