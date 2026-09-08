import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { createMobileSession } from '@/server/mobile-auth/session';
import { getMobileLicenseSubscriptionSummary } from '@/server/mobile-auth/subscription';
import {
  createLemonSqueezyCheckout,
  getCheckoutTokenPackByKey,
} from '@/server/payments/checkout';

export const DEFAULT_MOBILE_CHECKOUT_TOKEN_PACK_KEY = 'starter';

const MOBILE_CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MOBILE_CHECKOUT_CLAIMS = 5;

export const zCreateMobileCheckoutInput = z.object({
  appBuild: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(64).optional(),
  buildChannel: z.string().trim().max(32).optional(),
  installationId: z
    .string()
    .trim()
    .regex(
      /^android-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    ),
  locale: z.string().trim().max(32).optional(),
  payerEmail: z.string().trim().email().max(320).optional(),
  tokenPackKey: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/i)
    .default(DEFAULT_MOBILE_CHECKOUT_TOKEN_PACK_KEY),
});

export const zClaimMobileCheckoutInput = z.object({
  appBuild: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(64).optional(),
  buildChannel: z.string().trim().max(32).optional(),
  installationId: z
    .string()
    .trim()
    .regex(
      /^android-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    ),
  intentToken: z.string().trim().min(64).max(1024),
});

type MobileCheckoutAuth = {
  device: {
    id: string;
    installationId: string;
    status: 'active' | 'blocked' | 'pending' | 'revoked';
  };
  license: {
    id: string;
    ownerEmail: string | null;
    status: 'active' | 'expired' | 'pending' | 'revoked' | 'suspended';
  };
  session: {
    id: string;
  };
};

type MobileCheckoutErrorCode =
  | 'checkout_already_active'
  | 'checkout_claim_limit_reached'
  | 'checkout_expired'
  | 'checkout_invalid'
  | 'checkout_not_ready'
  | 'device_unavailable'
  | 'installation_mismatch'
  | 'installation_not_registered'
  | 'license_unavailable'
  | 'token_pack_not_found';

export class MobileCheckoutError extends Error {
  constructor(
    readonly code: MobileCheckoutErrorCode,
    readonly statusCode: number,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'MobileCheckoutError';
  }
}

export function resolveMobileCheckoutEligibility(input: {
  deviceStatus: 'active' | 'blocked' | 'pending' | 'revoked';
  licenseStatus?:
    | 'active'
    | 'expired'
    | 'pending'
    | 'revoked'
    | 'suspended'
    | null;
  subscriptionStatus?: string | null;
}) {
  if (input.deviceStatus === 'blocked' || input.deviceStatus === 'revoked') {
    throw new MobileCheckoutError(
      'device_unavailable',
      403,
      'This installation cannot start a checkout.'
    );
  }

  if (
    input.licenseStatus &&
    input.licenseStatus !== 'active' &&
    input.licenseStatus !== 'pending'
  ) {
    throw new MobileCheckoutError(
      'license_unavailable',
      403,
      'The license linked to this installation cannot start a checkout.'
    );
  }

  const normalizedSubscriptionStatus = input.subscriptionStatus
    ?.trim()
    .toLowerCase();
  if (
    normalizedSubscriptionStatus &&
    !['canceled', 'cancelled', 'expired', 'failed', 'refunded'].includes(
      normalizedSubscriptionStatus
    )
  ) {
    throw new MobileCheckoutError(
      'checkout_already_active',
      409,
      'An active subscription is already linked to this installation.'
    );
  }
}

