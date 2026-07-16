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
const triageAuditLine =
  '[contact-triage:v1] {"attempts":1,"classification":"malicious","processedAt":"2026-03-20T09:00:00.000Z","reason":"Obvious scam.","tags":["spam","scam"]}';

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
      mockDb.contactMessage.findMany
        .mockResolvedValueOnce([
          {
            assignedToUser: {
              email: 'support@tachi-back.local',
              id: 'support-1',
              name: 'Support',
            },
            createdAt: now,
            email: 'reader@example.com',
            id: 'contact-1',
            internalNotes: null,
            name: 'Reader',
            readAt: now,
            resolvedAt: null,
            source: 'public_landing_form',
            status: 'in_progress',
            subject: 'Need help with activation',
            updatedAt: now,
          },
        ])
        .mockResolvedValueOnce([
          {
            internalNotes: null,
            source: 'public_landing_form',
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
            triage: {
              analyzedAt: null,
              attempts: 0,
              classification: null,
              error: null,
              notification: 'pending',
              notifiedAt: null,
              reason: null,
              state: 'awaiting',
              tags: [],
            },
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
        triageCounts: {
          analyzed: 0,
          awaiting: 1,
          failed: 0,
          filtered: 0,
          forwarded: 0,
          lastAnalyzedAt: null,
          needsReview: 0,
          total: 1,
        },
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
        internalNotes: triageAuditLine,
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
        internalNotes: '',
        status: 'unread',
        subject: 'Need help with setup',
        triage: {
          classification: 'malicious',
          reason: 'Obvious scam.',
          tags: ['spam', 'scam'],
        },
      });
    });
  });

  describe('updateById', () => {
    it('updates status and notes while assigning the current staff user', async () => {
      mockDb.contactMessage.findUnique.mockResolvedValue({
        internalNotes: `Old team note\n${triageAuditLine}`,
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
        internalNotes: `Customer needs a device transfer.\n${triageAuditLine}`,
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
            internalNotes: `Customer needs a device transfer.\n${triageAuditLine}`,
            status: 'resolved',
          }),
        })
      );
      expect(result.assignedTo?.id).toBe(mockUser.id);
      expect(result.status).toBe('resolved');
    });
  });

  describe('reanalyzeById', () => {
    it('refuses to resend when the email delivery outcome is unknown', async () => {
      mockDb.contactMessage.findUnique.mockResolvedValue({
        source: 'public_landing_form:triage_notification_unknown',
      });

      await expect(
        call(contactRouter.reanalyzeById, { id: 'contact-1' })
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(mockDb.contactMessage.update).not.toHaveBeenCalled();
    });
  });

  describe('retryFailed', () => {
    it('retries analysis failures without retrying uncertain email delivery', async () => {
      mockDb.contactMessage.updateMany.mockResolvedValue({ count: 2 });

      await expect(call(contactRouter.retryFailed, {})).resolves.toEqual({
        count: 2,
      });
      expect(mockDb.contactMessage.updateMany).toHaveBeenCalledWith({
        data: { source: 'public_landing_form:triage_retry' },
        where: { source: 'public_landing_form:triage_failed' },
      });
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
