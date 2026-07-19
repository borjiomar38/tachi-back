-- AlterTable
ALTER TABLE "contact_conversation_messages" ALTER COLUMN "references" DROP DEFAULT;

-- CreateTable
CREATE TABLE "device_manga_visits" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "mangaUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "extensionPackageName" TEXT,
    "extensionName" TEXT,
    "extensionLang" TEXT,
    "sourceName" TEXT,
    "sourceLanguage" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "firstVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_manga_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_extension_visits" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "extensionName" TEXT NOT NULL,
    "extensionLang" TEXT,
    "iconUrl" TEXT,
    "sourceId" TEXT,
    "sourceName" TEXT,
    "sourceLanguage" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "firstVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_extension_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_blocks" (
    "id" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "extensionName" TEXT,
    "reason" TEXT,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_manga_visits_deviceId_lastVisitedAt_idx" ON "device_manga_visits"("deviceId", "lastVisitedAt");

-- CreateIndex
CREATE INDEX "device_manga_visits_extensionPackageName_lastVisitedAt_idx" ON "device_manga_visits"("extensionPackageName", "lastVisitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_manga_visits_deviceId_sourceId_mangaUrl_key" ON "device_manga_visits"("deviceId", "sourceId", "mangaUrl");

-- CreateIndex
CREATE INDEX "device_extension_visits_deviceId_lastVisitedAt_idx" ON "device_extension_visits"("deviceId", "lastVisitedAt");

-- CreateIndex
CREATE INDEX "device_extension_visits_packageName_lastVisitedAt_idx" ON "device_extension_visits"("packageName", "lastVisitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_extension_visits_deviceId_packageName_key" ON "device_extension_visits"("deviceId", "packageName");

-- CreateIndex
CREATE UNIQUE INDEX "extension_blocks_packageName_key" ON "extension_blocks"("packageName");

-- CreateIndex
CREATE INDEX "extension_blocks_blockedAt_idx" ON "extension_blocks"("blockedAt");

-- AddForeignKey
ALTER TABLE "device_manga_visits" ADD CONSTRAINT "device_manga_visits_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_extension_visits" ADD CONSTRAINT "device_extension_visits_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "contact_conversation_messages_direction_automationStatus_create" RENAME TO "contact_conversation_messages_direction_automationStatus_cr_idx";
