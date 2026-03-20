import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import { logger } from '@/server/logger';
import { constructStripeWebhookEvent } from '@/server/payments/stripe';
import { processStripeWebhookEvent } from '@/server/payments/webhook';

export const Route = createFileRoute('/api/stripe/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!envServer.STRIPE_ENABLED) {
          return new Response('Stripe disabled', { status: 503 });
        }

        const signature = request.headers.get('stripe-signature');

        if (!signature) {
          return new Response('Missing stripe-signature header', {
            status: 400,
          });
        }

        const payload = await request.text();
        let event;

        try {
          event = constructStripeWebhookEvent({ payload, signature });
        } catch (error) {
          logger.error({
            scope: 'payments',
            message: 'Stripe webhook signature verification failed',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          });

          return new Response('Invalid webhook request', {
            status: 400,
          });
        }

        try {
          const result = await processStripeWebhookEvent(event);

          return Response.json({
            ok: true,
            result,
          });
        } catch (error) {
          logger.error({
            scope: 'payments',
            message: 'Stripe webhook processing failed',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            stripeEventId: event.id,
          });

          return new Response('Webhook processing failed', {
            status: 500,
          });
        }
      },
    },
  },
});
