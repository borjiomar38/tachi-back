import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import {
  zContactMessageByIdInput,
  zContactMessageDetail,
  zContactMessageListInput,
  zContactMessageListResponse,
  zContactTriageFilter,
  zDeleteContactMessageInput,
  zUpdateContactMessageInput,
} from '@/server/contact/schema';
import {
  canQueueContactReanalysis,
  CONTACT_TRIAGE_LEGACY_SOURCE,
  CONTACT_TRIAGE_SOURCE_PREFIX,
  getContactSourceOrigin,
  getContactTriageSource,
  getContactTriageView,
  parseContactTriageMetadata,
  replaceContactHumanNotes,
  writeContactTriageMetadata,
} from '@/server/contact/triage-audit';
import { Prisma } from '@/server/db/generated/client';
import { protectedProcedure } from '@/server/orpc';

const tags = ['contacts'];

const contactSummarySelect = {
  assignedToUser: {
    select: {
      email: true,
      id: true,
      name: true,
    },
  },
  createdAt: true,
  email: true,
  id: true,
  internalNotes: true,
  name: true,
  readAt: true,
  resolvedAt: true,
  source: true,
  status: true,
  subject: true,
  updatedAt: true,
} satisfies Prisma.ContactMessageSelect;

const contactDetailSelect = {
  ...contactSummarySelect,
  conversationMessages: {
    orderBy: { createdAt: 'asc' },
    select: {
      aiGenerated: true,
      automationStatus: true,
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
    },
  },
  ipAddress: true,
  message: true,
  userAgent: true,
} satisfies Prisma.ContactMessageSelect;

type ContactSummaryRecord = Prisma.ContactMessageGetPayload<{
  select: typeof contactSummarySelect;
}>;
type ContactDetailRecord = Prisma.ContactMessageGetPayload<{
  select: typeof contactDetailSelect;
}>;
type ContactTriageFilter = z.infer<typeof zContactTriageFilter>;

const buildBaseWhere = (
  searchTerm?: string
): Prisma.ContactMessageWhereInput => {
  const normalizedSearchTerm = searchTerm?.trim();

  if (!normalizedSearchTerm) return {};

  return {
    OR: [
      { email: { contains: normalizedSearchTerm, mode: 'insensitive' } },
      { message: { contains: normalizedSearchTerm, mode: 'insensitive' } },
      { name: { contains: normalizedSearchTerm, mode: 'insensitive' } },
      { subject: { contains: normalizedSearchTerm, mode: 'insensitive' } },
    ],
  };
};

const buildTriageWhere = (
  filter: ContactTriageFilter
): Prisma.ContactMessageWhereInput => {
  const source = (state: string) => `${CONTACT_TRIAGE_SOURCE_PREFIX}${state}`;
  const filters: Record<ContactTriageFilter, Prisma.ContactMessageWhereInput> =
    {
      all: {},
      awaiting: {
        source: {
          in: [
            CONTACT_TRIAGE_LEGACY_SOURCE,
            source('pending'),
            source('processing'),
            source('retry'),
            source('customer_reply_sending'),
            source('notification_sending'),
          ],
        },
      },
      filtered: { source: source('ignored') },
      forwarded: {
        OR: [
          {
            internalNotes: { contains: '"classification":"actionable"' },
            source: source('notified'),
          },
          { source: source('customer_replied') },
        ],
      },
      needs_review: {
        OR: [
          { source: source('failed') },
          { source: source('customer_reply_unknown') },
          { source: source('notification_unknown') },
          {
            internalNotes: { contains: '"classification":"uncertain"' },
            source: source('notified'),
          },
        ],
      },
    };

  return filters[filter];
};

const mapContactSummary = (item: ContactSummaryRecord) => ({
  assignedTo: item.assignedToUser,
  createdAt: item.createdAt,
  email: item.email,
  id: item.id,
  name: item.name,
  readAt: item.readAt,
  resolvedAt: item.resolvedAt,
  status: item.status,
  subject: item.subject,
  triage: getContactTriageView(item.source, item.internalNotes),
  updatedAt: item.updatedAt,
});

