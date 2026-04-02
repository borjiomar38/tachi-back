import { call } from '@orpc/server';
import { beforeEach, describe, expect, it } from 'vitest';

import contactRouter from '@/server/routers/contact';
import {
  mockDb,
  mockGetSession,
  mockUser,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

const now = new Date('2026-03-20T10:00:00.000Z');

describe('contact router', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: mockUser,
    });
    mockUserHasPermission.mockResolvedValue({
      error: false,
      success: true,
    });
  });

  describe('getAll', () => {
    it('returns paginated contact messages with status counts', async () => {
      mockDb.contactMessage.count.mockResolvedValue(1);
      mockDb.contactMessage.findMany.mockResolvedValue([
        {
          assignedToUser: {
            email: 'support@tachi-back.local',
            id: 'support-1',
            name: 'Support',
          },
          createdAt: now,
          email: 'reader@example.com',
          id: 'contact-1',
          name: 'Reader',
          readAt: now,
          resolvedAt: null,
          status: 'in_progress',
          subject: 'Need help with activation',
          updatedAt: now,
        },
      ]);
      mockDb.contactMessage.groupBy.mockResolvedValue([
        {
          _count: {
            _all: 1,
          },
          status: 'in_progress',
        },
      ]);

      const result = await call(contactRouter.getAll, {
        status: 'all',
      });

      expect(result).toEqual({
        items: [
          {
            assignedTo: {
              email: 'support@tachi-back.local',
              id: 'support-1',
              name: 'Support',
            },
            createdAt: now,
            email: 'reader@example.com',
            id: 'contact-1',
            name: 'Reader',
            readAt: now,
            resolvedAt: null,
            status: 'in_progress',
            subject: 'Need help with activation',
            updatedAt: now,
          },
        ],
        nextCursor: undefined,
        statusCounts: {
          inProgress: 1,
          resolved: 0,
          spam: 0,
          total: 1,
          unread: 0,
        },
        total: 1,
      });
    });

    it('requires contact read permission', async () => {
      mockDb.contactMessage.count.mockResolvedValue(0);
      mockDb.contactMessage.findMany.mockResolvedValue([]);
      mockDb.contactMessage.groupBy.mockResolvedValue([]);

      await call(contactRouter.getAll, {
        status: 'all',
      });

      expect(mockUserHasPermission).toHaveBeenCalledWith({
        body: {
          permissions: { contact: ['read'] },
          userId: mockUser.id,
        },
      });
    });
  });

  describe('getById', () => {
    it('returns detailed contact data', async () => {
      mockDb.contactMessage.findUnique.mockResolvedValue({
        assignedToUser: null,
        createdAt: now,
        email: 'reader@example.com',
        id: 'contact-1',
        internalNotes: null,
        ipAddress: '10.0.0.1',
        message: 'Need help with setup and redeeming my code.',
        name: 'Reader',
        readAt: null,
        resolvedAt: null,
        source: 'public_landing_form',
        status: 'unread',
        subject: 'Need help with setup',
        updatedAt: now,
        userAgent: 'Mozilla/5.0',
      });

      const result = await call(contactRouter.getById, {
        id: 'contact-1',
      });

      expect(result).toMatchObject({
        email: 'reader@example.com',
        id: 'contact-1',
        status: 'unread',
        subject: 'Need help with setup',
      });
    });
  });

  describe('updateById', () => {
    it('updates status and notes while assigning the current staff user', async () => {
      mockDb.contactMessage.findUnique.mockResolvedValue({
        readAt: null,
      });
      mockDb.contactMessage.update.mockResolvedValue({
        assignedToUser: {
          email: 'support@tachi-back.local',
          id: mockUser.id,
          name: mockUser.name,
        },
        createdAt: now,
        email: 'reader@example.com',
        id: 'contact-1',
        internalNotes: 'Customer needs a device transfer.',
        ipAddress: '10.0.0.1',
        message: 'Need help with setup and redeeming my code.',
        name: 'Reader',
        readAt: now,
        resolvedAt: now,
        source: 'public_landing_form',
        status: 'resolved',
        subject: 'Need help with setup',
        updatedAt: now,
        userAgent: 'Mozilla/5.0',
      });

      const result = await call(contactRouter.updateById, {
        id: 'contact-1',
        internalNotes: 'Customer needs a device transfer.',
        status: 'resolved',
      });

      expect(mockDb.contactMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToUserId: mockUser.id,
            internalNotes: 'Customer needs a device transfer.',
            status: 'resolved',
          }),
        })
      );
      expect(result.assignedTo?.id).toBe(mockUser.id);
      expect(result.status).toBe('resolved');
    });
  });

  describe('deleteById', () => {
    it('deletes a contact message', async () => {
      mockDb.contactMessage.delete.mockResolvedValue({
        id: 'contact-1',
      });

      await expect(
        call(contactRouter.deleteById, {
          id: 'contact-1',
        })
      ).resolves.toBeUndefined();
    });
  });
});
