import { describe, expect, it } from 'vitest';

import { resolveContactTriage } from '@/server/contact/triage-policy';

describe('resolveContactTriage', () => {
  it('suppresses obvious malicious messages and preserves controlled tags', () => {
    expect(
      resolveContactTriage({
        classification: 'malicious',
        reason: 'Obvious credential phishing request.',
        tags: ['spam', 'phishing'],
      })
    ).toEqual({
      notifySupport: false,
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
        tags: [],
      }).notifySupport
    ).toBe(false);
  });
});
