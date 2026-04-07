import { z } from 'zod';

export const zRedeemActivationInput = z.object({
  appBuild: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(64).optional(),
  buildChannel: z.string().trim().max(32).optional(),
  installationId: z
    .string()
    .trim()
    .min(16)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/),
  integrityVerdict: z.string().trim().max(128).optional(),
  locale: z.string().trim().max(32).optional(),
  platform: z.literal('android').default('android'),
  redeemCode: z.string().trim().min(1).max(64),
});

export const zRedeemActivationResponse = z.object({
  activationStatus: z.enum(['activated', 'already_activated']),
  device: z.object({
    appBuild: z.string().nullish(),
    appVersion: z.string().nullish(),
    boundAt: z.date(),
    id: z.string(),
    installationId: z.string(),
    lastSeenAt: z.date().nullish(),
    locale: z.string().nullish(),
    platform: z.literal('android'),
    status: z.enum(['pending', 'active', 'revoked', 'blocked']),
  }),
  license: z.object({
    activatedAt: z.date().nullish(),
    activeDeviceCount: z.number().int().nonnegative(),
    availableTokens: z.number().int(),
    deviceLimit: z.number().int().nonnegative(),
    id: z.string(),
    key: z.string(),
    status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
  }),
  redeemCode: z.object({
    code: z.string(),
    redeemedAt: z.date().nullish(),
    status: z.enum(['available', 'redeemed', 'expired', 'canceled']),
  }),
});

export const zLicenseSummary = z.object({
  activatedAt: z.date().nullish(),
  activeDeviceCount: z.number().int().nonnegative(),
  availableTokens: z.number().int(),
  createdAt: z.date(),
  deviceLimit: z.number().int().nonnegative(),
  id: z.string(),
  key: z.string(),
  ownerEmail: z.string().nullish(),
  redeemCodes: z.array(
    z.object({
      code: z.string(),
      createdAt: z.date(),
      expiresAt: z.date().nullish(),
      redeemedAt: z.date().nullish(),
      status: z.enum(['available', 'redeemed', 'expired', 'canceled']),
    })
  ),
  revokedAt: z.date().nullish(),
  status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
});

export const zLicenseDevice = z.object({
  appBuild: z.string().nullish(),
  appVersion: z.string().nullish(),
  boundAt: z.date(),
  deviceId: z.string(),
  deviceStatus: z.enum(['pending', 'active', 'revoked', 'blocked']),
  installationId: z.string(),
  lastSeenAt: z.date().nullish(),
  licenseBindingId: z.string(),
  locale: z.string().nullish(),
  platform: z.literal('android'),
  status: z.enum(['active', 'released', 'revoked']),
  unboundAt: z.date().nullish(),
});

export const zSupportLookupResult = z.discriminatedUnion('entityType', [
  z.object({
    activeDeviceCount: z.number().int().nonnegative(),
    entityType: z.literal('license'),
    key: z.string(),
    matchedOn: z.enum(['license_key', 'owner_email']),
    matchedValue: z.string(),
    ownerEmail: z.string().nullish(),
    status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
  }),
  z.object({
    code: z.string(),
    entityType: z.literal('redeem_code'),
    key: z.string(),
    matchedOn: z.literal('redeem_code'),
    matchedValue: z.string(),
    ownerEmail: z.string().nullish(),
    redeemedAt: z.date().nullish(),
    status: z.enum(['available', 'redeemed', 'expired', 'canceled']),
  }),
  z.object({
    amountTotalCents: z.number().int().nonnegative(),
    currency: z.string(),
    entityType: z.literal('order'),
    id: z.string(),
    key: z.string().nullish(),
    matchedOn: z.enum([
      'order_id',
      'payer_email',
      'ls_order_id',
      'ls_subscription_id',
    ]),
    matchedValue: z.string(),
    paidAt: z.date().nullish(),
    payerEmail: z.string().nullish(),
    status: z.enum([
      'pending',
      'paid',
      'failed',
      'canceled',
      'refunded',
      'partially_refunded',
    ]),
  }),
  z.object({
    deviceId: z.string(),
    entityType: z.literal('device'),
    installationId: z.string(),
    key: z.string().nullish(),
    lastSeenAt: z.date().nullish(),
    matchedOn: z.literal('installation_id'),
    matchedValue: z.string(),
    status: z.enum(['pending', 'active', 'revoked', 'blocked']),
  }),
]);

