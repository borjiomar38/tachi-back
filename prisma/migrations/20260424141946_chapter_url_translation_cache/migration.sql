-- AlterTable
ALTER TABLE "translation_jobs" ADD COLUMN     "chapterCacheKey" TEXT,
ADD COLUMN     "chapterIdentity" JSONB;

-- AlterTable
ALTER TABLE "translation_result_caches" ADD COLUMN     "chapterCacheKey" TEXT,
ADD COLUMN     "chapterIdentity" JSONB,
ADD COLUMN     "resultManifest" JSONB;

-- CreateIndex
CREATE INDEX "translation_jobs_chapterCacheKey_targetLanguage_createdAt_idx" ON "translation_jobs"("chapterCacheKey", "targetLanguage", "createdAt");

-- CreateIndex
CREATE INDEX "translation_result_caches_chapterCacheKey_targetLanguage_up_idx" ON "translation_result_caches"("chapterCacheKey", "targetLanguage", "updatedAt");
