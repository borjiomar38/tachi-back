/*
  Warnings:

  - The values [stripe] on the enum `PaymentProvider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `stripeCheckoutSessionId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentIntentId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `token_packs` table. All the data in the column will be lost.
  - You are about to drop the `stripe_events` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[lsOrderId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lsVariantId]` on the table `token_packs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('received', 'processed', 'ignored', 'failed');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('lemonsqueezy', 'manual');
ALTER TABLE "public"."orders" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "public"."PaymentProvider_old";
ALTER TABLE "orders" ALTER COLUMN "provider" SET DEFAULT 'lemonsqueezy';
COMMIT;

-- DropForeignKey
ALTER TABLE "stripe_events" DROP CONSTRAINT "stripe_events_orderId_fkey";

-- DropIndex
DROP INDEX "orders_stripeCheckoutSessionId_key";

-- DropIndex
DROP INDEX "orders_stripeInvoiceId_key";

-- DropIndex
DROP INDEX "orders_stripePaymentIntentId_key";

-- DropIndex
DROP INDEX "orders_stripeSubscriptionId_idx";

-- DropIndex
DROP INDEX "token_packs_stripePriceId_key";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "stripeCheckoutSessionId",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeInvoiceId",
DROP COLUMN "stripePaymentIntentId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "lsCustomerId" TEXT,
ADD COLUMN     "lsOrderId" TEXT,
ADD COLUMN     "lsSubscriptionId" TEXT,
ALTER COLUMN "provider" SET DEFAULT 'lemonsqueezy';

-- AlterTable
ALTER TABLE "token_packs" DROP COLUMN "stripePriceId",
ADD COLUMN     "lsVariantId" TEXT;

-- DropTable
DROP TABLE "stripe_events";

-- DropEnum
DROP TYPE "StripeEventStatus";

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "lsEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'received',
    "orderId" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_lsEventId_key" ON "webhook_events"("lsEventId");

-- CreateIndex
CREATE INDEX "webhook_events_status_createdAt_idx" ON "webhook_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_events_orderId_idx" ON "webhook_events"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_lsOrderId_key" ON "orders"("lsOrderId");

-- CreateIndex
CREATE INDEX "orders_lsSubscriptionId_idx" ON "orders"("lsSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "token_packs_lsVariantId_key" ON "token_packs"("lsVariantId");

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