export const zLicenseOrderSummary = z.object({
  amountTotalCents: z.number().int().nonnegative(),
  createdAt: z.date(),
  currency: z.string(),
  id: z.string(),
  paidAt: z.date().nullish(),
  payerEmail: z.string().nullish(),
  lsOrderId: z.string().nullish(),
  lsSubscriptionId: z.string().nullish(),
  provider: z.enum(['lemonsqueezy', 'manual']),
  status: z.enum([
    'pending',
    'paid',
    'failed',
    'canceled',
    'refunded',
    'partially_refunded',
  ]),
  tokenPackName: z.string().nullish(),
});

export const zLicenseLedgerEntry = z.object({
  createdAt: z.date(),
  deltaTokens: z.number().int(),
  description: z.string().nullish(),
  deviceId: z.string().nullish(),
  id: z.string(),
  jobId: z.string().nullish(),
  orderId: z.string().nullish(),
  redeemCode: z.string().nullish(),
  status: z.enum(['pending', 'posted', 'voided']),
  type: z.enum([
    'purchase_credit',
    'manual_credit',
    'redeem_credit',
    'job_reserve',
    'job_release',
    'job_spend',
    'refund_credit',
    'expiration_debit',
    'admin_adjustment',
  ]),
});

export const zBackofficeDeviceDetail = z.object({
  activeLicense: z
    .object({
      boundAt: z.date(),
      id: z.string(),
      key: z.string(),
      ownerEmail: z.string().nullish(),
      status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
    })
    .nullish(),
  appBuild: z.string().nullish(),
  appVersion: z.string().nullish(),
  bindings: z.array(
    z.object({
      boundAt: z.date(),
      key: z.string(),
      licenseBindingId: z.string(),
      licenseId: z.string(),
      licenseStatus: z.enum([
        'pending',
        'active',
        'suspended',
        'revoked',
        'expired',
      ]),
      ownerEmail: z.string().nullish(),
      status: z.enum(['active', 'released', 'revoked']),
      unboundAt: z.date().nullish(),
    })
  ),
  createdAt: z.date(),
  id: z.string(),
  installationId: z.string(),
  lastIpAddress: z.string().nullish(),
  lastSeenAt: z.date().nullish(),
  locale: z.string().nullish(),
  metadata: z.unknown().nullish(),
  platform: z.literal('android'),
  status: z.enum(['pending', 'active', 'revoked', 'blocked']),
});

export const zCreateManualLicenseGrantInput = z.object({
  deviceLimit: z.coerce.number().int().min(0).max(10).default(0),
  notes: z.string().trim().max(500).optional(),
  ownerEmail: z.email().optional(),
  redeemCodeExpiresAt: z.coerce.date().optional(),
  tokenAmount: z.coerce.number().int().positive().max(1_000_000),
});

export const zCreateManualLicenseGrantResponse = z.object({
  createdAt: z.date(),
  deviceLimit: z.number().int().nonnegative(),
  licenseId: z.string(),
  licenseKey: z.string(),
  redeemCode: z.string(),
  tokenAmount: z.number().int().positive(),
});

export const zRevokeDeviceInput = z.object({
  deviceId: z.string(),
  reason: z.string().trim().max(300).optional(),
});

export const zRevokeDeviceResponse = z.object({
  id: z.string(),
  installationId: z.string(),
  revokedAt: z.date(),
  status: z.literal('revoked'),
});
