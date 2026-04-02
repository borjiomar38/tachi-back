-- Extend orders so recurring Stripe subscriptions can create one order per paid invoice.
ALTER TABLE "orders"
ADD COLUMN "stripeInvoiceId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "billingReason" TEXT,
ADD COLUMN "billingPeriodStart" TIMESTAMP(3),
ADD COLUMN "billingPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX "orders_stripeInvoiceId_key" ON "orders"("stripeInvoiceId");
CREATE INDEX "orders_stripeSubscriptionId_idx" ON "orders"("stripeSubscriptionId");
