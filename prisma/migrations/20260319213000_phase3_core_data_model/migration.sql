-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('pending', 'active', 'suspended', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('android');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('pending', 'active', 'revoked', 'blocked');

-- CreateEnum
CREATE TYPE "DeviceBindingStatus" AS ENUM ('active', 'released', 'revoked');

-- CreateEnum
CREATE TYPE "RedeemCodeStatus" AS ENUM ('available', 'redeemed', 'expired', 'canceled');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('stripe', 'manual');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'canceled', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "StripeEventStatus" AS ENUM ('received', 'processed', 'ignored', 'failed');

-- CreateEnum
CREATE TYPE "TokenLedgerEntryType" AS ENUM ('purchase_credit', 'manual_credit', 'redeem_credit', 'job_reserve', 'job_release', 'job_spend', 'refund_credit', 'expiration_debit', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "TokenLedgerEntryStatus" AS ENUM ('pending', 'posted', 'voided');

-- CreateEnum
CREATE TYPE "TranslationJobStatus" AS ENUM ('created', 'awaiting_upload', 'queued', 'processing', 'completed', 'failed', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "JobAssetKind" AS ENUM ('page_upload', 'result_manifest', 'debug_artifact', 'log_export');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('google_cloud_vision', 'google_cloud_translate', 'gemini', 'openai', 'anthropic', 'openrouter', 'internal');

-- CreateEnum
CREATE TYPE "ProviderUsageStage" AS ENUM ('ocr', 'translation', 'retry', 'postprocess');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "UserRole",
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "onboardedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "status" "LicenseStatus" NOT NULL DEFAULT 'pending',
    "deviceLimit" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL DEFAULT 'android',
    "status" "DeviceStatus" NOT NULL DEFAULT 'pending',
    "appVersion" TEXT,
    "appBuild" TEXT,
    "locale" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastIpAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_devices" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "DeviceBindingStatus" NOT NULL DEFAULT 'active',
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redeem_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "RedeemCodeStatus" NOT NULL DEFAULT 'available',
    "createdByUserId" TEXT,
    "redeemedByDeviceId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redeem_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_packs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tokenAmount" INTEGER NOT NULL,
    "bonusTokenAmount" INTEGER NOT NULL DEFAULT 0,
    "priceAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripePriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'stripe',
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "tokenPackId" TEXT,
    "licenseId" TEXT,
    "payerEmail" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "amountSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "amountDiscountCents" INTEGER NOT NULL DEFAULT 0,
    "amountTotalCents" INTEGER NOT NULL DEFAULT 0,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeCustomerId" TEXT,
    "paidAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "StripeEventStatus" NOT NULL DEFAULT 'received',
    "orderId" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_ledger" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "orderId" TEXT,
    "jobId" TEXT,
    "deviceId" TEXT,
    "redeemCodeId" TEXT,
    "type" "TokenLedgerEntryType" NOT NULL,
    "status" "TokenLedgerEntryStatus" NOT NULL DEFAULT 'posted',
    "deltaTokens" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_jobs" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "TranslationJobStatus" NOT NULL DEFAULT 'created',
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "requestedOcrProvider" "ProviderType",
    "requestedTranslationProvider" "ProviderType",
    "resolvedOcrProvider" "ProviderType",
    "resolvedTranslationProvider" "ProviderType",
    "reservedTokens" INTEGER NOT NULL DEFAULT 0,
    "spentTokens" INTEGER NOT NULL DEFAULT 0,
    "uploadCompletedAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "resultPayloadVersion" TEXT,
    "resultSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_assets" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "JobAssetKind" NOT NULL,
    "bucketName" TEXT,
    "objectKey" TEXT,
    "pageNumber" INTEGER,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "checksumSha256" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_usages" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "stage" "ProviderUsageStage" NOT NULL,
    "modelName" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "costMicros" BIGINT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_key_key" ON "licenses"("key");

-- CreateIndex
CREATE INDEX "licenses_status_createdAt_idx" ON "licenses"("status", "createdAt");

-- CreateIndex
CREATE INDEX "licenses_ownerEmail_idx" ON "licenses"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "devices_installationId_key" ON "devices"("installationId");

-- CreateIndex
CREATE INDEX "devices_status_lastSeenAt_idx" ON "devices"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "license_devices_licenseId_status_idx" ON "license_devices"("licenseId", "status");

-- CreateIndex
CREATE INDEX "license_devices_deviceId_status_idx" ON "license_devices"("deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "license_devices_licenseId_deviceId_key" ON "license_devices"("licenseId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "redeem_codes_code_key" ON "redeem_codes"("code");

-- CreateIndex
CREATE INDEX "redeem_codes_licenseId_status_idx" ON "redeem_codes"("licenseId", "status");

-- CreateIndex
CREATE INDEX "redeem_codes_orderId_idx" ON "redeem_codes"("orderId");

-- CreateIndex
CREATE INDEX "redeem_codes_redeemedByDeviceId_idx" ON "redeem_codes"("redeemedByDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "token_packs_key_key" ON "token_packs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "token_packs_stripePriceId_key" ON "token_packs"("stripePriceId");

-- CreateIndex
CREATE INDEX "token_packs_active_sortOrder_idx" ON "token_packs"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripeCheckoutSessionId_key" ON "orders"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripePaymentIntentId_key" ON "orders"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_payerEmail_idx" ON "orders"("payerEmail");

-- CreateIndex
CREATE INDEX "orders_tokenPackId_idx" ON "orders"("tokenPackId");

-- CreateIndex
CREATE INDEX "orders_licenseId_idx" ON "orders"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_events_stripeEventId_key" ON "stripe_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "stripe_events_status_createdAt_idx" ON "stripe_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "stripe_events_orderId_idx" ON "stripe_events"("orderId");

-- CreateIndex
CREATE INDEX "token_ledger_licenseId_createdAt_idx" ON "token_ledger"("licenseId", "createdAt");

-- CreateIndex
CREATE INDEX "token_ledger_jobId_idx" ON "token_ledger"("jobId");

-- CreateIndex
CREATE INDEX "token_ledger_orderId_idx" ON "token_ledger"("orderId");

-- CreateIndex
CREATE INDEX "token_ledger_type_status_idx" ON "token_ledger"("type", "status");

-- CreateIndex
CREATE INDEX "translation_jobs_licenseId_createdAt_idx" ON "translation_jobs"("licenseId", "createdAt");

-- CreateIndex
CREATE INDEX "translation_jobs_deviceId_createdAt_idx" ON "translation_jobs"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "translation_jobs_status_createdAt_idx" ON "translation_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "job_assets_jobId_kind_idx" ON "job_assets"("jobId", "kind");

-- CreateIndex
CREATE INDEX "job_assets_kind_createdAt_idx" ON "job_assets"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "provider_usages_jobId_stage_idx" ON "provider_usages"("jobId", "stage");

-- CreateIndex
CREATE INDEX "provider_usages_provider_createdAt_idx" ON "provider_usages"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_devices" ADD CONSTRAINT "license_devices_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_devices" ADD CONSTRAINT "license_devices_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_codes" ADD CONSTRAINT "redeem_codes_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_codes" ADD CONSTRAINT "redeem_codes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_codes" ADD CONSTRAINT "redeem_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redeem_codes" ADD CONSTRAINT "redeem_codes_redeemedByDeviceId_fkey" FOREIGN KEY ("redeemedByDeviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tokenPackId_fkey" FOREIGN KEY ("tokenPackId") REFERENCES "token_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "translation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_redeemCodeId_fkey" FOREIGN KEY ("redeemCodeId") REFERENCES "redeem_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_assets" ADD CONSTRAINT "job_assets_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "translation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_usages" ADD CONSTRAINT "provider_usages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "translation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

