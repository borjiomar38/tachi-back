import { classifyContactWithCodex } from '@/server/contact/codex-classifier';
import {
  getContactNotificationId,
  sendContactNotification,
} from '@/server/contact/contact-notifier';
import {
  CONTACT_TRIAGE_CLAIMABLE_SOURCES,
  getContactTriageSource,
  parseContactTriageMetadata,
  writeContactTriageMetadata,
} from '@/server/contact/triage-audit';
import { getContactTriagePersistence } from '@/server/contact/triage-persistence';
import { db } from '@/server/db';
import { logger } from '@/server/logger';

const MAX_ATTEMPTS = 5;
const NOTIFICATION_STALE_AFTER_MS = 10 * 60 * 1000;

export const quarantineStaleContactNotifications = async (now = new Date()) =>
  await db.contactMessage.updateMany({
    data: { source: getContactTriageSource('notification_unknown') },
    where: {
      source: getContactTriageSource('notification_sending'),
      updatedAt: {
        lt: new Date(now.getTime() - NOTIFICATION_STALE_AFTER_MS),
      },
    },
  });

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
    const notificationAttemptedAt = persistence.decision.notifySupport
      ? now.toISOString()
      : undefined;
    const notificationId = persistence.decision.notifySupport
      ? getContactNotificationId(contact.id)
      : undefined;
    const audit = {
      attempts: previousMetadata.audit.attempts + 1,
      classification: result.classification,
      notificationAttemptedAt,
      notificationId,
      processedAt: now.toISOString(),
      reason: result.reason,
      tags: persistence.decision.tags,
    };
    failureNotes = writeContactTriageMetadata(
      previousMetadata.humanNotes,
      audit
    );
    attemptAlreadyRecorded = true;
    const filtered = !persistence.decision.notifySupport;

    await db.contactMessage.update({
      data: {
        internalNotes: failureNotes,
        ...(filtered ? { readAt: contact.readAt ?? now } : {}),
        ...(result.classification === 'irrelevant' ? { resolvedAt: now } : {}),
        source: getContactTriageSource(
          persistence.decision.notifySupport
            ? 'notification_sending'
            : 'ignored'
        ),
        status: persistence.status,
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

    return {
      classification: result.classification,
      outcome: 'processed',
      processed: true,
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
