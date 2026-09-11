import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

import type { TokenPurchase } from '@/server/db/generated/client';

export const PURCHASE_TICKET_TTL_MS = 24 * 60 * 60 * 1000;
export const zPurchaseTicket = () => z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const zPurchaseCheckoutInput = () =>
  z.object({
    tokenPackKey: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{1,64}$/),
    payerEmail: z.email().max(320).optional(),
    installationId: z
      .string()
      .trim()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9._:-]+$/)
      .optional(),
  });

export class PurchaseError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode = 409
  ) {
    super(code);
    this.name = 'PurchaseError';
  }
}

export const resolvePurchaseTestMode = (input: {
  testMode: boolean;
  environmentName?: string;
}): boolean => {
  if (
    !input.testMode &&
    input.environmentName?.toLowerCase() !== 'production'
  ) {
    throw new PurchaseError('live_checkout_forbidden_outside_production', 503);
  }
  return input.testMode;
};

export const createPurchaseTicket = () => randomBytes(32).toString('base64url');
export const hashPurchaseTicket = (ticket: string) =>
  createHash('sha256').update(zPurchaseTicket().parse(ticket)).digest('hex');

export const buildPurchaseReturnUrl = (baseUrl: string, ticket: string) => {
  const url = new URL('/app/payment', baseUrl);
  // Fragments never travel in HTTP request URLs or Referrer headers.
  url.hash = new URLSearchParams({
    ticket: zPurchaseTicket().parse(ticket),
  }).toString();
  return url.toString();
};

export const assertPurchaseClaimable = (input: {
  purchase: TokenPurchase;
  installationId: string;
  currentLicenseId?: string;
  viaTicket: boolean;
  now: Date;
}) => {
  const { purchase, installationId, currentLicenseId, viaTicket, now } = input;
  if (purchase.status !== 'paid') {
    throw new PurchaseError(
      purchase.status === 'pending' ? 'payment_pending' : 'purchase_unavailable'
    );
  }
  if (viaTicket) {
    if (purchase.ticketExpiresAt <= now)
      throw new PurchaseError('purchase_ticket_expired', 410);
    if (purchase.installationId && purchase.installationId !== installationId) {
      throw new PurchaseError('purchase_device_mismatch', 403);
    }
    if (
      purchase.ticketConsumedAt &&
      purchase.claimedInstallationId !== installationId
    ) {
      throw new PurchaseError('purchase_ticket_used', 409);
    }
  }
  const boundLicenseId = purchase.claimedLicenseId ?? purchase.targetLicenseId;
  if (
    boundLicenseId &&
    currentLicenseId &&
    boundLicenseId !== currentLicenseId
  ) {
    throw new PurchaseError('purchase_account_mismatch', 403);
  }
};

export const resolvePurchaseLicenseId = (input: {
  purchase: TokenPurchase;
  currentLicenseId?: string;
  fundedLicenseId: string;
}) =>
  input.purchase.claimedLicenseId ??
  input.purchase.targetLicenseId ??
  input.currentLicenseId ??
  input.fundedLicenseId;

export const zPaidPurchaseEvent = () =>
  z.object({
    meta: z.object({
      event_name: z.literal('order_created'),
      test_mode: z.boolean().optional(),
      custom_data: z.object({ token_purchase_id: z.string().min(1) }),
    }),
    data: z.object({
      id: z.union([z.string(), z.number()]).transform(String),
      attributes: z
        .object({
          status: z.literal('paid'),
          test_mode: z.boolean(),
          store_id: z.union([z.string(), z.number()]).transform(String),
          currency: z
            .string()
            .length(3)
            .transform((value) => value.toLowerCase()),
          user_email: z.email(),
          customer_id: z.union([z.string(), z.number()]).optional(),
          subtotal: z.number().int().nonnegative(),
          total: z.number().int().nonnegative(),
          discount_total: z.number().int().nonnegative().default(0),
          first_order_item: z.object({
            variant_id: z.union([z.string(), z.number()]).transform(String),
            quantity: z.number().int().default(1),
          }),
        })
        .passthrough(),
    }),
  });

export const isTokenPurchaseEvent = (event: unknown): boolean => {
  const parsed = z
    .object({
      meta: z.object({
        event_name: z.literal('order_created'),
        custom_data: z.object({ token_purchase_id: z.string().min(1) }),
      }),
    })
    .safeParse(event);
  return parsed.success;
};

export const assertPurchasePaymentMatches = (
  purchase: TokenPurchase,
  event: z.infer<ReturnType<typeof zPaidPurchaseEvent>>,
  storeId: string
) => {
  const attrs = event.data.attributes;
  if (
    attrs.store_id !== storeId ||
    attrs.first_order_item.variant_id !== purchase.lsVariantId ||
    attrs.first_order_item.quantity !== 1 ||
    attrs.currency !== purchase.currency ||
    attrs.test_mode !== purchase.testMode ||
    (event.meta.test_mode !== undefined &&
      event.meta.test_mode !== purchase.testMode) ||
    attrs.subtotal !== purchase.priceAmountCents
  ) {
    throw new PurchaseError('purchase_payment_mismatch', 400);
  }
};
