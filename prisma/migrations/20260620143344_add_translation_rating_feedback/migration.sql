-- CreateEnum
CREATE TYPE "TranslationRatingFeedbackStatus" AS ENUM ('rated', 'skipped');

-- CreateTable
CREATE TABLE "translation_rating_feedback" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "jobId" TEXT,
    "clientSessionId" TEXT,
    "translationCacheKey" TEXT,
    "chapterCacheKey" TEXT,
    "chapterIdentity" JSONB,
    "sourceLanguage" TEXT,
    "targetLanguage" TEXT NOT NULL,
    "status" "TranslationRatingFeedbackStatus" NOT NULL DEFAULT 'rated',
    "rating" INTEGER,
    "comment" TEXT,
    "pageCount" INTEGER,
    "readDurationMs" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_rating_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "translation_rating_feedback_chapterCacheKey_targetLanguage__idx" ON "translation_rating_feedback"("chapterCacheKey", "targetLanguage", "createdAt");

-- CreateIndex
CREATE INDEX "translation_rating_feedback_translationCacheKey_idx" ON "translation_rating_feedback"("translationCacheKey");

-- CreateIndex
CREATE INDEX "translation_rating_feedback_licenseId_createdAt_idx" ON "translation_rating_feedback"("licenseId", "createdAt");

-- CreateIndex
CREATE INDEX "translation_rating_feedback_deviceId_createdAt_idx" ON "translation_rating_feedback"("deviceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "translation_rating_feedback_clientSessionId_licenseId_devic_key" ON "translation_rating_feedback"("clientSessionId", "licenseId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "translation_rating_feedback_jobId_licenseId_deviceId_key" ON "translation_rating_feedback"("jobId", "licenseId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "translation_rating_feedback_licenseId_deviceId_chapterCache_key" ON "translation_rating_feedback"("licenseId", "deviceId", "chapterCacheKey", "targetLanguage");

-- AddForeignKey
ALTER TABLE "translation_rating_feedback" ADD CONSTRAINT "translation_rating_feedback_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_rating_feedback" ADD CONSTRAINT "translation_rating_feedback_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_rating_feedback" ADD CONSTRAINT "translation_rating_feedback_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "translation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
