import { z } from 'zod';

export const zBackofficeFreeTrialStatusFilter = z
  .enum([
    'all',
    'active',
    'exhausted',
    'paid_converted',
    'has_ip',
    'has_fingerprint',
  ])
  .default('all');

export const zBackofficeFreeTrialListInput = z.object({
  limit: z.coerce.number().int().positive().max(100).default(25),
  page: z.coerce.number().int().positive().default(1),
  query: z.string().trim().max(160).default(''),
  status: zBackofficeFreeTrialStatusFilter,
});

const zFreeTrialBackofficeIdentity = z.object({
  createdAt: z.date(),
  id: z.string(),
  kind: z.string(),
  value: z.string(),
});

const zFreeTrialBackofficeDevice = z.object({
  id: z.string(),
  installationId: z.string(),
  lastIpAddress: z.string().nullish(),
  lastSeenAt: z.date().nullish(),
  status: z.enum(['pending', 'active', 'revoked', 'blocked']),
});

const zFreeTrialBackofficeOrder = z.object({
  amountTotalCents: z.number().int().nonnegative(),
  billingPeriodEnd: z.date().nullish(),
  currency: z.string(),
  id: z.string(),
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
  tokenPackName: z.string().nullish(),
});

const zBackofficeFreeTrialStatus = z.enum([
  'trial_active',
  'exhausted',
  'paid_converted',
]);

export const zBackofficeFreeTrialListItem = z.object({
  availableTokens: z.number().int(),
  createdAt: z.date(),
  device: zFreeTrialBackofficeDevice.nullish(),
  deviceFingerprintHash: z.string().nullish(),
  email: z.string(),
  emailNormalized: z.string(),
  freeAccessIpBlocked: z.boolean(),
  id: z.string(),
  identityCounts: z.object({
    deviceFingerprints: z.number().int().nonnegative(),
    emails: z.number().int().nonnegative(),
    installations: z.number().int().nonnegative(),
    ipAddresses: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  installationId: z.string(),
  ipAddress: z.string().nullish(),
  license: z.object({
    id: z.string(),
    key: z.string(),
    ownerEmail: z.string().nullish(),
    status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
  }),
  paidConversion: zFreeTrialBackofficeOrder.nullish(),
  redeemCode: z.object({
    code: z.string(),
    id: z.string(),
    redeemedAt: z.date().nullish(),
    status: z.enum(['available', 'redeemed', 'expired', 'canceled']),
  }),
  spentTokens: z.number().int().nonnegative(),
  status: zBackofficeFreeTrialStatus,
  tokenAmount: z.number().int().nonnegative(),
  updatedAt: z.date(),
});

export const zBackofficeFreeTrialListResponse = z.object({
  items: z.array(zBackofficeFreeTrialListItem),
  limit: z.number().int().positive(),
  page: z.number().int().positive(),
  pageCount: z.number().int().positive(),
  stats: z.object({
    active: z.number().int().nonnegative(),
    exhausted: z.number().int().nonnegative(),
    paidConverted: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    withFingerprint: z.number().int().nonnegative(),
    withIp: z.number().int().nonnegative(),
  }),
  total: z.number().int().nonnegative(),
});

export const zBackofficeFreeTrialGetInput = z.object({
  claimId: z.string().trim().min(1),
});

export const zBackofficeFreeTrialDetail = zBackofficeFreeTrialListItem.extend({
  identities: z.array(zFreeTrialBackofficeIdentity),
  ledgerEntries: z.array(
    z.object({
      createdAt: z.date(),
      deltaTokens: z.number().int(),
      description: z.string().nullish(),
      id: z.string(),
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
    })
  ),
  networkHistory: z.array(zFreeTrialBackofficeIdentity),
  paidOrders: z.array(zFreeTrialBackofficeOrder),
  relatedDevices: z.array(zFreeTrialBackofficeDevice),
  recentJobs: z.array(
    z.object({
      completedAt: z.date().nullish(),
      createdAt: z.date(),
      id: z.string(),
      pageCount: z.number().int().nonnegative(),
      spentTokens: z.number().int(),
      status: z.string(),
      targetLanguage: z.string(),
    })
  ),
});
