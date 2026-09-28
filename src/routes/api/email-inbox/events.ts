import { createFileRoute } from '@tanstack/react-router';

import { permissionContact } from '@/features/auth/permissions';
import { auth } from '@/server/auth';
import {
  EmailInboxChangeEvent,
  subscribeToEmailInboxChanges,
} from '@/server/email-inbox/live-events';
import { getEmailInboxRevision } from '@/server/email-inbox/revision';
import { ensureEmailInboxWatcher } from '@/server/email-inbox/watcher';
import { logger } from '@/server/logger';

const DATABASE_POLL_INTERVAL_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 15_000;

const canReadEmailInbox = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return false;

  const permission = await auth.api.userHasPermission({
    body: {
      permissions: permissionContact.read,
      userId: session.user.id,
    },
  });
  return Boolean(permission.success && !permission.error);
};

const createEmailInboxEventStream = (request: Request) => {
  const encoder = new TextEncoder();
  let cleanup: ((closeController: boolean) => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastRevision: string | undefined;
      let pollInFlight = false;

      const send = (event: string, data: object) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const unsubscribe = subscribeToEmailInboxChanges(
        (event: EmailInboxChangeEvent) => send('changed', event)
      );

      const heartbeat = setInterval(
        () => send('heartbeat', { at: new Date().toISOString() }),
        HEARTBEAT_INTERVAL_MS
      );
      const poll = setInterval(() => {
        if (pollInFlight) return;
        pollInFlight = true;
        void getEmailInboxRevision()
          .then((revision) => {
            if (lastRevision && revision !== lastRevision) {
              send('changed', {
                at: new Date().toISOString(),
                reason: 'database',
              });
            }
            lastRevision = revision;
          })
          .catch((error: unknown) => {
            logger.warn(
              {
                errorMessage:
                  error instanceof Error ? error.message : 'Unknown error',
                scope: 'email-inbox-events',
              },
              'Unable to poll the email inbox revision'
            );
          })
          .finally(() => {
            pollInFlight = false;
          });
      }, DATABASE_POLL_INTERVAL_MS);

      cleanup = (closeController) => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        unsubscribe();
        if (closeController) controller.close();
      };

      request.signal.addEventListener('abort', () => cleanup?.(true), {
        once: true,
      });
      send('connected', { at: new Date().toISOString() });
      void getEmailInboxRevision()
        .then((revision) => {
          lastRevision = revision;
        })
        .catch((error: unknown) => {
          logger.warn(
            {
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
              scope: 'email-inbox-events',
            },
            'Unable to initialize the email inbox revision'
          );
        });
      void ensureEmailInboxWatcher()
        .then((status) => send('watcher', status))
        .catch((error: unknown) => {
          logger.error(
            {
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
              scope: 'email-inbox-events',
            },
            'Unable to start the live email inbox watcher'
          );
          send('watcher', { configured: 0, connected: 0 });
        });
    },
    cancel() {
      cleanup?.(false);
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
};

export const Route = createFileRoute('/api/email-inbox/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await canReadEmailInbox(request))) {
          return new Response('Unauthorized', { status: 401 });
        }
        return createEmailInboxEventStream(request);
      },
    },
  },
});
