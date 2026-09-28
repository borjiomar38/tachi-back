import { createHash } from 'node:crypto';
import { z } from 'zod';

import { envServer } from '@/env/server';

const LEGACY_CHECKPOINT_KEY = 'contact-inbox-checkpoint:v1';
const zMailboxServers = z.array(z.url()).min(1);

export interface ContactMailboxConfig {
  address: string;
  auth: {
    pass: string;
    user: string;
  };
  checkpointKey: string;
  host: string;
  id: string;
  mailbox: string;
  port: number;
  secure: true;
}

export const parseContactMailboxServer = (input: {
  checkpointKey: string;
  mailbox: string;
  server: string;
}): ContactMailboxConfig => {
  const url = new URL(input.server);

  if (url.protocol !== 'imaps:') {
    throw new Error('Contact IMAP servers must use imaps://');
  }
  if (!url.username || !url.password) {
    throw new Error('Contact IMAP servers must include mailbox credentials');
  }

  const user = decodeURIComponent(url.username);
  const address = user.trim().toLowerCase();
  const id = createHash('sha256')
    .update(
      `${address}\0${url.hostname}\0${url.port || '993'}\0${input.mailbox}`
    )
    .digest('hex')
    .slice(0, 16);

  return {
    address,
    auth: {
      pass: decodeURIComponent(url.password),
      user,
    },
    checkpointKey: input.checkpointKey,
    host: url.hostname,
    id,
    mailbox: input.mailbox,
    port: Number(url.port || 993),
    secure: true,
  };
};

export const parseContactMailboxAccounts = (value?: string) => {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('CONTACT_IMAP_ACCOUNTS must be a JSON array of IMAP URLs');
  }

  return zMailboxServers.parse(parsed);
};

export const getContactMailboxConfigs = (): ContactMailboxConfig[] => {
  const accountServers = parseContactMailboxAccounts(
    envServer.CONTACT_IMAP_ACCOUNTS
  );
  const servers = accountServers.length
    ? accountServers
    : envServer.CONTACT_IMAP_SERVER
      ? [envServer.CONTACT_IMAP_SERVER]
      : [];

  return Array.from(new Set(servers)).map((server, index) => {
    const usesLegacyCheckpoint =
      !accountServers.length &&
      index === 0 &&
      server === envServer.CONTACT_IMAP_SERVER;
    const provisional = parseContactMailboxServer({
      checkpointKey: '',
      mailbox: envServer.CONTACT_IMAP_MAILBOX,
      server,
    });

    return {
      ...provisional,
      checkpointKey: usesLegacyCheckpoint
        ? LEGACY_CHECKPOINT_KEY
        : `contact-inbox-checkpoint:v2:${provisional.id}`,
    };
  });
};
