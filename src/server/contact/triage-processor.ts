import { randomUUID } from 'node:crypto';

import { classifyContactWithCodex } from '@/server/contact/codex-classifier';
import {
  type ContactReplyDraft,
  generateContactReplyWithCodex,
} from '@/server/contact/codex-reply';
import {
  getContactNotificationId,
  sendContactNotification,
  sendContactReply,
} from '@/server/contact/contact-notifier';
import { limitContactConversation } from '@/server/contact/conversation';
import { getContactProductFacts } from '@/server/contact/product-facts';
import {
  getContactReferenceMessageIds,
  getContactReplyMessageId,
} from '@/server/contact/thread-policy';
import {
  type ContactTriageAudit,
  getContactTriageSource,
  parseContactTriageMetadata,
  writeContactTriageMetadata,
} from '@/server/contact/triage-audit';
import { getContactTriagePersistence } from '@/server/contact/triage-persistence';
import { db } from '@/server/db';
import { logger } from '@/server/logger';

const MAX_ATTEMPTS = 5;
const NOTIFICATION_STALE_AFTER_MS = 10 * 60 * 1000;

export const quarantineStaleContactNotifications = async (now = new Date()) => {
  const staleBefore = new Date(now.getTime() - NOTIFICATION_STALE_AFTER_MS);
  const stale = await db.contactMessage.findMany({
    select: { id: true, source: true },
    where: {
      source: {
        in: [
          getContactTriageSource('notification_sending'),
          getContactTriageSource('customer_reply_sending'),
        ],
      },
      updatedAt: { lt: staleBefore },
    },
  });

  await Promise.all(
    stale.map(async (contact) => {
      const isCustomerReply =
        contact.source === getContactTriageSource('customer_reply_sending');
      await db.$transaction([
        db.contactMessage.update({
          data: {
            source: getContactTriageSource(
              isCustomerReply
                ? 'customer_reply_unknown'
                : 'notification_unknown'
            ),
          },
          where: { id: contact.id },
        }),
        db.contactConversationMessage.updateMany({
          data: { automationStatus: 'delivery_unknown' },
          where: {
            automationStatus: 'processing',
            contactId: contact.id,
            direction: 'inbound',
          },
        }),
        ...(isCustomerReply
          ? [
              db.contactConversationMessage.updateMany({
                data: { deliveryStatus: 'delivery_unknown' },
                where: {
                  contactId: contact.id,
                  deliveryStatus: 'sending',
                  direction: 'outbound',
                },
              }),
            ]
          : []),
      ]);
    })
  );

  return { count: stale.length };
};

const findAndClaimContact = async (onlyId?: string) => {
  const inbound = await db.contactConversationMessage.findFirst({
    orderBy: { createdAt: 'asc' },
    where: {
      automationStatus: 'pending',
      direction: 'inbound',
      ...(onlyId ? { contactId: onlyId } : {}),
    },
  });
  if (!inbound) return null;

  const claimed = await db.contactConversationMessage.updateMany({
    data: { automationStatus: 'processing' },
    where: { automationStatus: 'pending', id: inbound.id },
  });
  if (claimed.count !== 1) return null;

  const contact = await db.contactMessage.findUnique({
    where: { id: inbound.contactId },
  });
  if (!contact) return null;

  await db.contactMessage.update({
    data: { source: getContactTriageSource('processing') },
    where: { id: contact.id },
  });

  return { contact, inbound };
};

