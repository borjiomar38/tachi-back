ALTER TABLE "licenses" ADD COLUMN "fulfillmentKey" TEXT;

ALTER TABLE "redeem_codes" ADD COLUMN "fulfillmentKey" TEXT;

ALTER TABLE "token_ledger" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "licenses_fulfillmentKey_key" ON "licenses"("fulfillmentKey");

CREATE UNIQUE INDEX "redeem_codes_fulfillmentKey_key" ON "redeem_codes"("fulfillmentKey");

CREATE UNIQUE INDEX "token_ledger_idempotencyKey_key" ON "token_ledger"("idempotencyKey");