export async function createMobileSubscriptionCheckout(
  auth: MobileCheckoutAuth | null,
  rawInput: unknown,
  deps: {
    baseUrl?: string;
    createCheckoutFn?: typeof createLemonSqueezyCheckout;
    dbClient?: typeof db;
    now?: Date;
    signingSecret?: string;
  } = {}
) {
  const input = zCreateMobileCheckoutInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const now = deps.now ?? new Date();
  const signingSecret = requireSigningSecret(deps.signingSecret);
  const actor = auth
    ? {
        device: auth.device,
        license: auth.license,
        sessionId: auth.session.id,
      }
    : await resolveInstallationActor(input.installationId, { dbClient });

  if (actor.device.installationId !== input.installationId) {
    throw new MobileCheckoutError('installation_mismatch', 409);
  }

  const subscription = actor.license
    ? await getMobileLicenseSubscriptionSummary(actor.license.id, { dbClient })
    : null;

  resolveMobileCheckoutEligibility({
    deviceStatus: actor.device.status,
    licenseStatus: actor.license?.status,
    subscriptionStatus: subscription?.status,
  });

  const tokenPack = await getCheckoutTokenPackByKey(input.tokenPackKey, {
    dbClient,
  });
  if (!tokenPack?.active) {
    throw new MobileCheckoutError(
      'token_pack_not_found',
      404,
      'The selected monthly plan is not available.'
    );
  }

  const secret = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + MOBILE_CHECKOUT_TTL_MS);
  const intent = await dbClient.mobileCheckoutIntent.create({
    data: {
      deviceId: actor.device.id,
      expiresAt,
      initiatingSessionId: actor.sessionId,
      licenseId: actor.license?.id,
      payerEmail: input.payerEmail ?? actor.license?.ownerEmail,
      tokenHash: hashMobileCheckoutSecret(secret),
      tokenPackId: tokenPack.id,
    },
    select: {
      id: true,
    },
  });
  const intentToken = buildMobileCheckoutIntentToken({
    intentId: intent.id,
    secret,
    signingSecret,
  });

  try {
    const checkout = await (
      deps.createCheckoutFn ?? createLemonSqueezyCheckout
    )(
      {
        payerEmail: input.payerEmail ?? actor.license?.ownerEmail,
        tokenPackKey: input.tokenPackKey,
      },
      {
        baseUrl: deps.baseUrl,
        dbClient,
        mobileCheckout: {
          intentId: intent.id,
          returnToken: intentToken,
        },
      }
    );

    await dbClient.mobileCheckoutIntent.update({
      where: { id: intent.id },
      data: {
        lsCheckoutId: checkout.checkoutId,
      },
    });

    return {
      expiresAt,
      intentToken,
      plan: {
        currency: checkout.tokenPack.currency,
        name: checkout.tokenPack.name,
        priceAmountCents: checkout.tokenPack.priceAmountCents,
        tokenAmount:
          checkout.tokenPack.tokenAmount + checkout.tokenPack.bonusTokenAmount,
        tokenPackKey: checkout.tokenPack.key,
      },
      state: 'pending' as const,
      url: checkout.url,
    };
  } catch (error) {
    await dbClient.mobileCheckoutIntent.update({
      where: { id: intent.id },
      data: { status: 'expired' },
    });
    throw error;
  }
}

export async function claimMobileSubscriptionCheckout(
  rawInput: unknown,
  deps: {
    clientIp?: string | null;
    createMobileSessionFn?: typeof createMobileSession;
    dbClient?: typeof db;
    now?: Date;
    signingSecret?: string;
    userAgent?: string | null;
  } = {}
) {
  const input = zClaimMobileCheckoutInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const now = deps.now ?? new Date();
  const parsedToken = parseMobileCheckoutIntentToken(
    input.intentToken,
    requireSigningSecret(deps.signingSecret)
  );
  const intent = await dbClient.mobileCheckoutIntent.findUnique({
    where: { id: parsedToken.intentId },
    select: {
      claimCount: true,
      device: {
        select: {
          id: true,
          installationId: true,
          status: true,
        },
      },
      expiresAt: true,
      id: true,
      license: {
        select: {
          id: true,
          status: true,
        },
      },
      paidAt: true,
      status: true,
      tokenHash: true,
      tokenPack: {
        select: {
          bonusTokenAmount: true,
          currency: true,
          key: true,
          name: true,
          priceAmountCents: true,
          tokenAmount: true,
        },
      },
    },
  });

  if (
    !intent ||
    !safeCompareStrings(
      intent.tokenHash,
      hashMobileCheckoutSecret(parsedToken.secret)
    )
  ) {
    throw new MobileCheckoutError('checkout_invalid', 404);
  }

  if (intent.device.installationId !== input.installationId) {
    throw new MobileCheckoutError('installation_mismatch', 409);
  }

  if (intent.status === 'pending' && intent.expiresAt <= now) {
    await dbClient.mobileCheckoutIntent.update({
      where: { id: intent.id },
      data: { status: 'expired' },
    });
    return buildCheckoutClaimState(intent, 'expired');
  }

  if (intent.status !== 'paid') {
    return buildCheckoutClaimState(intent, intent.status);
  }

  if (!intent.license || intent.license.status !== 'active') {
    throw new MobileCheckoutError(
      'license_unavailable',
      409,
      'The paid checkout is not linked to an active license yet.'
    );
  }

  if (intent.device.status !== 'active') {
    throw new MobileCheckoutError(
      'device_unavailable',
      409,
      'The paid checkout is not linked to an active installation yet.'
    );
  }

  if (intent.claimCount >= MAX_MOBILE_CHECKOUT_CLAIMS) {
    throw new MobileCheckoutError(
      'checkout_claim_limit_reached',
      409,
      'This checkout has already been restored too many times. Use the emailed activation code.'
    );
  }

  const auth = await (deps.createMobileSessionFn ?? createMobileSession)(
    {
      appBuild: input.appBuild,
      appVersion: input.appVersion,
      buildChannel: input.buildChannel,
      deviceId: intent.device.id,
      installationId: intent.device.installationId,
      licenseId: intent.license.id,
    },
    {
      clientIp: deps.clientIp,
      dbClient,
      now,
      userAgent: deps.userAgent,
    }
  );

  await dbClient.mobileCheckoutIntent.update({
    where: { id: intent.id },
    data: {
      claimCount: { increment: 1 },
      lastClaimedAt: now,
    },
  });

  return {
    ...buildCheckoutClaimState(intent, 'paid'),
    auth,
  };
}

