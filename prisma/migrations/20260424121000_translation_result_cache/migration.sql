-- CreateTable
CREATE TABLE "translation_result_caches" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "bucketName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "providerSignature" TEXT NOT NULL,
    "resultPayloadVersion" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_result_caches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "translation_result_caches_cacheKey_key" ON "translation_result_caches"("cacheKey");

-- CreateIndex
CREATE INDEX "translation_result_caches_targetLanguage_createdAt_idx" ON "translation_result_caches"("targetLanguage", "createdAt");
