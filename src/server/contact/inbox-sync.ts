import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import { envServer } from '@/env/server';
import {
  extractLatestContactReply,
  getContactReferenceMessageIds,
  normalizeContactMessageId,
  resolveContactThreadCandidate,
} from '@/server/contact/thread-policy';
import { getContactTriageSource } from '@/server/contact/triage-audit';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';

const CHECKPOINT_KEY = 'contact-inbox-checkpoint:v1';
const MAX_MESSAGE_BYTES = 5 * 1024 * 1024;
const THREAD_FALLBACK_WINDOW_DAYS = 90;

interface ContactInboxCheckpoint {
  lastUid: number;
  uidValidity: string;
}

const getMailboxConfig = () => {
  if (!envServer.CONTACT_IMAP_SERVER) return null;
  const url = new URL(envServer.CONTACT_IMAP_SERVER);

  if (url.protocol !== 'imaps:') {
    throw new Error('CONTACT_IMAP_SERVER must use imaps://');
  }
  if (!url.username || !url.password) {
    throw new Error('CONTACT_IMAP_SERVER must include mailbox credentials');
  }

  return {
    auth: {
      pass: decodeURIComponent(url.password),
      user: decodeURIComponent(url.username),
    },
    host: url.hostname,
    port: Number(url.port || 993),
    secure: true,
  } as const;
};

const parseCheckpoint = (value: unknown): ContactInboxCheckpoint | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.lastUid !== 'number' ||
    typeof record.uidValidity !== 'string'
  ) {
    return null;
  }
  return { lastUid: record.lastUid, uidValidity: record.uidValidity };
};

const saveCheckpoint = async (checkpoint: ContactInboxCheckpoint) => {
  const value = {
    lastUid: checkpoint.lastUid,
    uidValidity: checkpoint.uidValidity,
  } satisfies Prisma.InputJsonObject;
  await db.appConfig.upsert({
    create: { key: CHECKPOINT_KEY, value },
    update: { value },
    where: { key: CHECKPOINT_KEY },
  });
};

const getAddress = (
  address:
    | { value: Array<{ address?: string; name?: string }> }
    | Array<{ value: Array<{ address?: string; name?: string }> }>
    | undefined
) => {
  const entry = Array.isArray(address)
    ? address[0]?.value[0]
    : address?.value[0];
  return {
    email: entry?.address?.trim().toLowerCase() ?? '',
    name: entry?.name?.trim() ?? '',
  };
};

const getHeaderText = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const isAutomatedOrInternalEmail = (
  parsed: Awaited<ReturnType<typeof simpleParser>>,
  senderEmail: string
) => {
  const supportEmail = envServer.SUPPORT_EMAIL.toLowerCase();
  const configuredFrom = envServer.EMAIL_FROM.match(/<([^>]+)>/)?.[1]
    ?.trim()
    .toLowerCase();
  const autoSubmitted = getHeaderText(parsed.headers.get('auto-submitted'));
  const precedence = getHeaderText(parsed.headers.get('precedence'));

  return (
    senderEmail === supportEmail ||
    senderEmail === configuredFrom ||
    (autoSubmitted && autoSubmitted !== 'no') ||
    ['bulk', 'junk', 'list'].includes(precedence)
  );
};

const htmlToPlainText = (html: string) =>
  html
    .replaceAll(/<br\s*\/?\s*>/gi, '\n')
    .replaceAll(/<\/p\s*>/gi, '\n')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/&nbsp;/gi, ' ')
    .replaceAll(/&amp;/gi, '&')
    .replaceAll(/&lt;/gi, '<')
    .replaceAll(/&gt;/gi, '>')
    .replaceAll(/\s+\n/g, '\n')
    .trim();

const getConversationBody = (
  parsed: Awaited<ReturnType<typeof simpleParser>>
) => {
  const rawText =
    parsed.text ??
    (typeof parsed.html === 'string' ? htmlToPlainText(parsed.html) : '');
  return extractLatestContactReply(rawText);
};

const getCandidateContacts = async (
  senderEmail: string,
  referenceMessageIds: string[]
) => {
  const recentAfter = new Date(
    Date.now() - THREAD_FALLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  const contacts = await db.contactMessage.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      conversationMessages: { select: { messageId: true } },
      email: true,
      id: true,
      subject: true,
    },
    where: {
      OR: [
        { createdAt: { gte: recentAfter }, email: senderEmail },
        ...(referenceMessageIds.length
          ? [
              {
                conversationMessages: {
                  some: { messageId: { in: referenceMessageIds } },
                },
              },
            ]
          : []),
      ],
    },
  });

  return contacts.map((contact) => ({
    email: contact.email,
    id: contact.id,
    messageIds: contact.conversationMessages.map(
      (message) => message.messageId
    ),
    subject: contact.subject,
  }));
};

