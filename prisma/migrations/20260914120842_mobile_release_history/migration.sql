-- CreateTable
CREATE TABLE "mobile_app_releases" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "versionName" TEXT NOT NULL,
    "releaseInfo" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "mobile_app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mobile_app_releases_platform_channel_publishedAt_versionCod_idx" ON "mobile_app_releases"("platform", "channel", "publishedAt", "versionCode");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_app_releases_platform_channel_versionCode_key" ON "mobile_app_releases"("platform", "channel", "versionCode");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_app_releases_platform_channel_versionName_key" ON "mobile_app_releases"("platform", "channel", "versionName");
