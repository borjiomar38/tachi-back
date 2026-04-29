import { z } from 'zod';

import {
  zRedeemActivationInput,
  zRedeemActivationResponse,
} from '@/server/licenses/schema';

export const zActivateMobileSessionInput = zRedeemActivationInput;

export const zCreateFreeTrialMobileSessionInput = z.object({
  appBuild: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(64).optional(),
  buildChannel: z.string().trim().max(32).optional(),
  email: z.email().max(320),
  installationId: z.string().trim().min(16).max(128),
  locale: z.string().trim().max(32).optional(),
  platform: z.literal('android').default('android'),
});

export const zCreateMobileSessionInput = z.object({
  appBuild: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(64).optional(),
  buildChannel: z.string().trim().max(32).optional(),
  deviceId: z.string(),
  installationId: z.string().trim().min(16).max(128),
  licenseId: z.string(),
});

export const zRefreshMobileSessionInput = z.object({
  appBuild: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(64).optional(),
  installationId: z.string().trim().min(16).max(128),
  refreshToken: z.string().trim().min(32).max(512),
});

export const zMobileHeartbeatInput = z.object({
  appBuild: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(64).optional(),
  buildChannel: z.string().trim().max(32).optional(),
  locale: z.string().trim().max(32).optional(),
});

export const zMobileAuthBundle = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.date(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.date(),
  session: z.object({
    createdAt: z.date(),
    deviceId: z.string(),
    expiresAt: z.date(),
    id: z.string(),
    installationId: z.string(),
    licenseId: z.string(),
  }),
});

export const zMobileActivationResponse = z.object({
  activation: zRedeemActivationResponse,
  auth: zMobileAuthBundle,
});

export const zMobileSessionSummaryResponse = z.object({
  device: z.object({
    appBuild: z.string().nullish(),
    appVersion: z.string().nullish(),
    id: z.string(),
    installationId: z.string(),
    lastSeenAt: z.date().nullish(),
    locale: z.string().nullish(),
    platform: z.literal('android'),
    status: z.enum(['pending', 'active', 'revoked', 'blocked']),
  }),
  license: z.object({
    activatedAt: z.date().nullish(),
    availableTokens: z.number().int(),
    deviceLimit: z.number().int().nonnegative(),
    id: z.string(),
    key: z.string(),
    ownerEmail: z.string().nullish(),
    status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
    subscription: z
      .object({
        canCancel: z.boolean(),
        endsAt: z.date().nullish(),
        planName: z.string().nullish(),
        renewsAt: z.date().nullish(),
        status: z.string().nullish(),
        tokenPackKey: z.string().nullish(),
      })
      .nullish(),
  }),
  session: z.object({
    accessTokenExpiresAt: z.date(),
    expiresAt: z.date(),
    id: z.string(),
    lastUsedAt: z.date().nullish(),
  }),
});

export const zMobileHeartbeatResponse = z.object({
  deviceLastSeenAt: z.date(),
  ok: z.literal(true),
  sessionLastUsedAt: z.date(),
});
