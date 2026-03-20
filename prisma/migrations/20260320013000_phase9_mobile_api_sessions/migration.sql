-- CreateTable
CREATE TABLE "mobile_sessions" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "lastIpAddress" TEXT,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "appBuild" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_sessions_refreshTokenHash_key" ON "mobile_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "mobile_sessions_deviceId_revokedAt_expiresAt_idx" ON "mobile_sessions"("deviceId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "mobile_sessions_licenseId_revokedAt_expiresAt_idx" ON "mobile_sessions"("licenseId", "revokedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
