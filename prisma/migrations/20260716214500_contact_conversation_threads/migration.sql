-- CreateEnum
CREATE TYPE "ContactConversationDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "ContactConversationSource" AS ENUM ('contact_form', 'email', 'codex', 'support');

-- CreateEnum
CREATE TYPE "ContactConversationDeliveryStatus" AS ENUM ('received', 'sending', 'sent', 'delivery_unknown', 'failed');

-- CreateEnum
CREATE TYPE "ContactConversationAutomationStatus" AS ENUM ('pending', 'processing', 'replied', 'forwarded', 'filtered', 'failed', 'delivery_unknown', 'skipped');

-- CreateTable
CREATE TABLE "contact_conversation_messages" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "direction" "ContactConversationDirection" NOT NULL,
    "source" "ContactConversationSource" NOT NULL,
    "deliveryStatus" "ContactConversationDeliveryStatus" NOT NULL,
    "automationStatus" "ContactConversationAutomationStatus" NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "inReplyTo" TEXT,
    "references" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "providerUid" INTEGER,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- Backfill every existing public contact as the first inbound thread message.
-- Already processed contacts keep their terminal automation state, so this
-- migration never causes historical emails to be analyzed or sent again.
INSERT INTO "contact_conversation_messages" (
    "id",
    "contactId",
    "direction",
    "source",
    "deliveryStatus",
    "automationStatus",
    "senderEmail",
    "recipientEmail",
    "subject",
    "bodyText",
    "messageId",
    "references",
    "providerUid",
    "aiGenerated",
    "receivedAt",
    "sentAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy-' || "id",
    "id",
    'inbound'::"ContactConversationDirection",
    'contact_form'::"ContactConversationSource",
    'received'::"ContactConversationDeliveryStatus",
    CASE
        WHEN "source" = 'public_landing_form:triage_ignored' THEN 'filtered'
        WHEN "source" = 'public_landing_form:triage_notified' THEN 'forwarded'
        WHEN "source" = 'public_landing_form:triage_customer_replied' THEN 'replied'
        WHEN "source" IN (
            'public_landing_form:triage_notification_unknown',
            'public_landing_form:triage_customer_reply_unknown',
            'public_landing_form:triage_notification_sending',
            'public_landing_form:triage_customer_reply_sending'
        ) THEN 'delivery_unknown'
        WHEN "source" = 'public_landing_form:triage_failed' THEN 'failed'
        ELSE 'pending'
    END::"ContactConversationAutomationStatus",
    "email",
    'contact@nayovi.com',
    "subject",
    "message",
    '<contact-form-' || "id" || '@nayovi.com>',
    ARRAY[]::TEXT[],
    NULL,
    false,
    "createdAt",
    NULL,
    "createdAt",
    "updatedAt"
FROM "contact_messages";

-- CreateIndex
CREATE UNIQUE INDEX "contact_conversation_messages_messageId_key" ON "contact_conversation_messages"("messageId");

-- CreateIndex
CREATE INDEX "contact_conversation_messages_contactId_createdAt_idx" ON "contact_conversation_messages"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_conversation_messages_direction_automationStatus_createdAt_idx" ON "contact_conversation_messages"("direction", "automationStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_conversation_messages" ADD CONSTRAINT "contact_conversation_messages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