const recordFailure = async (input: {
  contactId: string;
  incrementAttempt?: boolean;
  inboundConversationMessageId: string;
  internalNotes: string | null;
  outgoingConversationMessageId?: string;
  error: unknown;
}) => {
  const metadata = parseContactTriageMetadata(input.internalNotes);
  const attempts =
    metadata.audit.attempts + (input.incrementAttempt === false ? 0 : 1);
  const current = await db.contactMessage.findUnique({
    select: { source: true },
    where: { id: input.contactId },
  });
  const notificationOutcomeUnknown =
    current?.source === getContactTriageSource('notification_sending');
  const replyOutcomeUnknown =
    current?.source === getContactTriageSource('customer_reply_sending');
  const deliveryUnknown = notificationOutcomeUnknown || replyOutcomeUnknown;
  const shouldStop = attempts >= MAX_ATTEMPTS;
  const nextAutomationStatus = deliveryUnknown
    ? 'delivery_unknown'
    : shouldStop
      ? 'failed'
      : 'pending';

  await db.$transaction([
    db.contactMessage.update({
      data: {
        internalNotes: writeContactTriageMetadata(metadata.humanNotes, {
          ...metadata.audit,
          attempts,
          conversationMessageId: input.inboundConversationMessageId,
          error:
            input.error instanceof Error
              ? input.error.message.slice(0, 500)
              : 'Unknown error',
        }),
        source: getContactTriageSource(
          notificationOutcomeUnknown
            ? 'notification_unknown'
            : replyOutcomeUnknown
              ? 'customer_reply_unknown'
              : shouldStop
                ? 'failed'
                : 'retry'
        ),
      },
      where: { id: input.contactId },
    }),
    db.contactConversationMessage.update({
      data: { automationStatus: nextAutomationStatus },
      where: { id: input.inboundConversationMessageId },
    }),
    ...(input.outgoingConversationMessageId && replyOutcomeUnknown
      ? [
          db.contactConversationMessage.update({
            data: { deliveryStatus: 'delivery_unknown' },
            where: { id: input.outgoingConversationMessageId },
          }),
        ]
      : []),
  ]);
  logger.error({
    contactId: input.contactId,
    message: 'Contact triage failed',
    scope: 'contact-triage',
  });
};

