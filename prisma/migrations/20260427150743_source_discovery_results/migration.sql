-- CreateEnum
CREATE TYPE "SourceDiscoveryResultStatus" AS ENUM ('active', 'pending', 'stale', 'rejected');

-- CreateTable
CREATE TABLE "source_discovery_results" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "extensionName" TEXT NOT NULL,
    "extensionLang" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "mangaUrl" TEXT NOT NULL,
    "canonicalMangaUrl" TEXT NOT NULL,
    "sourceMangaUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "latestChapterName" TEXT,
    "latestChapterNumber" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "decision" TEXT NOT NULL DEFAULT 'maybe',
    "reason" TEXT,
    "confirmationCount" INTEGER NOT NULL DEFAULT 1,
    "observationCount" INTEGER NOT NULL DEFAULT 1,
    "status" "SourceDiscoveryResultStatus" NOT NULL DEFAULT 'pending',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_discovery_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_discovery_result_aliases" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_discovery_result_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "source_discovery_results_packageName_status_idx" ON "source_discovery_results"("packageName", "status");

-- CreateIndex
CREATE INDEX "source_discovery_results_sourceLanguage_status_idx" ON "source_discovery_results"("sourceLanguage", "status");

-- CreateIndex
CREATE INDEX "source_discovery_results_titleKey_idx" ON "source_discovery_results"("titleKey");

-- CreateIndex
CREATE INDEX "source_discovery_results_latestChapterNumber_idx" ON "source_discovery_results"("latestChapterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "source_discovery_results_sourceId_canonicalMangaUrl_key" ON "source_discovery_results"("sourceId", "canonicalMangaUrl");

-- CreateIndex
CREATE INDEX "source_discovery_result_aliases_aliasKey_idx" ON "source_discovery_result_aliases"("aliasKey");

-- CreateIndex
CREATE UNIQUE INDEX "source_discovery_result_aliases_resultId_aliasKey_key" ON "source_discovery_result_aliases"("resultId", "aliasKey");

-- AddForeignKey
ALTER TABLE "source_discovery_result_aliases" ADD CONSTRAINT "source_discovery_result_aliases_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "source_discovery_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
