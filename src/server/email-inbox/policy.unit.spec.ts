import { describe, expect, it } from 'vitest';

import {
  getEmailInboxBaseWhere,
  getEmailInboxStatusWhere,
  resolveEmailInboxWhere,
} from '@/server/email-inbox/policy';

describe('email inbox policy', () => {
  it('always limits the inbox to IMAP email conversations', () => {
    expect(getEmailInboxBaseWhere({})).toEqual({
      AND: [
        {
          conversationMessages: {
            some: { direction: 'inbound', source: 'email' },
          },
        },
        {},
        {},
      ],
    });
  });

  it('resolves mailbox, search, and replied rules in one reusable query', () => {
    const where = resolveEmailInboxWhere({
      filter: 'replied',
      mailbox: 'contact@nayovi.com',
      searchTerm: 'William',
    });

    expect(where).toEqual({
      AND: [
        getEmailInboxBaseWhere({
          mailbox: 'contact@nayovi.com',
          searchTerm: 'William',
        }),
        getEmailInboxStatusWhere('replied'),
      ],
    });
  });

  it('treats every non-unread workflow state as read', () => {
    expect(getEmailInboxStatusWhere('read')).toEqual({
      status: { not: 'unread' },
    });
  });
});
