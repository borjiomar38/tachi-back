import { ImapFlow } from 'imapflow';

import { syncContactInbox } from '@/server/contact/inbox-sync';
import {
  ContactMailboxConfig,
  getContactMailboxConfigs,
} from '@/server/contact/mailbox-config';
import { logger } from '@/server/logger';

const RECONNECT_DELAY_MS = 10_000;

interface EmailInboxWatcherState {
  clients: Map<string, ImapFlow>;
  pending: Set<string>;
  reconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
  startPromise?: Promise<EmailInboxWatcherStatus>;
  syncPromise?: Promise<Awaited<ReturnType<typeof syncContactInbox>>>;
}

export interface EmailInboxWatcherStatus {
  configured: number;
  connected: number;
}

const globalForEmailInboxWatcher = globalThis as typeof globalThis & {
  emailInboxWatcherState?: EmailInboxWatcherState;
};

const state: EmailInboxWatcherState =
  globalForEmailInboxWatcher.emailInboxWatcherState ?? {
    clients: new Map(),
    pending: new Set(),
    reconnectTimers: new Map(),
  };

globalForEmailInboxWatcher.emailInboxWatcherState = state;

export const queueContactInboxSync = () => {
  state.syncPromise ??= syncContactInbox().finally(() => {
    state.syncPromise = undefined;
  });
  return state.syncPromise;
};

const scheduleReconnect = (config: ContactMailboxConfig) => {
  if (state.reconnectTimers.has(config.id)) return;

  const timer = setTimeout(() => {
    state.reconnectTimers.delete(config.id);
    void connectMailbox(config);
  }, RECONNECT_DELAY_MS);
  timer.unref?.();
  state.reconnectTimers.set(config.id, timer);
};

const connectMailbox = async (config: ContactMailboxConfig) => {
  if (state.clients.has(config.id) || state.pending.has(config.id)) return;

  state.pending.add(config.id);
  const client = new ImapFlow({
    auth: config.auth,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    host: config.host,
    logger: false,
    maxIdleTime: 4 * 60 * 1000,
    port: config.port,
    secure: config.secure,
    socketTimeout: 5 * 60 * 1000,
  });

  client.on('exists', () => {
    void queueContactInboxSync().catch((error: unknown) => {
      logger.error(
        {
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          mailbox: config.address,
          scope: 'email-inbox-watcher',
        },
        'Unable to synchronize the email inbox after an IMAP event'
      );
    });
  });
  client.on('error', (error) => {
    logger.warn(
      {
        errorMessage: error.message,
        mailbox: config.address,
        scope: 'email-inbox-watcher',
      },
      'Email inbox IMAP connection error'
    );
  });
  client.on('close', () => {
    state.clients.delete(config.id);
    scheduleReconnect(config);
  });

  try {
    await client.connect();
    await client.mailboxOpen(config.mailbox, { readOnly: true });
    state.clients.set(config.id, client);
  } catch (error) {
    client.close();
    logger.error(
      {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        mailbox: config.address,
        scope: 'email-inbox-watcher',
      },
      'Unable to connect the live email inbox watcher'
    );
    scheduleReconnect(config);
  } finally {
    state.pending.delete(config.id);
  }
};

export const ensureEmailInboxWatcher = async () => {
  const configs = getContactMailboxConfigs();
  if (!configs.length) return { configured: 0, connected: 0 };
  if (configs.every((config) => state.clients.has(config.id))) {
    return { configured: configs.length, connected: configs.length };
  }

  if (state.startPromise) return await state.startPromise;

  state.startPromise = (async () => {
    await queueContactInboxSync();
    await Promise.all(configs.map(connectMailbox));
    return {
      configured: configs.length,
      connected: configs.filter((config) => state.clients.has(config.id))
        .length,
    };
  })().finally(() => {
    state.startPromise = undefined;
  });

  return await state.startPromise;
};
