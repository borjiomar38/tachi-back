import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { z } from 'zod';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { logger } from '@/server/logger';
import { initLemonSqueezy } from '@/server/payments/lemonsqueezy';

const checkoutTokenPackSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  tokenAmount: true,
  bonusTokenAmount: true,
  priceAmountCents: true,
  currency: true,
  lsVariantId: true,
  active: true,
} as const;

export const zCreateCheckoutInput = z.object({
  tokenPackKey: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/i),
  payerEmail: z.string().trim().email().max(320),
});

export type CreateCheckoutInput = z.infer<typeof zCreateCheckoutInput>;

export type CheckoutErrorCode =
  | 'checkout_unavailable'
  | 'checkout_test_mode'
  | 'ls_disabled'
  | 'token_pack_not_found'
  | 'token_pack_unavailable';

export interface CheckoutTokenPack {
  active: boolean;
  bonusTokenAmount: number;
  currency: string;
  description: string | null;
  id: string;
  key: string;
  lsVariantId: string | null;
  name: string;
  priceAmountCents: number;
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

export class CheckoutError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'CheckoutError';
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

export async function createLemonSqueezyCheckout(
  input: CreateCheckoutInput,
  deps: {
    baseUrl?: string;
    dbClient?: CheckoutDbClient;
    envName?: string | undefined;
    log?: Pick<typeof logger, 'info'>;
    allowTestMode?: boolean;
    lsEnabled?: boolean;
  } = {}
) {
  const lsEnabled = deps.lsEnabled ?? envServer.LEMONSQUEEZY_ENABLED;

  if (!lsEnabled) {
    throw new CheckoutError(
      'ls_disabled',
      'Lemon Squeezy checkout is disabled for this environment.',
      503
    );
  }

  const tokenPack = await getCheckoutTokenPackByKey(input.tokenPackKey, {
    dbClient: deps.dbClient,
  });

  if (!tokenPack?.active) {
    throw new CheckoutError(
      'token_pack_not_found',
      'The selected monthly plan is not available.',
      404
    );
  }

  if (!tokenPack.lsVariantId) {
    throw new CheckoutError(
      'token_pack_unavailable',
      'The selected monthly plan does not have a Lemon Squeezy variant configured yet.',
      409
    );
  }

  initLemonSqueezy();

  const storeId = envServer.LEMONSQUEEZY_STORE_ID;

  if (!storeId) {
    throw new CheckoutError(
      'checkout_unavailable',
      'Lemon Squeezy store ID is not configured.',
      502
    );
  }

  const baseUrl = deps.baseUrl ?? envClient.VITE_BASE_URL;
  const envName = deps.envName ?? envClient.VITE_ENV_NAME ?? 'UNKNOWN';
  const isProduction = envName.toLowerCase() === 'production';
  const allowTestMode = deps.allowTestMode ?? !isProduction;
  const totalTokens = tokenPack.tokenAmount + tokenPack.bonusTokenAmount;

  const successUrl = new URL('/checkout/success', baseUrl);
  successUrl.searchParams.set('tokenPack', tokenPack.key);

  const cancelUrl = new URL('/checkout/cancel', baseUrl);
  cancelUrl.searchParams.set('tokenPack', tokenPack.key);

  const { data, error } = await createCheckout(storeId, tokenPack.lsVariantId, {
    checkoutData: {
      email: input.payerEmail,
      custom: {
        environment: envName,
        purchase_source: 'public-web',
        token_pack_id: tokenPack.id,
        token_pack_key: tokenPack.key,
        token_pack_name: tokenPack.name,
        total_tokens: String(totalTokens),
      },
    },
    checkoutOptions: {
      embed: false,
    },
    productOptions: {
      redirectUrl: successUrl.toString(),
    },
    testMode: allowTestMode,
  });

  if (error || !data) {
    throw new CheckoutError(
      'checkout_unavailable',
      'Lemon Squeezy did not return a checkout URL.',
      502
    );
  }

  const checkoutUrl = data.data.attributes.url;
  const isTestCheckout = data.data.attributes.test_mode;

  if (isTestCheckout && !allowTestMode) {
    throw new CheckoutError(
      'checkout_test_mode',
      'The selected monthly plan is still configured in Lemon Squeezy test mode.',
      409
    );
  }

  (deps.log ?? logger).info({
    scope: 'payments',
    message: 'Created Lemon Squeezy checkout',
    lsCheckoutId: data.data.id,
    lsTestMode: isTestCheckout,
    tokenPackKey: tokenPack.key,
  });

  return {
    checkoutId: data.data.id,
    tokenPack,
    url: checkoutUrl,
  };
}