const mapContactDetail = (item: ContactDetailRecord) => ({
  ...mapContactSummary(item),
  conversation: item.conversationMessages,
  internalNotes: parseContactTriageMetadata(item.internalNotes).humanNotes,
  ipAddress: item.ipAddress,
  message: item.message,
  source: getContactSourceOrigin(item.source),
  userAgent: item.userAgent,
});

const getTriageCounts = (
  entries: Array<Pick<ContactSummaryRecord, 'internalNotes' | 'source'>>
) =>
  entries.reduce(
    (counts, entry) => {
      const triage = getContactTriageView(entry.source, entry.internalNotes);
      counts.total += 1;
      if (triage.classification) counts.analyzed += 1;
      if (['awaiting', 'processing', 'retrying'].includes(triage.state)) {
        counts.awaiting += 1;
      }
      if (triage.state === 'failed') {
        counts.failed += 1;
        counts.needsReview += 1;
      }
      if (triage.state === 'delivery_unknown') counts.needsReview += 1;
      if (triage.state === 'filtered') counts.filtered += 1;
      if (
        ['forwarded', 'replied'].includes(triage.state) &&
        triage.classification === 'actionable'
      ) {
        counts.forwarded += 1;
      }
      if (triage.classification === 'uncertain') counts.needsReview += 1;
      if (
        triage.analyzedAt &&
        (!counts.lastAnalyzedAt || triage.analyzedAt > counts.lastAnalyzedAt)
      ) {
        counts.lastAnalyzedAt = triage.analyzedAt;
      }
      return counts;
    },
    {
      analyzed: 0,
      awaiting: 0,
      failed: 0,
      filtered: 0,
      forwarded: 0,
      lastAnalyzedAt: null as Date | null,
      needsReview: 0,
      total: 0,
    }
  );

