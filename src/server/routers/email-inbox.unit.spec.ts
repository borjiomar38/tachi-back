import { call } from '@orpc/server';
import { describe, expect, it } from 'vitest';

import emailInboxRouter from '@/server/routers/email-inbox';
import { mockDb, mockUserHasPermission } from '@/server/routers/test-utils';

const createdAt = new Date('2026-08-24T14:05:00.000Z');

describe('email inbox router', () => {
  it('returns only mapped email threads with live inbox counters', async () => {
    mockDb.contactMessage.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockDb.contactMessage.findMany.mockResolvedValue([
      {
        conversationMessages: [
          {
            aiGenerated: false,
            bodyText: 'Please cancel my future subscriptions.',
            createdAt,
            deliveryStatus: 'received',
            direction: 'inbound',
            id: 'message-1',
            receivedAt: createdAt,
            recipientEmail: 'contact@nayovi.com',
            senderEmail: 'william@example.com',
            sentAt: null,
            source: 'email',
            subject: 'Re: Your TachiyomiAT Tokens — Starter 50 receipt',
          },
        ],
        email: 'william@example.com',
        id: 'contact-1',
        name: 'William Example',
        readAt: null,
        status: 'unread',
        subject: 'Re: Your TachiyomiAT Tokens — Starter 50 receipt',
        updatedAt: createdAt,
      },
    ]);
    mockDb.contactConversationMessage.findMany.mockResolvedValue([
      { recipientEmail: 'contact@nayovi.com' },
    ]);

    const result = await call(emailInboxRouter.list, {
      filter: 'all',
      limit: 50,
      mailbox: 'all',
      searchTerm: '',
    });

    expect(result.items[0]).toMatchObject({
      email: 'william@example.com',
      mailbox: 'contact@nayovi.com',
      name: 'William Example',
      status: 'unread',
    });
    expect(result.summary).toEqual({
      mailboxes: 1,
      replied: 1,
      total: 1,
      unread: 1,
    });
    expect(mockDb.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.any(Array) }),
      })
    );
  });

  it('paginates email threads with a non-overlapping cursor', async () => {
    const records = Array.from({ length: 51 }, (_, index) => {
      const position = index + 1;
      return {
        conversationMessages: [
          {
            aiGenerated: false,
            bodyText: `Message ${position}`,
            createdAt,
            deliveryStatus: 'received',
            direction: 'inbound',
            id: `message-${position}`,
            receivedAt: createdAt,
            recipientEmail: 'contact@nayovi.com',
            senderEmail: `customer-${position}@example.com`,
            sentAt: null,
            source: 'email',
            subject: `Subject ${position}`,
          },
        ],
        email: `customer-${position}@example.com`,
        id: `contact-${position}`,
        name: `Customer ${position}`,
        readAt: createdAt,
        status: 'resolved',
        subject: `Subject ${position}`,
        updatedAt: createdAt,
      };
    });
    const overflowRecord = records[50];

    mockDb.contactMessage.count.mockResolvedValue(51);
    mockDb.contactMessage.findMany
      .mockResolvedValueOnce([...records])
      .mockResolvedValueOnce(overflowRecord ? [overflowRecord] : []);
    mockDb.contactConversationMessage.findMany.mockResolvedValue([
      { recipientEmail: 'contact@nayovi.com' },
    ]);

    const firstPage = await call(emailInboxRouter.list, {
      filter: 'all',
      limit: 50,
      mailbox: 'all',
      searchTerm: '',
    });
    const secondPage = await call(emailInboxRouter.list, {
      cursor: firstPage.nextCursor,
      filter: 'all',
      limit: 50,
      mailbox: 'all',
      searchTerm: '',
    });

    expect(firstPage.items).toHaveLength(50);
    expect(firstPage.nextCursor).toBe('contact-51');
    expect(secondPage.items.map((item) => item.id)).toEqual(['contact-51']);
    expect(
      new Set([
        ...firstPage.items.map((item) => item.id),
        ...secondPage.items.map((item) => item.id),
      ]).size
    ).toBe(51);
    expect(mockDb.contactMessage.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cursor: { id: 'contact-51' },
        take: 51,
      })
    );
  });

  it('requires contact read permission', async () => {
    mockDb.contactMessage.count.mockResolvedValue(0);
    mockDb.contactMessage.findMany.mockResolvedValue([]);
    mockDb.contactConversationMessage.findMany.mockResolvedValue([]);

    await call(emailInboxRouter.list, {
      filter: 'all',
      limit: 50,
      mailbox: 'all',
      searchTerm: '',
    });

    expect(mockUserHasPermission).toHaveBeenCalledWith({
      body: {
        permissions: { contact: ['read'] },
        userId: 'user-1',
      },
    });
  });
});
