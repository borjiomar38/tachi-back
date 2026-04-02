import { z } from 'zod';

export const zContactMessageStatus = z.enum([
  'unread',
  'in_progress',
  'resolved',
  'spam',
]);

export const zPublicContactMessageInput = z.object({
  email: z.email().max(160),
  message: z.string().trim().min(20).max(4000),
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(4).max(160),
});

export const zContactMessageSummary = z.object({
  assignedTo: z
    .object({
      email: z.string(),
      id: z.string(),
      name: z.string(),
    })
    .nullish(),
  createdAt: z.date(),
  email: z.string(),
  id: z.string(),
  name: z.string(),
  readAt: z.date().nullish(),
  resolvedAt: z.date().nullish(),
  status: zContactMessageStatus,
  subject: z.string(),
  updatedAt: z.date(),
});

export const zContactMessageDetail = zContactMessageSummary.extend({
  internalNotes: z.string().nullish(),
  ipAddress: z.string().nullish(),
  message: z.string(),
  source: z.string(),
  userAgent: z.string().nullish(),
});

export const zContactMessageListResponse = z.object({
  items: z.array(zContactMessageSummary),
  nextCursor: z.string().optional(),
  statusCounts: z.object({
    inProgress: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
    spam: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    unread: z.number().int().nonnegative(),
  }),
  total: z.number().int().nonnegative(),
});

export const zContactMessageListInput = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).prefault(20),
    searchTerm: z.string().trim().optional().prefault(''),
    status: z
      .union([zContactMessageStatus, z.literal('all')])
      .optional()
      .prefault('all'),
  })
  .prefault({});

export const zContactMessageByIdInput = z.object({
  id: z.string(),
});

export const zUpdateContactMessageInput = z.object({
  id: z.string(),
  internalNotes: z.string().trim().max(5000).optional().default(''),
  status: zContactMessageStatus,
});

export const zDeleteContactMessageInput = z.object({
  id: z.string(),
});