export const processNextContactTriage = async (onlyId?: string) => {
  const claimed = await findAndClaimContact(onlyId);
  if (!claimed) return { outcome: 'empty', processed: false } as const;
  const { contact, inbound } = claimed;
  const parsedMetadata = parseContactTriageMetadata(contact.internalNotes);
  const previousAudit =
    parsedMetadata.audit.conversationMessageId === inbound.id
      ? parsedMetadata.audit
      : ({ attempts: 0 } satisfies ContactTriageAudit);
  let failureNotes = contact.internalNotes;
  let attemptAlreadyRecorded = false;
  let outgoingConversationMessageId: string | undefined;

  try {
    const conversationRows = await db.contactConversationMessage.findMany({
      orderBy: { createdAt: 'asc' },
      where: { contactId: contact.id },
    });
    const conversation = limitContactConversation(
      conversationRows.map((message) => ({
        bodyText: message.bodyText,
        direction: message.direction,
        occurredAt: (
          message.receivedAt ??
          message.sentAt ??
          message.createdAt
        ).toISOString(),
        senderEmail: message.senderEmail,
        subject: message.subject,
      }))
    );
    const result = await classifyContactWithCodex({
      conversation,
      message: inbound.bodyText,
      name: contact.name,
      subject: inbound.subject,
    });
    const persistence = getContactTriagePersistence(result);
    const now = new Date();
    let replyDraft: ContactReplyDraft | undefined;
    const notificationAttemptedAt = persistence.decision.notifySupport
      ? now.toISOString()
      : undefined;
    const notificationId = persistence.decision.notifySupport
      ? getContactNotificationId(`${contact.id}-${inbound.id}`)
      : undefined;
    let audit: ContactTriageAudit = {
      attempts: previousAudit.attempts + 1,
      classification: result.classification,
      conversationMessageId: inbound.id,
      notificationAttemptedAt,
      notificationId,
      processedAt: now.toISOString(),
      reason: result.reason,
      replyIntent: persistence.decision.replyToCustomer
        ? result.replyIntent
        : 'none',
      tags: persistence.decision.tags,
    };
    failureNotes = writeContactTriageMetadata(parsedMetadata.humanNotes, audit);
    attemptAlreadyRecorded = true;

    if (persistence.decision.replyToCustomer) {
      if (result.replyIntent === 'none') {
        throw new Error('Customer reply requested without a reply intent');
      }
      const productFacts = await getContactProductFacts();
      replyDraft = await generateContactReplyWithCodex({
        conversation,
        message: inbound.bodyText,
        name: contact.name,
        productFacts,
        replyIntent: result.replyIntent,
        subject: inbound.subject,
      });
      outgoingConversationMessageId = randomUUID();
      audit = {
        ...audit,
        replyAttemptedAt: now.toISOString(),
        replyId: getContactReplyMessageId(
          contact.id,
          outgoingConversationMessageId
        ),
        replySubject: replyDraft.subject,
      };
      failureNotes = writeContactTriageMetadata(
        parsedMetadata.humanNotes,
        audit
      );
    }

    const filtered = persistence.decision.routing === 'suppress';
    const sourceState = persistence.decision.notifySupport
      ? 'notification_sending'
      : persistence.decision.replyToCustomer
        ? 'customer_reply_sending'
        : 'ignored';

    await db.contactMessage.update({
      data: {
        internalNotes: failureNotes,
        ...(filtered ? { readAt: contact.readAt ?? now } : {}),
        ...(result.classification === 'irrelevant' ? { resolvedAt: now } : {}),
        source: getContactTriageSource(sourceState),
        status: persistence.decision.replyToCustomer
          ? undefined
          : persistence.status,
      },
      where: { id: contact.id },
    });

    if (persistence.decision.notifySupport) {
      await sendContactNotification({
        classification: result.classification,
        contactId: `${contact.id}-${inbound.id}`,
        email: contact.email,
        message: inbound.bodyText,
        name: contact.name,
        subject: inbound.subject,
      });
      await db.$transaction([
        db.contactMessage.update({
          data: {
            internalNotes: writeContactTriageMetadata(
              parsedMetadata.humanNotes,
              { ...audit, notifiedAt: new Date().toISOString() }
            ),
            source: getContactTriageSource('notified'),
          },
          where: {
            id: contact.id,
            source: getContactTriageSource('notification_sending'),
          },
        }),
        db.contactConversationMessage.update({
          data: { automationStatus: 'forwarded' },
          where: { id: inbound.id },
        }),
      ]);
    }

    if (
      persistence.decision.replyToCustomer &&
      replyDraft &&
      outgoingConversationMessageId
    ) {
      const messageId = getContactReplyMessageId(
        contact.id,
        outgoingConversationMessageId
      );
      const shouldThreadEmail = inbound.source === 'email';
      const references = shouldThreadEmail
        ? getContactReferenceMessageIds(inbound.messageId, inbound.references)
        : [];

      await db.contactConversationMessage.create({
        data: {
          aiGenerated: true,
          automationStatus: 'skipped',
          bodyText: replyDraft.text,
          contactId: contact.id,
          deliveryStatus: 'sending',
          direction: 'outbound',
          id: outgoingConversationMessageId,
          inReplyTo: shouldThreadEmail ? inbound.messageId : undefined,
          messageId,
          recipientEmail: contact.email,
          references,
          senderEmail: 'contact@nayovi.com',
          source: 'codex',
          subject: replyDraft.subject,
        },
      });
      await sendContactReply({
        contactId: contact.id,
        draft: replyDraft,
        email: contact.email,
        inReplyTo: shouldThreadEmail ? inbound.messageId : undefined,
        messageId,
        references,
      });
      const repliedAt = new Date();
      await db.$transaction([
        db.contactMessage.update({
          data: {
            internalNotes: writeContactTriageMetadata(
              parsedMetadata.humanNotes,
              { ...audit, repliedAt: repliedAt.toISOString() }
            ),
            readAt: contact.readAt ?? repliedAt,
            resolvedAt: repliedAt,
            source: getContactTriageSource('customer_replied'),
            status: persistence.status,
          },
          where: {
            id: contact.id,
            source: getContactTriageSource('customer_reply_sending'),
          },
        }),
        db.contactConversationMessage.update({
          data: { automationStatus: 'replied' },
          where: { id: inbound.id },
        }),
        db.contactConversationMessage.update({
          data: { deliveryStatus: 'sent', sentAt: repliedAt },
          where: { id: outgoingConversationMessageId },
        }),
      ]);
    }

    if (filtered) {
      await db.contactConversationMessage.update({
        data: { automationStatus: 'filtered' },
        where: { id: inbound.id },
      });
    }

    return {
      classification: result.classification,
      outcome: 'processed',
      processed: true,
      routing: persistence.decision.routing,
    } as const;
  } catch (error) {
    await recordFailure({
      contactId: contact.id,
      error,
      incrementAttempt: !attemptAlreadyRecorded,
      inboundConversationMessageId: inbound.id,
      internalNotes: failureNotes,
      outgoingConversationMessageId,
    });
    return { outcome: 'failed', processed: false } as const;
  }
};
