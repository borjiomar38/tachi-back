import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  classify: vi.fn(),
  contactFindMany: vi.fn(),
  contactFindUnique: vi.fn(),
  contactUpdate: vi.fn(),
  conversationCreate: vi.fn(),
  conversationFindFirst: vi.fn(),
  conversationFindMany: vi.fn(),
  conversationUpdate: vi.fn(),
  conversationUpdateMany: vi.fn(),
  generateReply: vi.fn(),
  getProductFacts: vi.fn(),
  sendNotification: vi.fn(),
  sendReply: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/server/contact/codex-classifier', () => ({
  classifyContactWithCodex: mocks.classify,
}));

vi.mock('@/server/contact/codex-reply', () => ({
  generateContactReplyWithCodex: mocks.generateReply,
}));

vi.mock('@/server/contact/contact-notifier', () => ({
  getContactNotificationId: (contactId: string) => `contact-${contactId}`,
  sendContactNotification: mocks.sendNotification,
  sendContactReply: mocks.sendReply,
}));

vi.mock('@/server/contact/product-facts', () => ({
  getContactProductFacts: mocks.getProductFacts,
}));

vi.mock('@/server/contact/thread-policy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/contact/thread-policy')>()),
  getContactReplyMessageId: (contactId: string, messageId: string) =>
    `<contact-reply-${contactId}-${messageId}@nayovi.com>`,
}));

vi.mock('@/server/db', () => ({
  db: {
    $transaction: mocks.transaction,
    contactConversationMessage: {
      create: mocks.conversationCreate,
      findFirst: mocks.conversationFindFirst,
      findMany: mocks.conversationFindMany,
      update: mocks.conversationUpdate,
      updateMany: mocks.conversationUpdateMany,
    },
    contactMessage: {
      findMany: mocks.contactFindMany,
      findUnique: mocks.contactFindUnique,
      update: mocks.contactUpdate,
    },
  },
}));

vi.mock('@/server/logger', () => ({
  logger: { error: vi.fn() },
}));

import {
  processNextContactTriage,
  quarantineStaleContactNotifications,
} from '@/server/contact/triage-processor';

const legacyContact = {
  email: 'reader@example.com',
  id: 'contact-1',
  internalNotes: null,
  message: 'I need help activating the application on my phone.',
  name: 'Reader',
  readAt: null,
  source: 'public_landing_form:triage_pending',
  subject: 'Activation help',
};

const inbound = {
  automationStatus: 'pending',
  bodyText: legacyContact.message,
  contactId: legacyContact.id,
  createdAt: new Date('2026-07-16T10:00:00.000Z'),
  direction: 'inbound',
  id: 'inbound-1',
  messageId: '<contact-form-contact-1@nayovi.com>',
  receivedAt: new Date('2026-07-16T10:00:00.000Z'),
  references: [],
  senderEmail: legacyContact.email,
  sentAt: null,
  source: 'contact_form',
  subject: legacyContact.subject,
};

