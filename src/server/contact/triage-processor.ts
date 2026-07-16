import { classifyContactWithCodex } from '@/server/contact/codex-classifier';
import {
  type ContactReplyDraft,
  generateContactReplyWithCodex,
} from '@/server/contact/codex-reply';
import {
  getContactNotificationId,
  getContactReplyId,
  sendContactNotification,
  sendContactReply,
} from '@/server/contact/contact-notifier';
import {
  CONTACT_TRIAGE_CLAIMABLE_SOURCES,
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
  const [notifications, customerReplies] = await Promise.all([
    db.contactMessage.updateMany({
      data: { source: getContactTriageSource('notification_unknown') },
      where: {
        source: getContactTriageSource('notification_sending'),
        updatedAt: { lt: staleBefore },
      },
    }),
    db.contactMessage.updateMany({
      data: { source: getContactTriageSource('customer_reply_unknown') },
      where: {
        source: getContactTriageSource('customer_reply_sending'),
        updatedAt: { lt: staleBefore },
      },
    }),
  ]);

  return { count: notifications.count + customerReplies.count };
};

const findAndClaimContact = async (onlyId?: string) => {
  const contact = await db.contactMessage.findFirst({
    orderBy: { createdAt: 'asc' },
    where: {
      ...(onlyId ? { id: onlyId } : {}),
      source: { in: [...CONTACT_TRIAGE_CLAIMABLE_SOURCES] },
    },
  });
  if (!contact) return null;

  const claimed = await db.contactMessage.updateMany({
    data: { source: getContactTriageSource('processing') },
    where: {
      id: contact.id,
      source: { in: [...CONTACT_TRIAGE_CLAIMABLE_SOURCES] },
    },
  });
  return claimed.count === 1 ? contact : null;
};

const recordFailure = async (
  id: string,
  internalNotes: string | null,
  error: unknown,
  incrementAttempt = true
) => {
  const metadata = parseContactTriageMetadata(internalNotes);
  const attempts = metadata.audit.attempts + (incrementAttempt ? 1 : 0);
  const current = await db.contactMessage.findUnique({
    select: { source: true },
    where: { id },
  });
  const notificationOutcomeUnknown =
    current?.source === getContactTriageSource('notification_sending');
  const replyOutcomeUnknown =
    current?.source === getContactTriageSource('customer_reply_sending');
  const shouldStop = attempts >= MAX_ATTEMPTS;

  await db.contactMessage.update({
    data: {
      internalNotes: writeContactTriageMetadata(metadata.humanNotes, {
        ...metadata.audit,
        attempts,
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
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
    where: { id },
  });
  logger.error({
    contactId: id,
    message: 'Contact triage failed',
    scope: 'contact-triage',
  });
};

export const processNextContactTriage = async (onlyId?: string) => {
  const contact = await findAndClaimContact(onlyId);
  if (!contact) return { outcome: 'empty', processed: false } as const;
  const previousMetadata = parseContactTriageMetadata(contact.internalNotes);
  let failureNotes = contact.internalNotes;
  let attemptAlreadyRecorded = false;

  try {
    const result = await classifyContactWithCodex({
      message: contact.message,
      name: contact.name,
      subject: contact.subject,
    });
    const persistence = getContactTriagePersistence(result);
    const now = new Date();
    let replyDraft: ContactReplyDraft | undefined;
    const notificationAttemptedAt = persistence.decision.notifySupport
      ? now.toISOString()
      : undefined;
    const notificationId = persistence.decision.notifySupport
      ? getContactNotificationId(contact.id)
      : undefined;
    let audit: ContactTriageAudit = {
      attempts: previousMetadata.audit.attempts + 1,
      classification: result.classification,
      notificationAttemptedAt,
      notificationId,
      processedAt: now.toISOString(),
      reason: result.reason,
      replyIntent: persistence.decision.replyToCustomer
        ? result.replyIntent
        : 'none',
      tags: persistence.decision.tags,
    };
    failureNotes = writeContactTriageMetadata(
      previousMetadata.humanNotes,
      audit
    );
    attemptAlreadyRecorded = true;

    if (persistence.decision.replyToCustomer) {
      if (result.replyIntent === 'none') {
        throw new Error('Customer reply requested without a reply intent');
      }
      replyDraft = await generateContactReplyWithCodex({
        message: contact.message,
        name: contact.name,
        replyIntent: result.replyIntent,
        subject: contact.subject,
      });
      audit = {
        ...audit,
        replyAttemptedAt: now.toISOString(),
        replyId: getContactReplyId(contact.id),
        replySubject: replyDraft.subject,
      };
      failureNotes = writeContactTriageMetadata(
        previousMetadata.humanNotes,
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
        contactId: contact.id,
        email: contact.email,
        message: contact.message,
        name: contact.name,
        subject: contact.subject,
      });
      await db.contactMessage.update({
        data: {
          internalNotes: writeContactTriageMetadata(
            previousMetadata.humanNotes,
            {
              ...audit,
              notifiedAt: new Date().toISOString(),
            }
          ),
          source: getContactTriageSource('notified'),
        },
        where: {
          id: contact.id,
          source: getContactTriageSource('notification_sending'),
        },
      });
    }

    if (persistence.decision.replyToCustomer && replyDraft) {
      await sendContactReply({
        contactId: contact.id,
        draft: replyDraft,
        email: contact.email,
      });
      const repliedAt = new Date();
      await db.contactMessage.update({
        data: {
          internalNotes: writeContactTriageMetadata(
            previousMetadata.humanNotes,
            {
              ...audit,
              repliedAt: repliedAt.toISOString(),
            }
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
      });
    }

    return {
      classification: result.classification,
      outcome: 'processed',
      processed: true,
      routing: persistence.decision.routing,
    } as const;
  } catch (error) {
    await recordFailure(
      contact.id,
      failureNotes,
      error,
      !attemptAlreadyRecorded
    );
    return { outcome: 'failed', processed: false } as const;
  }
};
