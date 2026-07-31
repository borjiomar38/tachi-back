import { z } from 'zod';

import { zRegisterMobileInstallationInput } from '@/server/mobile-auth/schema';

export const funnelEventNames = [
  'paywall_viewed',
  'paywall_subscribe_clicked',
] as const;

export const funnelEventSurfaces = [
  'library',
  'manga',
  'settings',
  'source_discovery',
  'sources',
] as const;

export const funnelEventModes = [
  'choice',
  'email_code',
  'free_trial',
  'free_trial_daily_limit',
  'out_of_tokens',
  'redeem_code',
  'subscription_required',
] as const;

export const funnelEventActions = [
  'source_discovery',
  'translate_chapters',
  'translate_manga_page',
] as const;

export const funnelEventReasonCodes = [
  'expired_session',
  'free_access_ip_blocked',
  'free_access_unavailable',
  'free_trial_daily_limit_exceeded',
  'free_trial_device_used',
  'free_trial_email_code_sent',
  'free_trial_email_used',
  'free_trial_unavailable',
  'hosted_error',
  'insufficient_tokens',
  'invalid_access_token',
  'invalid_redeem_code',
  'invalid_refresh_token',
  'invalid_session',
  'missing_redeem_code',
  'not_activated',
  'session_revoked',
] as const;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createMobileFunnelEventInputSchema = () =>
  z
    .object({
      consent: z
        .object({
          analytics: z.literal(true),
          version: z
            .string()
            .trim()
            .min(1)
            .max(32)
            .regex(/^[a-z0-9._-]+$/i),
        })
        .strict(),
      eventKey: z.string().trim().regex(uuidPattern),
      installationId: zRegisterMobileInstallationInput.shape.installationId,
      name: z.enum(funnelEventNames),
      occurredAt: z.coerce.date(),
      properties: z
        .object({
          action: z.enum(funnelEventActions),
          mode: z.enum(funnelEventModes),
          reasonCode: z.enum(funnelEventReasonCodes),
          surface: z.enum(funnelEventSurfaces),
        })
        .strict(),
    })
    .strict();

export const createMobileFunnelEventResponseSchema = () =>
  z
    .object({
      accepted: z.boolean(),
      duplicate: z.boolean(),
      reason: z.literal('unknown_installation').optional(),
    })
    .strict();

export const createFunnelOverviewInputSchema = () =>
  z
    .object({
      days: z.coerce.number().int().min(1).max(90).default(30),
    })
    .strict();

export const createFunnelOverviewSchema = () =>
  z
    .object({
      counts: z
        .object({
          firstTranslationDevices: z.number().int().nonnegative(),
          installs: z.number().int().nonnegative(),
          paywallSubscribeClickers: z.number().int().nonnegative(),
          paywallViewers: z.number().int().nonnegative(),
          secondTranslationDevices: z.number().int().nonnegative(),
          trials: z.number().int().nonnegative(),
        })
        .strict(),
      period: z
        .object({
          days: z.number().int().positive(),
          from: z.iso.datetime(),
          generatedAt: z.iso.datetime(),
          to: z.iso.datetime(),
        })
        .strict(),
      rates: z
        .object({
          firstToSecondTranslation: z.number().min(0).max(1),
          installToTrial: z.number().min(0).max(1),
          paywallViewToSubscribeClick: z.number().min(0).max(1),
          trialToFirstTranslation: z.number().min(0).max(1),
        })
        .strict(),
    })
    .strict();

export type MobileFunnelEventInput = z.infer<
  ReturnType<typeof createMobileFunnelEventInputSchema>
>;

export type MobileFunnelEventResponse = z.infer<
  ReturnType<typeof createMobileFunnelEventResponseSchema>
>;

export type FunnelOverviewInput = z.infer<
  ReturnType<typeof createFunnelOverviewInputSchema>
>;

export type FunnelOverview = z.infer<
  ReturnType<typeof createFunnelOverviewSchema>
>;
