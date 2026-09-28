import { describe, expect, it } from 'vitest';

import {
  parseContactMailboxAccounts,
  parseContactMailboxServer,
} from '@/server/contact/mailbox-config';

describe('contact mailbox configuration', () => {
  it('parses an encoded secure mailbox URL without exposing credentials in its id', () => {
    const config = parseContactMailboxServer({
      checkpointKey: 'checkpoint',
      mailbox: 'INBOX',
      server: 'imaps://contact%40nayovi.com:p%40ssword@mail.example.com:993',
    });

    expect(config).toMatchObject({
      address: 'contact@nayovi.com',
      auth: { pass: 'p@ssword', user: 'contact@nayovi.com' },
      checkpointKey: 'checkpoint',
      host: 'mail.example.com',
      mailbox: 'INBOX',
      port: 993,
      secure: true,
    });
    expect(config.id).toMatch(/^[a-f0-9]{16}$/);
    expect(config.id).not.toContain('contact');
  });

  it('accepts multiple mailbox URLs from JSON', () => {
    expect(
      parseContactMailboxAccounts(
        JSON.stringify([
          'imaps://contact%40nayovi.com:secret@mail.example.com',
          'imaps://support%40nayovi.com:secret@mail.example.com',
        ])
      )
    ).toHaveLength(2);
  });

  it('rejects non-TLS mailbox URLs', () => {
    expect(() =>
      parseContactMailboxServer({
        checkpointKey: 'checkpoint',
        mailbox: 'INBOX',
        server: 'imap://contact%40nayovi.com:secret@mail.example.com',
      })
    ).toThrow('must use imaps://');
  });
});
