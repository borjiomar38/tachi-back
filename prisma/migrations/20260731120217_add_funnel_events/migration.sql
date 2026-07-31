-- CreateTable
CREATE TABLE "funnel_events" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "deviceId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "properties" JSONB,
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "funnel_events_eventKey_key" ON "funnel_events"("eventKey");

-- CreateIndex
CREATE INDEX "funnel_events_name_occurredAt_idx" ON "funnel_events"("name", "occurredAt");

-- CreateIndex
CREATE INDEX "funnel_events_deviceId_name_occurredAt_idx" ON "funnel_events"("deviceId", "name", "occurredAt");

-- AddForeignKey
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
