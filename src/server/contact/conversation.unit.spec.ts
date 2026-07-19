import { describe, expect, it } from 'vitest';

import { limitContactConversation } from '@/server/contact/conversation';

describe('contact conversation context', () => {
  it('keeps the newest turns in chronological order', () => {
    const turns = Array.from({ length: 25 }, (_, index) => ({
      bodyText: `Message ${index}`,
      direction: index % 2 ? ('outbound' as const) : ('inbound' as const),
      occurredAt: new Date(2026, 6, 16, 10, index).toISOString(),
      senderEmail: index % 2 ? 'contact@nayovi.com' : 'reader@example.com',
      subject: 'Plans',
    }));

    const result = limitContactConversation(turns);

    expect(result).toHaveLength(20);
    expect(result[0]?.bodyText).toBe('Message 5');
    expect(result.at(-1)?.bodyText).toBe('Message 24');
  });
});
