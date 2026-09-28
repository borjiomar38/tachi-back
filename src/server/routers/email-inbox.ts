import { ORPCError } from '@orpc/client';

import { Prisma } from '@/server/db/generated/client';
import {
  getEmailInboxBaseWhere,
  getEmailInboxStatusWhere,
  resolveEmailInboxWhere,
} from '@/server/email-inbox/policy';
import {
  zEmailInboxListInput,
  zEmailInboxListResponse,
  zEmailInboxThreadDetail,
  zEmailInboxThreadInput,
} from '@/server/email-inbox/schema';
import { protectedProcedure } from '@/server/orpc';

const tags = ['email-inbox'];

const conversationMessageSelect = {
  aiGenerated: true,
  bodyText: true,
  createdAt: true,
  deliveryStatus: true,
  direction: true,
  id: true,
  receivedAt: true,
  recipientEmail: true,
  senderEmail: true,
  sentAt: true,
  source: true,
  subject: true,
} satisfies Prisma.ContactConversationMessageSelect;

const emailThreadBaseSelect = {
  email: true,
  id: true,
  name: true,
  readAt: true,
  status: true,
  subject: true,
  updatedAt: true,
} satisfies Prisma.ContactMessageSelect;

const emailThreadListSelect = {
  ...emailThreadBaseSelect,
  conversationMessages: {
    orderBy: { createdAt: 'desc' },
    select: conversationMessageSelect,
    take: 1,
  },
} satisfies Prisma.ContactMessageSelect;

const emailThreadDetailSelect = {
  ...emailThreadBaseSelect,
  conversationMessages: {
    orderBy: { createdAt: 'desc' },
    select: conversationMessageSelect,
  },
} satisfies Prisma.ContactMessageSelect;

type EmailThreadRecord = Prisma.ContactMessageGetPayload<{
  select: typeof emailThreadDetailSelect;
}>;

const getMessageMailbox = (item: EmailThreadRecord) => {
  const latestMessage = item.conversationMessages[0];
  if (!latestMessage) return '';
  const mailbox =
    latestMessage.direction === 'inbound'
      ? latestMessage.recipientEmail
      : latestMessage.senderEmail;
  return mailbox.toLowerCase();
};

const mapEmailThreadSummary = (item: EmailThreadRecord) => {
  const latestMessage = item.conversationMessages[0];
  if (!latestMessage) {
    throw new Error(`Email thread ${item.id} has no conversation messages`);
  }

  return {
    email: item.email,
    id: item.id,
    latestMessage,
    mailbox: getMessageMailbox(item),
    name: item.name,
    readAt: item.readAt,
    status: item.status,
    subject: item.subject,
    updatedAt: item.updatedAt,
  };
};

export const emailInboxRouter = {
  list: protectedProcedure({ permissions: { contact: ['read'] } })
    .route({ method: 'GET', path: '/email-inbox', tags })
    .input(zEmailInboxListInput)
    .output(zEmailInboxListResponse)
    .handler(async ({ context, input }) => {
      const baseWhere = getEmailInboxBaseWhere(input);
      const where = resolveEmailInboxWhere(input);

      const [total, items, unread, replied, mailboxEntries] = await Promise.all(
        [
          context.db.contactMessage.count({ where }),
          context.db.contactMessage.findMany({
            cursor: input.cursor ? { id: input.cursor } : undefined,
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            select: emailThreadListSelect,
            take: input.limit + 1,
            where,
          }),
          context.db.contactMessage.count({
            where: {
              AND: [baseWhere, getEmailInboxStatusWhere('unread')],
            },
          }),
          context.db.contactMessage.count({
            where: {
              AND: [baseWhere, getEmailInboxStatusWhere('replied')],
            },
          }),
          context.db.contactConversationMessage.findMany({
            distinct: ['recipientEmail'],
            orderBy: { recipientEmail: 'asc' },
            select: { recipientEmail: true },
            where: {
              direction: 'inbound',
              recipientEmail: { not: '' },
              source: 'email',
            },
          }),
        ]
      );

      let nextCursor: string | undefined;
      if (items.length > input.limit) nextCursor = items.pop()?.id;

      const mailboxes = mailboxEntries.map((entry) =>
        entry.recipientEmail.toLowerCase()
      );
      const scopedTotal = await context.db.contactMessage.count({
        where: baseWhere,
      });

      return {
        items: items.map(mapEmailThreadSummary),
        mailboxes,
        nextCursor,
        summary: {
          mailboxes: mailboxes.length,
          replied,
          total: scopedTotal,
          unread,
        },
        total,
      };
    }),

  getById: protectedProcedure({ permissions: { contact: ['read'] } })
    .route({ method: 'GET', path: '/email-inbox/{id}', tags })
    .input(zEmailInboxThreadInput)
    .output(zEmailInboxThreadDetail)
    .handler(async ({ context, input }) => {
      const item = await context.db.contactMessage.findFirst({
        select: emailThreadDetailSelect,
        where: {
          AND: [
            { id: input.id },
            {
              conversationMessages: {
                some: { direction: 'inbound', source: 'email' },
              },
            },
          ],
        },
      });

      if (!item) throw new ORPCError('NOT_FOUND');

      return {
        ...mapEmailThreadSummary(item),
        conversation: [...item.conversationMessages].reverse(),
      };
    }),
};

export default emailInboxRouter;
