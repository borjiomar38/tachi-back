import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  classify: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  generateReply: vi.fn(),
  sendReply: vi.fn(),
  sendNotification: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock('@/server/contact/codex-classifier', () => ({
  classifyContactWithCodex: mocks.classify,
}));

vi.mock('@/server/contact/codex-reply', () => ({
  generateContactReplyWithCodex: mocks.generateReply,
}));

vi.mock('@/server/contact/contact-notifier', () => ({
  getContactNotificationId: (contactId: string) => `contact-${contactId}`,
  getContactReplyId: (contactId: string) => `contact-reply-${contactId}`,
  sendContactReply: mocks.sendReply,
  sendContactNotification: mocks.sendNotification,
}));

vi.mock('@/server/db', () => ({
  db: {
    contactMessage: {
      findFirst: mocks.findFirst,
      findUnique: mocks.findUnique,
      update: mocks.update,
      updateMany: mocks.updateMany,
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
  source: 'public_landing_form',
  subject: 'Activation help',
};

describe('processNextContactTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(legacyContact);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.update.mockResolvedValue(legacyContact);
  });

  it('automatically claims and filters a legacy contact', async () => {
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

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: expect.objectContaining({
            in: expect.arrayContaining(['public_landing_form']),
          }),
        }),
      })
    );
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { source: 'public_landing_form:triage_processing' },
      })
    );
    expect(mocks.sendNotification).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'public_landing_form:triage_ignored',
          status: 'spam',
        }),
      })
    );
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
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'public_landing_form:triage_notified',
        }),
        where: expect.objectContaining({
          source: 'public_landing_form:triage_notification_sending',
        }),
      })
    );
  });

  it('sends a Codex-written reply to an explicit pricing customer and resolves it', async () => {
    mocks.classify.mockResolvedValue({
      classification: 'actionable',
      reason: 'The reader explicitly asks how to buy a plan.',
      replyConfidence: 'high',
      replyIntent: 'pricing',
      tags: [],
    });
    mocks.generateReply.mockResolvedValue({
      subject: 'Re: Activation help',
      text: 'Hello Reader, here are the current plans.',
    });
    mocks.sendReply.mockResolvedValue({ messageId: 'reply-1' });

    await expect(processNextContactTriage()).resolves.toMatchObject({
      classification: 'actionable',
      processed: true,
      routing: 'reply',
    });

    expect(mocks.sendNotification).not.toHaveBeenCalled();
    expect(mocks.sendReply).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'contact-1',
        email: 'reader@example.com',
      })
    );
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'public_landing_form:triage_customer_replied',
          status: 'resolved',
        }),
        where: expect.objectContaining({
          source: 'public_landing_form:triage_customer_reply_sending',
        }),
      })
    );
    expect(mocks.update.mock.calls.at(-1)?.[0].data.internalNotes).toContain(
      '"replyIntent":"pricing"'
    );
  });

  it('preserves the verdict when support notification fails', async () => {
    mocks.classify.mockResolvedValue({
      classification: 'actionable',
      reason: 'A legitimate activation support request.',
      replyConfidence: 'medium',
      replyIntent: 'help',
      tags: [],
    });
    mocks.sendNotification.mockRejectedValue(new Error('SMTP unavailable'));
    mocks.findUnique.mockResolvedValue({
      source: 'public_landing_form:triage_notification_sending',
    });

    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'failed',
      processed: false,
    });

    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          internalNotes: expect.stringContaining(
            '"classification":"actionable"'
          ),
          source: 'public_landing_form:triage_notification_unknown',
        }),
      })
    );
    expect(mocks.update.mock.calls.at(-1)?.[0].data.internalNotes).toContain(
      '"attempts":1'
    );
    expect(mocks.update.mock.calls.at(-1)?.[0].data.internalNotes).toContain(
      '"notificationId":"contact-contact-1"'
    );

    mocks.findFirst.mockResolvedValue(null);
    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'empty',
      processed: false,
    });
    expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('quarantines an ambiguous customer reply outcome without resending it', async () => {
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
    mocks.findUnique.mockResolvedValue({
      source: 'public_landing_form:triage_customer_reply_sending',
    });

    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'failed',
      processed: false,
    });

    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'public_landing_form:triage_customer_reply_unknown',
        }),
      })
    );

    mocks.findFirst.mockResolvedValue(null);
    await expect(processNextContactTriage()).resolves.toEqual({
      outcome: 'empty',
      processed: false,
    });
    expect(mocks.sendReply).toHaveBeenCalledTimes(1);
  });

  it('quarantines a stale in-flight notification without resending it', async () => {
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const now = new Date('2026-07-16T12:00:00.000Z');

    await expect(quarantineStaleContactNotifications(now)).resolves.toEqual({
      count: 1,
    });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      data: {
        source: 'public_landing_form:triage_notification_unknown',
      },
      where: {
        source: 'public_landing_form:triage_notification_sending',
        updatedAt: { lt: new Date('2026-07-16T11:50:00.000Z') },
      },
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      data: {
        source: 'public_landing_form:triage_customer_reply_unknown',
      },
      where: {
        source: 'public_landing_form:triage_customer_reply_sending',
        updatedAt: { lt: new Date('2026-07-16T11:50:00.000Z') },
      },
    });
    expect(mocks.sendNotification).not.toHaveBeenCalled();
    expect(mocks.sendReply).not.toHaveBeenCalled();
  });
});
