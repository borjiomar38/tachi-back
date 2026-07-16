import { describe, expect, it } from 'vitest';

import { resolveContactTriage } from '@/server/contact/triage-policy';

describe('resolveContactTriage', () => {
  it('suppresses obvious malicious messages and preserves controlled tags', () => {
    expect(
      resolveContactTriage({
        classification: 'malicious',
        reason: 'Obvious credential phishing request.',
        replyConfidence: 'low',
        replyIntent: 'none',
        tags: ['spam', 'phishing'],
      })
    ).toEqual({
      notifySupport: false,
      replyToCustomer: false,
      routing: 'suppress',
      tags: ['spam', 'phishing'],
    });
  });

  it.each(['actionable', 'uncertain'] as const)(
    'forwards %s messages to support',
    (classification) => {
      expect(
        resolveContactTriage({
          classification,
          reason: 'Requires a support decision.',
          replyConfidence: 'low',
          replyIntent: 'none',
          tags: [],
        }).notifySupport
      ).toBe(true);
    }
  );

  it('suppresses harmless but irrelevant submissions', () => {
    expect(
      resolveContactTriage({
        classification: 'irrelevant',
        reason: 'The content is unrelated to the product or support.',
        replyConfidence: 'low',
        replyIntent: 'none',
        tags: [],
      }).notifySupport
    ).toBe(false);
  });

  it('auto-replies only to explicit high-confidence help or pricing requests', () => {
    expect(
      resolveContactTriage({
        classification: 'actionable',
        reason: 'The reader explicitly asks how to subscribe.',
        replyConfidence: 'high',
        replyIntent: 'pricing',
        tags: [],
      })
    ).toMatchObject({
      notifySupport: false,
      replyToCustomer: true,
      routing: 'reply',
    });

    expect(
      resolveContactTriage({
        classification: 'actionable',
        reason: 'The request may be about pricing but is ambiguous.',
        replyConfidence: 'medium',
        replyIntent: 'pricing',
        tags: [],
      })
    ).toMatchObject({
      notifySupport: true,
      replyToCustomer: false,
      routing: 'notify',
    });
  });
});
