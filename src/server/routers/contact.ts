import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import {
  zContactMessageByIdInput,
  zContactMessageDetail,
  zContactMessageListInput,
  zContactMessageListResponse,
  zDeleteContactMessageInput,
  zUpdateContactMessageInput,
} from '@/server/contact/schema';
import { Prisma } from '@/server/db/generated/client';
import { protectedProcedure } from '@/server/orpc';

const tags = ['contacts'];

function buildBaseWhere(searchTerm?: string) {
  const normalizedSearchTerm = searchTerm?.trim();

  if (!normalizedSearchTerm) {
    return {} satisfies Prisma.ContactMessageWhereInput;
  }

  return {
    OR: [
      {
        email: {
          contains: normalizedSearchTerm,
          mode: 'insensitive',
        },
      },
      {
        message: {
          contains: normalizedSearchTerm,
          mode: 'insensitive',
        },
      },
      {
        name: {
          contains: normalizedSearchTerm,
          mode: 'insensitive',
        },
      },
      {
        subject: {
          contains: normalizedSearchTerm,
          mode: 'insensitive',
        },
      },
    ],
  } satisfies Prisma.ContactMessageWhereInput;
}

export default {
  getAll: protectedProcedure({
    permissions: {
      contact: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/contacts',
      tags,
    })
    .input(zContactMessageListInput)
    .output(zContactMessageListResponse)
    .handler(async ({ context, input }) => {
      const baseWhere = buildBaseWhere(input.searchTerm);
      const where = {
        ...baseWhere,
        ...(input.status !== 'all' ? { status: input.status } : {}),
      } satisfies Prisma.ContactMessageWhereInput;

      const [total, items, groupedCounts] = await Promise.all([
        context.db.contactMessage.count({
          where,
        }),
        context.db.contactMessage.findMany({
          cursor: input.cursor ? { id: input.cursor } : undefined,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
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
            name: true,
            readAt: true,
            resolvedAt: true,
            status: true,
            subject: true,
            updatedAt: true,
          },
          take: input.limit + 1,
          where,
        }),
        context.db.contactMessage.groupBy({
          _count: {
            _all: true,
          },
          by: ['status'],
          where: baseWhere,
        }),
      ]);

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      const statusCounts = groupedCounts.reduce(
        (acc, entry) => {
          if (entry.status === 'unread') acc.unread = entry._count._all;
          if (entry.status === 'in_progress')
            acc.inProgress = entry._count._all;
          if (entry.status === 'resolved') acc.resolved = entry._count._all;
          if (entry.status === 'spam') acc.spam = entry._count._all;
          acc.total += entry._count._all;
          return acc;
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
        items: items.map((item) => ({
          assignedTo: item.assignedToUser,
          createdAt: item.createdAt,
          email: item.email,
          id: item.id,
          name: item.name,
          readAt: item.readAt,
          resolvedAt: item.resolvedAt,
          status: item.status,
          subject: item.subject,
          updatedAt: item.updatedAt,
        })),
        nextCursor,
        statusCounts,
        total,
      };
    }),

  getById: protectedProcedure({
    permissions: {
      contact: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/contacts/{id}',
      tags,
    })
    .input(zContactMessageByIdInput)
    .output(zContactMessageDetail)
    .handler(async ({ context, input }) => {
      const item = await context.db.contactMessage.findUnique({
        where: {
          id: input.id,
        },
        select: {
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
          ipAddress: true,
          message: true,
          name: true,
          readAt: true,
          resolvedAt: true,
          source: true,
          status: true,
          subject: true,
          updatedAt: true,
          userAgent: true,
        },
      });

      if (!item) {
        throw new ORPCError('NOT_FOUND');
      }

      return {
        assignedTo: item.assignedToUser,
        createdAt: item.createdAt,
        email: item.email,
        id: item.id,
        internalNotes: item.internalNotes,
        ipAddress: item.ipAddress,
        message: item.message,
        name: item.name,
        readAt: item.readAt,
        resolvedAt: item.resolvedAt,
        source: item.source,
        status: item.status,
        subject: item.subject,
        updatedAt: item.updatedAt,
        userAgent: item.userAgent,
      };
    }),

  updateById: protectedProcedure({
    permissions: {
      contact: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/contacts/{id}',
      tags,
    })
    .input(zUpdateContactMessageInput)
    .output(zContactMessageDetail)
    .handler(async ({ context, input }) => {
      const existing = await context.db.contactMessage.findUnique({
        where: {
          id: input.id,
        },
        select: {
          readAt: true,
        },
      });

      if (!existing) {
        throw new ORPCError('NOT_FOUND');
      }

      const now = new Date();
      const updated = await context.db.contactMessage.update({
        where: {
          id: input.id,
        },
        data: {
          assignedToUserId: context.user.id,
          internalNotes: input.internalNotes || null,
          readAt: existing.readAt ?? (input.status === 'unread' ? null : now),
          resolvedAt: input.status === 'resolved' ? now : null,
          status: input.status,
        },
        select: {
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
          ipAddress: true,
          message: true,
          name: true,
          readAt: true,
          resolvedAt: true,
          source: true,
          status: true,
          subject: true,
          updatedAt: true,
          userAgent: true,
        },
      });

      return {
        assignedTo: updated.assignedToUser,
        createdAt: updated.createdAt,
        email: updated.email,
        id: updated.id,
        internalNotes: updated.internalNotes,
        ipAddress: updated.ipAddress,
        message: updated.message,
        name: updated.name,
        readAt: updated.readAt,
        resolvedAt: updated.resolvedAt,
        source: updated.source,
        status: updated.status,
        subject: updated.subject,
        updatedAt: updated.updatedAt,
        userAgent: updated.userAgent,
      };
    }),

  deleteById: protectedProcedure({
    permissions: {
      contact: ['delete'],
    },
  })
    .route({
      method: 'DELETE',
      path: '/contacts/{id}',
      tags,
    })
    .input(zDeleteContactMessageInput)
    .output(z.void())
    .handler(async ({ context, input }) => {
      await context.db.contactMessage.delete({
        where: {
          id: input.id,
        },
      });
    }),
};
