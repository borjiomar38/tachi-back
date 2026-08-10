-- CreateEnum
CREATE TYPE "MangaPornographyAssessmentStatus" AS ENUM ('pending', 'processing', 'completed', 'retryable_error', 'permanent_error');

-- CreateEnum
CREATE TYPE "MangaPornographyAssessmentVerdict" AS ENUM ('no_explicit_signal', 'review', 'block');

-- CreateEnum
CREATE TYPE "MangaPornographyManualDecision" AS ENUM ('allow', 'block');

-- CreateTable
CREATE TABLE "manga_pornography_assessments" (
    "id" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "mangaUrl" TEXT,
    "sourceId" TEXT,
    "sourceName" TEXT,
    "extensionPackageName" TEXT,
    "extensionName" TEXT,
    "thumbnailUrl" TEXT,
    "inputFingerprint" TEXT NOT NULL,
    "status" "MangaPornographyAssessmentStatus" NOT NULL DEFAULT 'pending',
    "verdict" "MangaPornographyAssessmentVerdict",
    "manualDecision" "MangaPornographyManualDecision",
    "manualReviewerId" TEXT,
    "manualReason" TEXT,
    "manualDecidedAt" TIMESTAMP(3),
    "sexualFlag" BOOLEAN,
    "sexualScore" DOUBLE PRECISION,
    "sexualAppliedInputTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "imageInputIncluded" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "providerRequestId" TEXT,
    "resultPayload" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "processingStartedAt" TIMESTAMP(3),
    "processingLeaseExpiresAt" TIMESTAMP(3),
    "classifiedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manga_pornography_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manga_pornography_assessments_identityKey_key" ON "manga_pornography_assessments"("identityKey");

-- CreateIndex
CREATE INDEX "manga_pornography_assessments_status_nextAttemptAt_idx" ON "manga_pornography_assessments"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "manga_pornography_assessments_verdict_updatedAt_idx" ON "manga_pornography_assessments"("verdict", "updatedAt");

-- CreateIndex
CREATE INDEX "manga_pornography_assessments_sourceId_normalizedTitle_idx" ON "manga_pornography_assessments"("sourceId", "normalizedTitle");

-- CreateIndex
CREATE INDEX "manga_pornography_assessments_manualDecision_idx" ON "manga_pornography_assessments"("manualDecision");

-- CreateIndex
CREATE INDEX "manga_pornography_assessments_lastSeenAt_idx" ON "manga_pornography_assessments"("lastSeenAt");
