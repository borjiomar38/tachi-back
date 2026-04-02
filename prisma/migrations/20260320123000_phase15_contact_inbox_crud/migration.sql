-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('unread', 'in_progress', 'resolved', 'spam');

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'unread',
    "source" TEXT NOT NULL DEFAULT 'public_landing_form',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "internalNotes" TEXT,
    "assignedToUserId" TEXT,
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_email_idx" ON "contact_messages"("email");

-- CreateIndex
CREATE INDEX "contact_messages_assignedToUserId_status_idx" ON "contact_messages"("assignedToUserId", "status");

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
