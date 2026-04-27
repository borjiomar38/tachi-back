CREATE TYPE "SourceSearchMethodType" AS ENUM ('installed_native', 'http_template', 'custom_adapter', 'unsupported');

CREATE TYPE "SourceSearchMethodStatus" AS ENUM ('working', 'stale', 'cloudflare', 'failed', 'unsupported', 'unknown');

CREATE TABLE "source_search_methods" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "apkName" TEXT,
    "extensionName" TEXT NOT NULL,
    "extensionLang" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "themeKey" TEXT,
    "methodType" "SourceSearchMethodType" NOT NULL,
    "status" "SourceSearchMethodStatus" NOT NULL DEFAULT 'unknown',
    "versionCode" INTEGER,
    "versionName" TEXT,
    "searchUrlPattern" TEXT,
    "resultSelector" TEXT,
    "titleSelector" TEXT,
    "urlSelector" TEXT,
    "thumbnailSelector" TEXT,
    "descriptionSelector" TEXT,
    "detailTitleSelector" TEXT,
    "chapterSelector" TEXT,
    "latestChapterSelector" TEXT,
    "headers" JSONB,
    "metadata" JSONB,
    "failureReason" TEXT,
    "lastImportedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_search_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "source_search_methods_sourceId_key" ON "source_search_methods"("sourceId");
CREATE INDEX "source_search_methods_packageName_idx" ON "source_search_methods"("packageName");
CREATE INDEX "source_search_methods_adapterKey_status_idx" ON "source_search_methods"("adapterKey", "status");
CREATE INDEX "source_search_methods_sourceLanguage_status_idx" ON "source_search_methods"("sourceLanguage", "status");
