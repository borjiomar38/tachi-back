import { z } from 'zod';

import {
  CONTACT_TRIAGE_TAGS,
  zContactReplyIntent,
  zContactTriageClassification,
} from '@/server/contact/triage-policy';

export const CONTACT_TRIAGE_AUDIT_PREFIX = '[contact-triage:v1] ';
export const CONTACT_TRIAGE_SOURCE_PREFIX = 'public_landing_form:triage_';
export const CONTACT_TRIAGE_LEGACY_SOURCE = 'public_landing_form';

export const CONTACT_TRIAGE_CLAIMABLE_SOURCES = [
  CONTACT_TRIAGE_LEGACY_SOURCE,
  `${CONTACT_TRIAGE_SOURCE_PREFIX}pending`,
  `${CONTACT_TRIAGE_SOURCE_PREFIX}retry`,
] as const;

export const zContactTriageState = z.enum([
  'awaiting',
  'processing',
  'retrying',
  'failed',
  'delivery_unknown',
  'filtered',
  'forwarded',
  'replied',
]);

const zContactTriageAudit = z.object({
  attempts: z.number().int().nonnegative().catch(0),
  classification: zContactTriageClassification.optional(),
  conversationMessageId: z.string().max(200).optional(),
  error: z.string().max(500).optional(),
  notificationAttemptedAt: z.iso.datetime().optional(),
  notificationId: z.string().max(200).optional(),
  notifiedAt: z.iso.datetime().optional(),
  processedAt: z.iso.datetime().optional(),
  reason: z.string().max(500).optional(),
  repliedAt: z.iso.datetime().optional(),
  replyAttemptedAt: z.iso.datetime().optional(),
  replyId: z.string().max(200).optional(),
  replyIntent: zContactReplyIntent.optional(),
  replySubject: z.string().max(200).optional(),
  tags: z.array(z.enum(CONTACT_TRIAGE_TAGS)).optional(),
});

export type ContactTriageAudit = z.infer<typeof zContactTriageAudit>;

export interface ContactTriageMetadata {
  audit: ContactTriageAudit;
  humanNotes: string;
}

export const getContactTriageSource = (state: string) =>
  `${CONTACT_TRIAGE_SOURCE_PREFIX}${state}`;

export const canQueueContactReanalysis = (source: string) =>
  ![
    getContactTriageSource('notification_sending'),
    getContactTriageSource('notification_unknown'),
    getContactTriageSource('customer_reply_sending'),
    getContactTriageSource('customer_reply_unknown'),
  ].includes(source);

export const getContactSourceOrigin = (source: string) =>
  source.startsWith(CONTACT_TRIAGE_SOURCE_PREFIX)
    ? CONTACT_TRIAGE_LEGACY_SOURCE
    : source;

export const getContactTriageState = (source: string) => {
  const sourceState = source.startsWith(CONTACT_TRIAGE_SOURCE_PREFIX)
    ? source.slice(CONTACT_TRIAGE_SOURCE_PREFIX.length)
    : 'pending';
  const states = {
    failed: 'failed',
    customer_replied: 'replied',
    customer_reply_sending: 'processing',
    customer_reply_unknown: 'delivery_unknown',
    ignored: 'filtered',
    notification_unknown: 'delivery_unknown',
    notification_sending: 'processing',
    notified: 'forwarded',
    pending: 'awaiting',
    processing: 'processing',
    retry: 'retrying',
  } as const;

  return states[sourceState as keyof typeof states] ?? ('awaiting' as const);
};

export const parseContactTriageMetadata = (
  internalNotes: string | null | undefined
): ContactTriageMetadata => {
  const lines = internalNotes?.split('\n') ?? [];
  const auditLine = lines.find((line) =>
    line.startsWith(CONTACT_TRIAGE_AUDIT_PREFIX)
  );
  const humanNotes = lines
    .filter((line) => !line.startsWith(CONTACT_TRIAGE_AUDIT_PREFIX))
    .join('\n')
    .trim();

  if (!auditLine) {
    return { audit: { attempts: 0 }, humanNotes };
  }

  try {
    const parsed = zContactTriageAudit.safeParse(
      JSON.parse(auditLine.slice(CONTACT_TRIAGE_AUDIT_PREFIX.length))
    );
    return {
      audit: parsed.success ? parsed.data : { attempts: 0 },
      humanNotes,
    };
  } catch {
    return { audit: { attempts: 0 }, humanNotes };
  }
};

export const writeContactTriageMetadata = (
  humanNotes: string | null | undefined,
  audit: ContactTriageAudit
) =>
  [humanNotes?.trim(), `${CONTACT_TRIAGE_AUDIT_PREFIX}${JSON.stringify(audit)}`]
    .filter(Boolean)
    .join('\n');

export const replaceContactHumanNotes = (
  internalNotes: string | null | undefined,
  humanNotes: string
) => {
  const metadata = parseContactTriageMetadata(internalNotes);
  const hasAudit = Boolean(
    internalNotes
      ?.split('\n')
      .some((line) => line.startsWith(CONTACT_TRIAGE_AUDIT_PREFIX))
  );

  if (!hasAudit) return humanNotes.trim() || null;
  return writeContactTriageMetadata(humanNotes, metadata.audit);
};

export const getContactTriageView = (
  source: string,
  internalNotes: string | null | undefined
) => {
  const { audit } = parseContactTriageMetadata(internalNotes);
  const state = getContactTriageState(source);

  return {
    analyzedAt: audit.processedAt ? new Date(audit.processedAt) : null,
    attempts: audit.attempts,
    classification: audit.classification ?? null,
    error: audit.error ?? null,
    notification:
      state === 'replied'
        ? ('replied' as const)
        : state === 'forwarded'
          ? ('forwarded' as const)
          : state === 'filtered'
            ? ('suppressed' as const)
            : state === 'delivery_unknown'
              ? ('unknown' as const)
              : state === 'failed'
                ? ('failed' as const)
                : ('pending' as const),
    notifiedAt: audit.notifiedAt ? new Date(audit.notifiedAt) : null,
    reason: audit.reason ?? null,
    repliedAt: audit.repliedAt ? new Date(audit.repliedAt) : null,
    replyIntent: audit.replyIntent ?? null,
    replySubject: audit.replySubject ?? null,
    state,
    tags: audit.tags ?? [],
  };
};