describe('processNextContactTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (operations: Promise<unknown>[]) => await Promise.all(operations)
    );
    mocks.conversationFindFirst.mockResolvedValue(inbound);
    mocks.conversationFindMany.mockResolvedValue([inbound]);
    mocks.conversationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.conversationUpdate.mockResolvedValue(inbound);
    mocks.conversationCreate.mockResolvedValue({ id: 'outbound-1' });
    mocks.contactFindUnique.mockResolvedValue(legacyContact);
    mocks.contactUpdate.mockResolvedValue(legacyContact);
    mocks.getProductFacts.mockResolvedValue({
      plans: [{ currency: 'USD', priceCents: 999, tokens: 100_000 }],
    });
  });

  it('automatically claims and filters an obvious scam', async () => {
    mocks.classify.mockResolvedValue({
      classification: 'malicious',
      reason: 'Obvious investment scam.',
      replyConfidence: 'low',
      replyIntent: 'none',
      tags: ['spam', 'scam'],
    });

    await expect(processNextContactTriage()).resolves.toMatchObject({
      classification: 'malicious',
      processed: true,
    });

    expect(mocks.conversationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          automationStatus: 'pending',
          direction: 'inbound',
        }),
      })
    );
    expect(mocks.conversationUpdateMany).toHaveBeenCalledWith({
      data: { automationStatus: 'processing' },
      where: { automationStatus: 'pending', id: 'inbound-1' },
    });
    expect(mocks.sendNotification).not.toHaveBeenCalled();
    expect(mocks.contactUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'public_landing_form:triage_ignored',
          status: 'spam',
        }),
      })
    );
    expect(mocks.conversationUpdate).toHaveBeenCalledWith({
      data: { automationStatus: 'filtered' },
      where: { id: 'inbound-1' },
    });
  });

  it('forwards an actionable contact to support exactly once', async () => {
    mocks.classify.mockResolvedValue({
      classification: 'actionable',
      reason: 'A legitimate activation support request.',
      replyConfidence: 'medium',
      replyIntent: 'help',
      tags: [],
    });
    mocks.sendNotification.mockResolvedValue({ messageId: 'message-1' });

    await expect(processNextContactTriage()).resolves.toMatchObject({
      classification: 'actionable',
      processed: true,
    });

    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
    expect(mocks.contactUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'public_landing_form:triage_notified',
        }),
        where: expect.objectContaining({
          source: 'public_landing_form:triage_notification_sending',
        }),
      })
    );
    expect(mocks.conversationUpdate).toHaveBeenCalledWith({
      data: { automationStatus: 'forwarded' },
      where: { id: 'inbound-1' },
    });
  });

  it('uses the full thread to reply to a pricing follow-up in the same email thread', async () => {
    const previousReply = {
      ...inbound,
      bodyText: 'Our Pro plan is available on the plans page.',
      createdAt: new Date('2026-07-16T10:05:00.000Z'),
      direction: 'outbound',
      id: 'outbound-existing',
      messageId: '<contact-reply-existing@nayovi.com>',
      receivedAt: null,
      senderEmail: 'contact@nayovi.com',
      sentAt: new Date('2026-07-16T10:05:00.000Z'),
      source: 'codex',
    };
    const followUp = {
      ...inbound,
      bodyText: 'Can I use it on two phones?',
      createdAt: new Date('2026-07-16T10:10:00.000Z'),
      id: 'inbound-follow-up',
      inReplyTo: previousReply.messageId,
      messageId: '<customer-follow-up@example.com>',
      receivedAt: new Date('2026-07-16T10:10:00.000Z'),
      references: [inbound.messageId, previousReply.messageId],
      source: 'email',
    };
    mocks.conversationFindFirst.mockResolvedValue(followUp);
    mocks.conversationFindMany.mockResolvedValue([
      inbound,
      previousReply,
      followUp,
    ]);
    mocks.classify.mockResolvedValue({
      classification: 'actionable',
      reason: 'A customer asks a follow-up usage question.',
      replyConfidence: 'high',
      replyIntent: 'help',
      tags: [],
    });
    mocks.generateReply.mockResolvedValue({
      subject: 'Re: Activation help',
      text: 'Hello Reader, here is how device access works.',
    });
    mocks.sendReply.mockResolvedValue({ messageId: 'reply-1' });

    await expect(processNextContactTriage()).resolves.toMatchObject({
      classification: 'actionable',
      processed: true,
      routing: 'reply',
    });

    expect(mocks.classify).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation: expect.arrayContaining([
          expect.objectContaining({ bodyText: legacyContact.message }),
          expect.objectContaining({ bodyText: previousReply.bodyText }),
          expect.objectContaining({ bodyText: followUp.bodyText }),
        ]),
        message: followUp.bodyText,
      })
    );
    expect(mocks.generateReply).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation: expect.arrayContaining([
          expect.objectContaining({ bodyText: previousReply.bodyText }),
        ]),
        productFacts: expect.any(Object),
      })
    );
    expect(mocks.sendReply).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'contact-1',
        email: 'reader@example.com',
        inReplyTo: followUp.messageId,
        references: expect.arrayContaining([
          followUp.messageId,
          ...followUp.references,
        ]),
      })
    );
    expect(mocks.conversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bodyText: 'Hello Reader, here is how device access works.',
          direction: 'outbound',
          inReplyTo: followUp.messageId,
          source: 'codex',
        }),
      })
    );
  });

  it('preserves the verdict and prevents resend when support delivery is uncertain', async () => {
    mocks.classify.mockResolvedValue({
      classification: 'actionable',
      reason: 'A legitimate activation support request.',
      replyConfidence: 'medium',
      replyIntent: 'help',
      tags: [],
    });
    mocks.sendNotification.mockRejectedValue(new Error('SMTP unavailable'));
    mocks.contactFindUnique
      .mockResolvedValueOnce(legacyContact)
      .mockResolvedValueOnce({
        source: 'public_landing_form:triage_notification_sending',
      });

    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'failed',
      processed: false,
    });

    expect(mocks.contactUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          internalNotes: expect.stringContaining(
            '"classification":"actionable"'
          ),
          source: 'public_landing_form:triage_notification_unknown',
        }),
      })
    );
    expect(mocks.conversationUpdate).toHaveBeenLastCalledWith({
      data: { automationStatus: 'delivery_unknown' },
      where: { id: 'inbound-1' },
    });

    mocks.conversationFindFirst.mockResolvedValue(null);
    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'empty',
      processed: false,
    });
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('quarantines an ambiguous customer reply without resending it', async () => {
    mocks.classify.mockResolvedValue({
      classification: 'actionable',
      reason: 'The reader explicitly requests activation help.',
      replyConfidence: 'high',
      replyIntent: 'help',
      tags: [],
    });
    mocks.generateReply.mockResolvedValue({
      subject: 'Re: Activation help',
      text: 'Hello Reader, here is how to activate Nayovi.',
    });
    mocks.sendReply.mockRejectedValue(new Error('SMTP unavailable'));
    mocks.contactFindUnique
      .mockResolvedValueOnce(legacyContact)
      .mockResolvedValueOnce({
        source: 'public_landing_form:triage_customer_reply_sending',
      });

    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'failed',
      processed: false,
    });

    expect(mocks.contactUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'public_landing_form:triage_customer_reply_unknown',
        }),
      })
    );
    expect(mocks.conversationUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { deliveryStatus: 'delivery_unknown' },
      })
    );

    mocks.conversationFindFirst.mockResolvedValue(null);
    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'empty',
      processed: false,
    });
    expect(mocks.sendReply).toHaveBeenCalledTimes(1);
  });

  it('quarantines stale in-flight delivery states without resending', async () => {
    mocks.contactFindMany.mockResolvedValue([
      {
        id: 'contact-stale',
        source: 'public_landing_form:triage_notification_sending',
      },
    ]);
    const now = new Date('2026-07-16T12:00:00.000Z');

    await expect(quarantineStaleContactNotifications(now)).resolves.toEqual({
      count: 1,
    });

    expect(mocks.contactFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          updatedAt: { lt: new Date('2026-07-16T11:50:00.000Z') },
        }),
      })
    );
    expect(mocks.contactUpdate).toHaveBeenCalledWith({
      data: { source: 'public_landing_form:triage_notification_unknown' },
      where: { id: 'contact-stale' },
    });
    expect(mocks.sendNotification).not.toHaveBeenCalled();
    expect(mocks.sendReply).not.toHaveBeenCalled();
  });
});
