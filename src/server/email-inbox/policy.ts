import type { Prisma } from '@/server/db/generated/client';

export const EMAIL_INBOX_FILTERS = [
  'all',
  'unread',
  'read',
  'replied',
] as const;

export type EmailInboxFilter = (typeof EMAIL_INBOX_FILTERS)[number];

export interface EmailInboxFilterInput {
  filter: EmailInboxFilter;
  mailbox?: string;
  searchTerm?: string;
}

const getSearchWhere = (
  searchTerm?: string
): Prisma.ContactMessageWhereInput => {
  const search = searchTerm?.trim();
  if (!search) return {};

  return {
    OR: [
      { email: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      {
        conversationMessages: {
          some: {
            OR: [
              { bodyText: { contains: search, mode: 'insensitive' } },
              { recipientEmail: { contains: search, mode: 'insensitive' } },
              { senderEmail: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      },
    ],
  };
};

const getMailboxWhere = (mailbox?: string): Prisma.ContactMessageWhereInput => {
  if (!mailbox || mailbox === 'all') return {};

  return {
    conversationMessages: {
      some: {
        OR: [
          {
            direction: 'inbound',
            recipientEmail: { equals: mailbox, mode: 'insensitive' },
          },
          {
            direction: 'outbound',
            senderEmail: { equals: mailbox, mode: 'insensitive' },
          },
        ],
      },
    },
  };
};

export const getEmailInboxBaseWhere = (
  input: Pick<EmailInboxFilterInput, 'mailbox' | 'searchTerm'>
): Prisma.ContactMessageWhereInput => ({
  AND: [
    {
      conversationMessages: {
        some: { direction: 'inbound', source: 'email' },
      },
    },
    getSearchWhere(input.searchTerm),
    getMailboxWhere(input.mailbox),
  ],
});

export const getEmailInboxStatusWhere = (
  filter: EmailInboxFilter
): Prisma.ContactMessageWhereInput => {
  const filters: Record<EmailInboxFilter, Prisma.ContactMessageWhereInput> = {
    all: {},
    read: { status: { not: 'unread' } },
    replied: {
      conversationMessages: {
        some: { deliveryStatus: 'sent', direction: 'outbound' },
      },
    },
    unread: { status: 'unread' },
  };

  return filters[filter];
};

export const resolveEmailInboxWhere = (
  input: EmailInboxFilterInput
): Prisma.ContactMessageWhereInput => ({
  AND: [getEmailInboxBaseWhere(input), getEmailInboxStatusWhere(input.filter)],
});