const storeInboundEmail = async (input: {
  bodyText: string;
  inReplyTo?: string;
  messageId: string;
  name: string;
  providerUid: number;
  receivedAt: Date;
  recipientEmail: string;
  references: string[];
  senderEmail: string;
  subject: string;
}) => {
  const candidates = await getCandidateContacts(
    input.senderEmail,
    getContactReferenceMessageIds(input.inReplyTo, input.references)
  );
  const resolved = resolveContactThreadCandidate({
    candidates,
    inReplyTo: input.inReplyTo,
    references: input.references,
    senderEmail: input.senderEmail,
    subject: input.subject,
  });

  return await db.$transaction(async (tx) => {
    const existing = await tx.contactConversationMessage.findUnique({
      select: { id: true },
      where: { messageId: input.messageId },
    });
    if (existing) return false;

    const contact = resolved
      ? await tx.contactMessage.update({
          data: {
            readAt: null,
            resolvedAt: null,
            source: getContactTriageSource('pending'),
            status: 'unread',
          },
          select: { id: true },
          where: { id: resolved.id },
        })
      : await tx.contactMessage.create({
          data: {
            email: input.senderEmail,
            message: input.bodyText,
            name:
              input.name ||
              input.senderEmail.split('@')[0] ||
              input.senderEmail,
            source: getContactTriageSource('pending'),
            subject: input.subject,
            userAgent: 'email/imap',
          },
          select: { id: true },
        });

    await tx.contactConversationMessage.create({
      data: {
        automationStatus: 'pending',
        bodyText: input.bodyText,
        contactId: contact.id,
        deliveryStatus: 'received',
        direction: 'inbound',
        inReplyTo: input.inReplyTo,
        messageId: input.messageId,
        providerUid: input.providerUid,
        receivedAt: input.receivedAt,
        recipientEmail: input.recipientEmail,
        references: input.references,
        senderEmail: input.senderEmail,
        source: 'email',
        subject: input.subject,
      },
    });
    return true;
  });
};

export const syncContactInbox = async () => {
  const config = getMailboxConfig();
  if (!config) return { configured: false, imported: 0, scanned: 0 };

  const client = new ImapFlow({
    ...config,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    logger: false,
    maxLiteralSize: MAX_MESSAGE_BYTES,
    socketTimeout: 30_000,
  });
  let imported = 0;
  let scanned = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(envServer.CONTACT_IMAP_MAILBOX);

    try {
      if (!client.mailbox) throw new Error('Contact mailbox did not open');
      const uidValidity = client.mailbox.uidValidity.toString();
      const stored = await db.appConfig.findUnique({
        select: { value: true },
        where: { key: CHECKPOINT_KEY },
      });
      const checkpoint = parseCheckpoint(stored?.value);
      let lastUid =
        checkpoint?.uidValidity === uidValidity ? checkpoint.lastUid : 0;
      const lastAvailableUid = Math.max(0, client.mailbox.uidNext - 1);

      if (lastAvailableUid <= lastUid) {
        return { configured: true, imported, scanned };
      }

      for await (const message of client.fetch(
        `${lastUid + 1}:${lastAvailableUid}`,
        {
          internalDate: true,
          source: { maxLength: MAX_MESSAGE_BYTES },
          uid: true,
        },
        { uid: true }
      )) {
        scanned += 1;
        if (!message.source)
          throw new Error(`IMAP message ${message.uid} had no source`);
        const parsed = await simpleParser(message.source, {
          skipHtmlToText: true,
          skipTextToHtml: true,
        });
        const sender = getAddress(parsed.from);
        const recipient = getAddress(parsed.to);
        const references = Array.isArray(parsed.references)
          ? parsed.references
          : parsed.references
            ? [parsed.references]
            : [];
        const bodyText = getConversationBody(parsed);
        const rawMessageId =
          parsed.messageId ?? `<imap-${uidValidity}-${message.uid}@nayovi.com>`;
        const messageId = normalizeContactMessageId(rawMessageId);

        if (
          sender.email &&
          bodyText &&
          !isAutomatedOrInternalEmail(parsed, sender.email)
        ) {
          const stored = await storeInboundEmail({
            bodyText,
            inReplyTo: parsed.inReplyTo
              ? normalizeContactMessageId(parsed.inReplyTo)
              : undefined,
            messageId,
            name: sender.name,
            providerUid: message.uid,
            receivedAt:
              parsed.date ??
              (message.internalDate
                ? new Date(message.internalDate)
                : new Date()),
            recipientEmail: recipient.email || envServer.SUPPORT_EMAIL,
            references: references
              .map(normalizeContactMessageId)
              .filter(Boolean),
            senderEmail: sender.email,
            subject: parsed.subject?.trim() || 'Contact email',
          });
          if (stored) imported += 1;
        }

        lastUid = message.uid;
        await saveCheckpoint({ lastUid, uidValidity });
      }

      return { configured: true, imported, scanned };
    } finally {
      lock.release();
    }
  } finally {
    if (client.usable) await client.logout();
    else client.close();
  }
};
