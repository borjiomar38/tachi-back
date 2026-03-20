import type Stripe from 'stripe';
import { z } from 'zod';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { logger } from '@/server/logger';
import { getStripeClient } from '@/server/payments/stripe';

const checkoutTokenPackSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  tokenAmount: true,
  bonusTokenAmount: true,
  priceAmountCents: true,
  currency: true,
  stripePriceId: true,
  active: true,
} as const;

export const zCreateStripeCheckoutInput = z.object({
  tokenPackKey: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/i),
  payerEmail: z.string().trim().email().max(320),
});

export type CreateStripeCheckoutInput = z.infer<
  typeof zCreateStripeCheckoutInput
>;

export type StripeCheckoutErrorCode =
  | 'checkout_unavailable'
  | 'stripe_disabled'
  | 'token_pack_not_found'
  | 'token_pack_unavailable';

export interface CheckoutTokenPack {
  active: boolean;
  bonusTokenAmount: number;
  currency: string;
  description: string | null;
  id: string;
  key: string;
  name: string;
  priceAmountCents: number;
  stripePriceId: string | null;
  tokenAmount: number;
}

type CheckoutDbClient = {
  tokenPack: {
    findUnique: (args: {
      where: { key: string };
      select: typeof checkoutTokenPackSelect;
    }) => Promise<CheckoutTokenPack | null>;
  };
};

type CheckoutStripeClient = {
  checkout: {
    sessions: {
      create: (
        params: Stripe.Checkout.SessionCreateParams
      ) => Promise<{ id: string; url: string | null }>;
    };
  };
};

export class StripeCheckoutError extends Error {
  constructor(
    public readonly code: StripeCheckoutErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'StripeCheckoutError';
  }
}

export async function getCheckoutTokenPackByKey(
  tokenPackKey: string,
  deps: {
    dbClient?: CheckoutDbClient;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;

  return dbClient.tokenPack.findUnique({
    where: { key: tokenPackKey },
    select: checkoutTokenPackSelect,
  });
}

export function buildStripeCheckoutSessionParams(input: {
  baseUrl?: string;
  envName?: string | undefined;
  payerEmail: string;
  tokenPack: {
    id: string;
    key: string;
    name: string;
    tokenAmount: number;
    bonusTokenAmount: number;
    stripePriceId: string;
  };
}): Stripe.Checkout.SessionCreateParams {
  const baseUrl = input.baseUrl ?? envClient.VITE_BASE_URL;
  const envName = input.envName ?? envClient.VITE_ENV_NAME ?? 'UNKNOWN';
  const totalTokens =
    input.tokenPack.tokenAmount + input.tokenPack.bonusTokenAmount;

  const successUrl = new URL('/checkout/success', baseUrl);
  successUrl.searchParams.set('tokenPack', input.tokenPack.key);
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

  const cancelUrl = new URL('/checkout/cancel', baseUrl);
  cancelUrl.searchParams.set('tokenPack', input.tokenPack.key);

  const metadata = {
    environment: envName,
    purchase_source: 'public-web',
    token_pack_id: input.tokenPack.id,
    token_pack_key: input.tokenPack.key,
    token_pack_name: input.tokenPack.name,
    total_tokens: String(totalTokens),
  } satisfies Record<string, string>;

  return {
    mode: 'payment',
    billing_address_collection: 'auto',
    cancel_url: cancelUrl.toString(),
    client_reference_id: input.tokenPack.id,
    customer_email: input.payerEmail,
    line_items: [
      {
        price: input.tokenPack.stripePriceId,
        quantity: 1,
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
    },
    success_url: successUrl.toString(),
  };
}

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutInput,
  deps: {
    baseUrl?: string;
    dbClient?: CheckoutDbClient;
    envName?: string | undefined;
    log?: Pick<typeof logger, 'info'>;
    stripeClient?: CheckoutStripeClient;
    stripeEnabled?: boolean;
  } = {}
) {
  const stripeEnabled = deps.stripeEnabled ?? envServer.STRIPE_ENABLED;

  if (!stripeEnabled) {
    throw new StripeCheckoutError(
      'stripe_disabled',
      'Stripe checkout is disabled for this environment.',
      503
    );
  }

  const tokenPack = await getCheckoutTokenPackByKey(input.tokenPackKey, {
    dbClient: deps.dbClient,
  });

  if (!tokenPack?.active) {
    throw new StripeCheckoutError(
      'token_pack_not_found',
      'The selected token pack is not available.',
      404
    );
  }

  if (!tokenPack.stripePriceId) {
    throw new StripeCheckoutError(
      'token_pack_unavailable',
      'The selected token pack does not have a Stripe price configured yet.',
      409
    );
  }

  const stripeClient = deps.stripeClient ?? getStripeClient();
  const session = await stripeClient.checkout.sessions.create(
    buildStripeCheckoutSessionParams({
      baseUrl: deps.baseUrl,
      envName: deps.envName,
      payerEmail: input.payerEmail,
      tokenPack: {
        id: tokenPack.id,
        key: tokenPack.key,
        name: tokenPack.name,
        tokenAmount: tokenPack.tokenAmount,
        bonusTokenAmount: tokenPack.bonusTokenAmount,
        stripePriceId: tokenPack.stripePriceId,
      },
    })
  );

  if (!session.url) {
    throw new StripeCheckoutError(
      'checkout_unavailable',
      'Stripe did not return a hosted checkout URL.',
      502
    );
  }

  (deps.log ?? logger).info({
    scope: 'payments',
    message: 'Created public Stripe checkout session',
    stripeCheckoutSessionId: session.id,
    tokenPackKey: tokenPack.key,
  });

  return {
    sessionId: session.id,
    tokenPack,
    url: session.url,
  };
}
