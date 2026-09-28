import { EventEmitter } from 'node:events';

export interface EmailInboxChangeEvent {
  at: string;
  reason: 'database' | 'imap';
}

const globalForEmailInboxEvents = globalThis as typeof globalThis & {
  emailInboxEvents?: EventEmitter;
};

const emailInboxEvents =
  globalForEmailInboxEvents.emailInboxEvents ?? new EventEmitter();

emailInboxEvents.setMaxListeners(100);
globalForEmailInboxEvents.emailInboxEvents = emailInboxEvents;

export const publishEmailInboxChange = (
  reason: EmailInboxChangeEvent['reason']
) => {
  const event = { at: new Date().toISOString(), reason };
  emailInboxEvents.emit('change', event);
};

export const subscribeToEmailInboxChanges = (
  listener: (event: EmailInboxChangeEvent) => void
) => {
  emailInboxEvents.on('change', listener);
  return () => emailInboxEvents.off('change', listener);
};
