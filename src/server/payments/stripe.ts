import Stripe from 'stripe';

import { envServer } from '@/env/server';

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  if (!envServer.STRIPE_ENABLED || !envServer.STRIPE_SECRET_KEY) {
    throw new Error('Stripe checkout is not configured for this environment.');
  }

  stripeClient ??= new Stripe(envServer.STRIPE_SECRET_KEY);

  return stripeClient;
}

export function constructStripeWebhookEvent(input: {
  payload: string;
  signature: string;
}) {
  if (!envServer.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured.');
  }

  return getStripeClient().webhooks.constructEvent(
    input.payload,
    input.signature,
    envServer.STRIPE_WEBHOOK_SECRET
  );
}
