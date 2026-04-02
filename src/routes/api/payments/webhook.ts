import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import { logger } from '@/server/logger';
import { verifyLemonSqueezyWebhookSignature } from '@/server/payments/lemonsqueezy';
import { processWebhookEvent } from '@/server/payments/webhook';

export const Route = createFileRoute('/api/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!envServer.LEMONSQUEEZY_ENABLED) {
          return new Response('Lemon Squeezy disabled', { status: 503 });
        }

        const signature = request.headers.get('x-signature');

        if (!signature) {
          return new Response('Missing x-signature header', {
            status: 400,
          });
        }

        const payload = await request.text();
        let isValid: boolean;

        try {
          isValid = verifyLemonSqueezyWebhookSignature({ payload, signature });
        } catch (error) {
          logger.error({
            scope: 'payments',
            message: 'Lemon Squeezy webhook signature verification failed',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          });

          return new Response('Invalid webhook request', {
            status: 400,
          });
        }

        if (!isValid) {
          return new Response('Invalid webhook signature', { status: 400 });
        }

        let event;
        try {
          event = JSON.parse(payload);
        } catch {
          return new Response('Invalid JSON payload', { status: 400 });
        }

        try {
          const result = await processWebhookEvent(event);

          return Response.json({
            ok: true,
            result,
          });
        } catch (error) {
          logger.error({
            scope: 'payments',
            message: 'Webhook processing failed',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            eventName: event?.meta?.event_name,
          });

          return new Response('Webhook processing failed', {
            status: 500,
          });
        }
      },
    },
  },
});
