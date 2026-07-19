import { describe, expect, it } from 'vitest';

import {
  extractLatestContactReply,
  getContactReferenceMessageIds,
  normalizeContactSubject,
  resolveContactThreadCandidate,
} from '@/server/contact/thread-policy';

const candidates = [
  {
    email: 'reader@example.com',
    id: 'contact-1',
    messageIds: ['<contact-reply-contact-1-2@nayovi.com>'],
    subject: 'Which plan should I choose?',
  },
  {
    email: 'other@example.com',
    id: 'contact-2',
    messageIds: ['<contact-reply-contact-2-2@nayovi.com>'],
    subject: 'Activation help',
  },
];

describe('contact thread policy', () => {
  it('normalizes reply subjects and extracts the new reply only', () => {
    expect(normalizeContactSubject('Re: AW: Plans')).toBe('plans');
    expect(
      extractLatestContactReply(
        'Yes, but do the tokens renew monthly?\n\nOn Thu, Nayovi wrote:\n> Previous answer'
      )
    ).toBe('Yes, but do the tokens renew monthly?');
  });

  it('resolves a thread from email reference headers first', () => {
    expect(
      resolveContactThreadCandidate({
        candidates,
        inReplyTo: '<CONTACT-REPLY-CONTACT-1-2@NAYOVI.COM>',
        senderEmail: 'unexpected@example.com',
        subject: 'Unrelated subject',
      })?.id
    ).toBe('contact-1');
  });

  it('uses sender and normalized subject only when the fallback is unique', () => {
    expect(
      resolveContactThreadCandidate({
        candidates,
        senderEmail: 'reader@example.com',
        subject: 'Re: Which plan should I choose?',
      })?.id
    ).toBe('contact-1');
  });

  it('does not guess when reference headers point at multiple contacts', () => {
    expect(
      resolveContactThreadCandidate({
        candidates,
        references: getContactReferenceMessageIds(null, [
          '<contact-reply-contact-1-2@nayovi.com>',
          '<contact-reply-contact-2-2@nayovi.com>',
        ]),
        senderEmail: 'reader@example.com',
        subject: 'Plans',
      })
    ).toBeNull();
  });
});