function buildCheckoutClaimState(
  intent: {
    expiresAt: Date;
    paidAt: Date | null;
    tokenPack: {
      bonusTokenAmount: number;
      currency: string;
      key: string;
      name: string;
      priceAmountCents: number;
      tokenAmount: number;
    };
  },
  state: 'canceled' | 'expired' | 'paid' | 'pending'
) {
  return {
    auth: null,
    expiresAt: intent.expiresAt,
    paidAt: intent.paidAt,
    plan: {
      currency: intent.tokenPack.currency,
      name: intent.tokenPack.name,
      priceAmountCents: intent.tokenPack.priceAmountCents,
      tokenAmount:
        intent.tokenPack.tokenAmount + intent.tokenPack.bonusTokenAmount,
      tokenPackKey: intent.tokenPack.key,
    },
    state,
  };
}

async function resolveInstallationActor(
  installationId: string,
  deps: {
    dbClient: typeof db;
  }
) {
  const device = await deps.dbClient.device.findUnique({
    where: { installationId },
    select: {
      id: true,
      installationId: true,
      licenseBindings: {
        where: {
          status: 'active',
          license: {
            status: {
              in: ['active', 'pending'],
            },
          },
        },
        orderBy: { boundAt: 'desc' },
        take: 1,
        select: {
          license: {
            select: {
              id: true,
              ownerEmail: true,
              status: true,
            },
          },
        },
      },
      status: true,
    },
  });

  if (!device) {
    throw new MobileCheckoutError('installation_not_registered', 404);
  }

  return {
    device: {
      id: device.id,
      installationId: device.installationId,
      status: device.status,
    },
    license: device.licenseBindings[0]?.license ?? null,
    sessionId: null,
  };
}

function buildMobileCheckoutIntentToken(input: {
  intentId: string;
  secret: string;
  signingSecret: string;
}) {
  const unsignedToken = `${input.intentId}.${input.secret}`;
  const signature = signMobileCheckoutValue(unsignedToken, input.signingSecret);
  return `${unsignedToken}.${signature}`;
}

function parseMobileCheckoutIntentToken(token: string, signingSecret: string) {
  const [intentId, secret, signature, ...extraParts] = token.split('.');
  if (!intentId || !secret || !signature || extraParts.length > 0) {
    throw new MobileCheckoutError('checkout_invalid', 404);
  }

  const expectedSignature = signMobileCheckoutValue(
    `${intentId}.${secret}`,
    signingSecret
  );
  if (!safeCompareStrings(signature, expectedSignature)) {
    throw new MobileCheckoutError('checkout_invalid', 404);
  }

  return { intentId, secret };
}

function signMobileCheckoutValue(value: string, signingSecret: string) {
  return createHmac('sha256', signingSecret).update(value).digest('base64url');
}

function hashMobileCheckoutSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

function safeCompareStrings(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function requireSigningSecret(override?: string) {
  const secret = override ?? envServer.MOBILE_API_JWT_SECRET;
  if (!secret) {
    throw new MobileCheckoutError(
      'checkout_invalid',
      503,
      'Mobile checkout signing is not configured.'
    );
  }
  return secret;
}