export const contactRouter = {
  getAll: protectedProcedure({ permissions: { contact: ['read'] } })
    .route({ method: 'GET', path: '/contacts', tags })
    .input(zContactMessageListInput)
    .output(zContactMessageListResponse)
    .handler(async ({ context, input }) => {
      const baseWhere = buildBaseWhere(input.searchTerm);
      const where = {
        AND: [
          baseWhere,
          buildTriageWhere(input.triage),
          input.status === 'all' ? {} : { status: input.status },
        ],
      } satisfies Prisma.ContactMessageWhereInput;

      const [total, items, groupedCounts, triageEntries] = await Promise.all([
        context.db.contactMessage.count({ where }),
        context.db.contactMessage.findMany({
          cursor: input.cursor ? { id: input.cursor } : undefined,
          orderBy: { createdAt: 'desc' },
          select: contactSummarySelect,
          take: input.limit + 1,
          where,
        }),
        context.db.contactMessage.groupBy({
          _count: { _all: true },
          by: ['status'],
          where: baseWhere,
        }),
        context.db.contactMessage.findMany({
          select: { internalNotes: true, source: true },
          where: baseWhere,
        }),
      ]);

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        nextCursor = items.pop()?.id;
      }

      const statusCounts = groupedCounts.reduce(
        (counts, entry) => {
          if (entry.status === 'unread') counts.unread = entry._count._all;
          if (entry.status === 'in_progress') {
            counts.inProgress = entry._count._all;
          }
          if (entry.status === 'resolved') counts.resolved = entry._count._all;
          if (entry.status === 'spam') counts.spam = entry._count._all;
          counts.total += entry._count._all;
          return counts;
        },
        {
          inProgress: 0,
          resolved: 0,
          spam: 0,
          total: 0,
          unread: 0,
        }
      );

      return {
        items: items.map(mapContactSummary),
        nextCursor,
        statusCounts,
        total,
        triageCounts: getTriageCounts(triageEntries),
      };
    }),

  getById: protectedProcedure({ permissions: { contact: ['read'] } })
    .route({ method: 'GET', path: '/contacts/{id}', tags })
    .input(zContactMessageByIdInput)
    .output(zContactMessageDetail)
    .handler(async ({ context, input }) => {
      const item = await context.db.contactMessage.findUnique({
        select: contactDetailSelect,
        where: { id: input.id },
      });

      if (!item) throw new ORPCError('NOT_FOUND');
      return mapContactDetail(item);
    }),

  updateById: protectedProcedure({ permissions: { contact: ['update'] } })
    .route({ method: 'POST', path: '/contacts/{id}', tags })
    .input(zUpdateContactMessageInput)
    .output(zContactMessageDetail)
    .handler(async ({ context, input }) => {
      const existing = await context.db.contactMessage.findUnique({
        select: { internalNotes: true, readAt: true },
        where: { id: input.id },
      });

      if (!existing) throw new ORPCError('NOT_FOUND');

      const now = new Date();
      const updated = await context.db.contactMessage.update({
        data: {
          assignedToUserId: context.user.id,
          internalNotes: replaceContactHumanNotes(
            existing.internalNotes,
            input.internalNotes
          ),
          readAt: existing.readAt ?? (input.status === 'unread' ? null : now),
          resolvedAt: input.status === 'resolved' ? now : null,
          status: input.status,
        },
        select: contactDetailSelect,
        where: { id: input.id },
      });

      return mapContactDetail(updated);
    }),

  reanalyzeById: protectedProcedure({ permissions: { contact: ['update'] } })
    .route({ method: 'POST', path: '/contacts/{id}/reanalyze', tags })
    .input(zContactMessageByIdInput)
    .output(zContactMessageDetail)
    .handler(async ({ context, input }) => {
      const existing = await context.db.contactMessage.findUnique({
        select: contactDetailSelect,
        where: { id: input.id },
      });

      if (!existing) throw new ORPCError('NOT_FOUND');
      if (!canQueueContactReanalysis(existing.source)) {
        throw new ORPCError('CONFLICT');
      }

      const metadata = parseContactTriageMetadata(existing.internalNotes);
      const latestInbound = [...existing.conversationMessages]
        .reverse()
        .find((message) => message.direction === 'inbound');
      if (!latestInbound) throw new ORPCError('CONFLICT');
      await context.db.contactConversationMessage.update({
        data: { automationStatus: 'pending' },
        where: { id: latestInbound.id },
      });
      const updated = await context.db.contactMessage.update({
        data: {
          internalNotes: writeContactTriageMetadata(metadata.humanNotes, {
            ...metadata.audit,
            error: undefined,
          }),
          source: getContactTriageSource('pending'),
        },
        select: contactDetailSelect,
        where: { id: input.id },
      });

      return mapContactDetail(updated);
    }),

  retryFailed: protectedProcedure({ permissions: { contact: ['update'] } })
    .route({ method: 'POST', path: '/contacts/triage/retry-failed', tags })
    .input(z.object({}))
    .output(z.object({ count: z.number().int().nonnegative() }))
    .handler(async ({ context }) => {
      const failedContacts = await context.db.contactMessage.findMany({
        select: { id: true },
        where: { source: getContactTriageSource('failed') },
      });
      const ids = failedContacts.map((contact) => contact.id);
      const [result] = await Promise.all([
        context.db.contactMessage.updateMany({
          data: { source: getContactTriageSource('retry') },
          where: { id: { in: ids } },
        }),
        context.db.contactConversationMessage.updateMany({
          data: { automationStatus: 'pending' },
          where: {
            automationStatus: 'failed',
            contactId: { in: ids },
            direction: 'inbound',
          },
        }),
      ]);
      return { count: result.count };
    }),

  deleteById: protectedProcedure({ permissions: { contact: ['delete'] } })
    .route({ method: 'DELETE', path: '/contacts/{id}', tags })
    .input(zDeleteContactMessageInput)
    .output(z.void())
    .handler(async ({ context, input }) => {
      await context.db.contactMessage.delete({ where: { id: input.id } });
    }),
};

export default contactRouter;
