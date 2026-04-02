import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';
import crypto from 'node:crypto';

import { envServer } from '@/env/server';

let initialized = false;

export function initLemonSqueezy() {
  if (!envServer.LEMONSQUEEZY_ENABLED || !envServer.LEMONSQUEEZY_API_KEY) {
    throw new Error('Lemon Squeezy is not configured for this environment.');
  }

  if (!initialized) {
    lemonSqueezySetup({ apiKey: envServer.LEMONSQUEEZY_API_KEY });
    initialized = true;
  }
}

export function verifyLemonSqueezyWebhookSignature(input: {
  payload: string;
  signature: string;
}): boolean {
  if (!envServer.LEMONSQUEEZY_WEBHOOK_SECRET) {
    throw new Error('Lemon Squeezy webhook secret is not configured.');
  }

  const hmac = crypto.createHmac(
    'sha256',
    envServer.LEMONSQUEEZY_WEBHOOK_SECRET
  );
  const digest = hmac.update(input.payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(input.signature)
  );
}
