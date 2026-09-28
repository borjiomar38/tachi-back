import { z } from 'zod';

import { EMAIL_INBOX_FILTERS } from '@/server/email-inbox/policy';

export const zEmailInboxFilter = z.enum(EMAIL_INBOX_FILTERS);

export const zEmailInboxListInput = z
  .object({
    cursor: z.string().optional(),
    filter: zEmailInboxFilter.optional().prefault('all'),
    limit: z.coerce.number().int().min(1).max(100).prefault(50),
    mailbox: z.string().trim().optional().prefault('all'),
    searchTerm: z.string().trim().optional().prefault(''),
  })
  .prefault({});

export const zEmailInboxMessage = z.object({
  aiGenerated: z.boolean(),
  bodyText: z.string(),
  createdAt: z.date(),
  deliveryStatus: z.enum([
    'received',
    'sending',
    'sent',
    'delivery_unknown',
    'failed',
  ]),
  direction: z.enum(['inbound', 'outbound']),
  id: z.string(),
  receivedAt: z.date().nullish(),
  recipientEmail: z.string(),
  senderEmail: z.string(),
  sentAt: z.date().nullish(),
  source: z.enum(['contact_form', 'email', 'codex', 'support']),
  subject: z.string(),
});

export const zEmailInboxThreadSummary = z.object({
  email: z.string(),
  id: z.string(),
  latestMessage: zEmailInboxMessage,
  mailbox: z.string(),
  name: z.string(),
  readAt: z.date().nullish(),
  status: z.enum(['unread', 'in_progress', 'resolved', 'spam']),
  subject: z.string(),
  updatedAt: z.date(),
});

export const zEmailInboxListResponse = z.object({
  items: z.array(zEmailInboxThreadSummary),
  mailboxes: z.array(z.string()),
  nextCursor: z.string().optional(),
  summary: z.object({
    mailboxes: z.number().int().nonnegative(),
    replied: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    unread: z.number().int().nonnegative(),
  }),
  total: z.number().int().nonnegative(),
});

export const zEmailInboxThreadInput = z.object({ id: z.string() });

export const zEmailInboxThreadDetail = zEmailInboxThreadSummary.extend({
  conversation: z.array(zEmailInboxMessage),
});
