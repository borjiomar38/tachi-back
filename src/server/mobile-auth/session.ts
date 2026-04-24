import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
import { logger } from '@/server/logger';
import {
  zCreateMobileSessionInput,
  zMobileAuthBundle,
  zMobileHeartbeatInput,
  zMobileHeartbeatResponse,
  zMobileSessionSummaryResponse,
  zRefreshMobileSessionInput,
} from '@/server/mobile-auth/schema';
import { getMobileLicenseSubscriptionSummary } from '@/server/mobile-auth/subscription';

type MobileSessionRecord = {
  appBuild: string | null;
  appVersion: string | null;
  createdAt: Date;
  device: {
    appBuild: string | null;
    appVersion: string | null;
    id: string;
    installationId: string;
    lastSeenAt: Date | null;
    locale: string | null;
    metadata: unknown;
    platform: 'android';
    status: 'active' | 'blocked' | 'pending' | 'revoked';
  };
  deviceId: string;
  expiresAt: Date;
  id: string;
  lastUsedAt: Date | null;
  license: {
    activatedAt: Date | null;
    deviceLimit: number;
    id: string;
    key: string;
    ownerEmail: string | null;
    status: 'active' | 'expired' | 'pending' | 'revoked' | 'suspended';
  };
  licenseId: string;
  refreshTokenHash: string;
  revokedAt: Date | null;
};

export class MobileAuthError extends Error {
  constructor(
    readonly code:
      | 'expired_session'
      | 'installation_mismatch'
      | 'invalid_session'
      | 'mobile_api_disabled'
      | 'revoked_device'
      | 'revoked_license',
    readonly statusCode: number,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'MobileAuthError';
  }
}

export async function createMobileSession(
  rawInput: unknown,
  deps: {
    clientIp?: string | null;
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info'>;
    now?: Date;
    userAgent?: string | null;
  } = {}
) {
  assertMobileApiEnabled();

  const input = zCreateMobileSessionInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();
  const refreshToken = generateOpaqueToken();
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiresAt = new Date(
    now.getTime() + envServer.MOBILE_API_REFRESH_TOKEN_TTL_SECONDS * 1000
  );

  const session = await dbClient.mobileSession.create({
    data: {
      appBuild: input.appBuild,
      appVersion: input.appVersion,
      deviceId: input.deviceId,
      expiresAt: refreshTokenExpiresAt,
      lastIpAddress: deps.clientIp ?? undefined,
      lastRefreshedAt: now,
      lastUsedAt: now,
      licenseId: input.licenseId,
      metadata: {
        buildChannel: input.buildChannel,
      },
      refreshTokenHash,
      userAgent: deps.userAgent ?? undefined,
    },
    select: {
      createdAt: true,
      deviceId: true,
      expiresAt: true,
      id: true,
      licenseId: true,
    },
  });

  const accessTokenExpiresAt = new Date(
    now.getTime() + envServer.MOBILE_API_ACCESS_TOKEN_TTL_SECONDS * 1000
  );
  const accessToken = signMobileAccessToken({
    deviceId: input.deviceId,
    exp: toUnixSeconds(accessTokenExpiresAt),
    installationId: input.installationId,
    iat: toUnixSeconds(now),
    licenseId: input.licenseId,
    sessionId: session.id,
  });

  const result = {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    session: {
      createdAt: session.createdAt,
      deviceId: session.deviceId,
      expiresAt: session.expiresAt,
      id: session.id,
      installationId: input.installationId,
      licenseId: session.licenseId,
    },
  };

  log.info({
    deviceId: input.deviceId,
    licenseId: input.licenseId,
    mobileSessionId: session.id,
    scope: 'mobile_auth',
  });

  return zMobileAuthBundle.parse(result);
}

export async function refreshMobileSession(
  rawInput: unknown,
  deps: {
    clientIp?: string | null;
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info'>;
    now?: Date;
    userAgent?: string | null;
  } = {}
) {
  assertMobileApiEnabled();

  const input = zRefreshMobileSessionInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();
  const currentHash = hashToken(input.refreshToken);

  const existingSession = await dbClient.mobileSession.findUnique({
    where: { refreshTokenHash: currentHash },
    select: mobileSessionSelect,
  });

  const validatedSession = assertMobileSessionUsable({
    now,
    session: existingSession,
  });

  if (validatedSession.device.installationId !== input.installationId) {
    throw new MobileAuthError('installation_mismatch', 409);
  }

  const nextRefreshToken = generateOpaqueToken();
  const nextRefreshTokenHash = hashToken(nextRefreshToken);
  const nextRefreshTokenExpiresAt = new Date(
    now.getTime() + envServer.MOBILE_API_REFRESH_TOKEN_TTL_SECONDS * 1000
  );

  const updatedSession = await dbClient.mobileSession.update({
    where: { id: validatedSession.id },
    data: {
      appBuild: input.appBuild,
      appVersion: input.appVersion,
      expiresAt: nextRefreshTokenExpiresAt,
      lastIpAddress: deps.clientIp ?? undefined,
      lastRefreshedAt: now,
      lastUsedAt: now,
      refreshTokenHash: nextRefreshTokenHash,
      userAgent: deps.userAgent ?? undefined,
    },
    select: {
      createdAt: true,
      deviceId: true,
      expiresAt: true,
      id: true,
      licenseId: true,
    },
  });

  const accessTokenExpiresAt = new Date(
    now.getTime() + envServer.MOBILE_API_ACCESS_TOKEN_TTL_SECONDS * 1000
  );
  const accessToken = signMobileAccessToken({
    deviceId: validatedSession.deviceId,
    exp: toUnixSeconds(accessTokenExpiresAt),
    installationId: input.installationId,
    iat: toUnixSeconds(now),
    licenseId: validatedSession.licenseId,
    sessionId: validatedSession.id,
  });

  log.info({
    deviceId: validatedSession.deviceId,
    licenseId: validatedSession.licenseId,
    mobileSessionId: validatedSession.id,
    scope: 'mobile_auth',
  });

  return zMobileAuthBundle.parse({
    accessToken,
    accessTokenExpiresAt,
    refreshToken: nextRefreshToken,
    refreshTokenExpiresAt: nextRefreshTokenExpiresAt,
    session: {
      createdAt: updatedSession.createdAt,
      deviceId: updatedSession.deviceId,
      expiresAt: updatedSession.expiresAt,
      id: updatedSession.id,
      installationId: input.installationId,
      licenseId: updatedSession.licenseId,
    },
  });
}

export async function authenticateMobileAccessToken(
  request: Request,
  deps: {
    dbClient?: typeof db;
    now?: Date;
  } = {}
) {
  assertMobileApiEnabled();

  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new MobileAuthError('invalid_session', 401);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyMobileAccessToken(token, deps.now ?? new Date());
  const dbClient = deps.dbClient ?? db;

  const session = await dbClient.mobileSession.findUnique({
    where: {
      id: payload.sid,
    },
    select: mobileSessionSelect,
  });

  const validatedSession = assertMobileSessionUsable({
    now: deps.now ?? new Date(),
    session,
  });

  if (validatedSession.device.installationId !== payload.iid) {
    throw new MobileAuthError('installation_mismatch', 409);
  }

  return {
    accessTokenExpiresAt: new Date(payload.exp * 1000),
    device: validatedSession.device,
    license: validatedSession.license,
    payload,
    session: validatedSession,
  };
}

export async function buildMobileSessionSummary(
  auth: Awaited<ReturnType<typeof authenticateMobileAccessToken>>,
  deps: {
    dbClient?: typeof db;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const tokenBalance = await getAvailableLicenseTokenBalance(
    {
      licenseId: auth.license.id,
    },
    {
      dbClient,
    }
  );
  const subscription = await getMobileLicenseSubscriptionSummary(
    auth.license.id,
    {
      dbClient,
    }
  );

  return zMobileSessionSummaryResponse.parse({
    device: auth.device,
    license: {
      activatedAt: auth.license.activatedAt,
      availableTokens: tokenBalance,
      deviceLimit: auth.license.deviceLimit,
      id: auth.license.id,
      key: auth.license.key,
      ownerEmail: auth.license.ownerEmail,
      status: auth.license.status,
      subscription,
    },
    session: {
      accessTokenExpiresAt: auth.accessTokenExpiresAt,
      expiresAt: auth.session.expiresAt,
      id: auth.session.id,
      lastUsedAt: auth.session.lastUsedAt,
    },
  });
}

export async function recordMobileHeartbeat(
  auth: Awaited<ReturnType<typeof authenticateMobileAccessToken>>,
  rawInput: unknown,
  deps: {
    clientIp?: string | null;
    dbClient?: typeof db;
    now?: Date;
    userAgent?: string | null;
  } = {}
) {
  const input = zMobileHeartbeatInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const now = deps.now ?? new Date();

  const [device, session] = await dbClient.$transaction([
    dbClient.device.update({
      where: { id: auth.device.id },
      data: {
        appBuild: input.appBuild,
        appVersion: input.appVersion,
        lastIpAddress: deps.clientIp ?? undefined,
        lastSeenAt: now,
        locale: input.locale,
        metadata: {
          ...(auth.session.device.metadata &&
          typeof auth.session.device.metadata === 'object'
            ? auth.session.device.metadata
            : {}),
          buildChannel: input.buildChannel,
          lastHeartbeatAt: now.toISOString(),
        },
      },
      select: {
        lastSeenAt: true,
      },
    }),
    dbClient.mobileSession.update({
      where: { id: auth.session.id },
      data: {
        appBuild: input.appBuild,
        appVersion: input.appVersion,
        lastIpAddress: deps.clientIp ?? undefined,
        lastUsedAt: now,
        userAgent: deps.userAgent ?? undefined,
      },
      select: {
        lastUsedAt: true,
      },
    }),
  ]);

  return zMobileHeartbeatResponse.parse({
    deviceLastSeenAt: device.lastSeenAt ?? now,
    ok: true,
    sessionLastUsedAt: session.lastUsedAt ?? now,
  });
}

function assertMobileApiEnabled() {
  if (!envServer.MOBILE_API_ENABLED) {
    throw new MobileAuthError('mobile_api_disabled', 503);
  }
}

function assertMobileSessionUsable(input: {
  now: Date;
  session: MobileSessionRecord | null;
}) {
  const session = input.session;

  if (!session) {
    throw new MobileAuthError('invalid_session', 401);
  }

  if (session.revokedAt) {
    throw new MobileAuthError('invalid_session', 401);
  }

  if (session.expiresAt <= input.now) {
    throw new MobileAuthError('expired_session', 401);
  }

  if (session.device.status !== 'active') {
    throw new MobileAuthError('revoked_device', 403);
  }

  if (session.license.status !== 'active') {
    throw new MobileAuthError('revoked_license', 403);
  }

  return session;
}

function generateOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function signMobileAccessToken(input: {
  deviceId: string;
  exp: number;
  installationId: string;
  iat: number;
  licenseId: string;
  sessionId: string;
}) {
  const header = encodeJwtPart({
    alg: 'HS256',
    typ: 'JWT',
  });
  const payload = encodeJwtPart({
    aud: envServer.MOBILE_API_AUDIENCE,
    did: input.deviceId,
    exp: input.exp,
    iat: input.iat,
    iid: input.installationId,
    iss: envServer.MOBILE_API_ISSUER,
    lid: input.licenseId,
    sid: input.sessionId,
    sub: input.deviceId,
    typ: 'access',
  });
  const signingInput = `${header}.${payload}`;
  const signature = signJwtValue(signingInput);

  return `${signingInput}.${signature}`;
}

function verifyMobileAccessToken(token: string, now: Date) {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new MobileAuthError('invalid_session', 401);
  }

  const encodedHeader = parts[0]!;
  const encodedPayload = parts[1]!;
  const signature = parts[2]!;
  const expectedSignature = signJwtValue(`${encodedHeader}.${encodedPayload}`);

  if (!safeCompareStrings(expectedSignature, signature)) {
    throw new MobileAuthError('invalid_session', 401);
  }

  const payload = parseJwtPayload(encodedPayload);

  if (
    payload.iss !== envServer.MOBILE_API_ISSUER ||
    payload.aud !== envServer.MOBILE_API_AUDIENCE ||
    payload.typ !== 'access'
  ) {
    throw new MobileAuthError('invalid_session', 401);
  }

  if (payload.exp <= toUnixSeconds(now)) {
    throw new MobileAuthError('expired_session', 401);
  }

  return payload;
}

function signJwtValue(value: string) {
  return createHmac('sha256', envServer.MOBILE_API_JWT_SECRET ?? '')
    .update(value)
    .digest('base64url');
}

function safeCompareStrings(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeJwtPart(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function parseJwtPayload(encodedPayload: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Record<string, unknown>;

    if (
      typeof payload.aud !== 'string' ||
      typeof payload.did !== 'string' ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number' ||
      typeof payload.iid !== 'string' ||
      typeof payload.iss !== 'string' ||
      typeof payload.lid !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.typ !== 'string'
    ) {
      throw new Error('Invalid payload');
    }

    return payload as {
      aud: string;
      did: string;
      exp: number;
      iat: number;
      iid: string;
      iss: string;
      lid: string;
      sid: string;
      typ: string;
    };
  } catch {
    throw new MobileAuthError('invalid_session', 401);
  }
}

function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

const mobileSessionSelect = {
  appBuild: true,
  appVersion: true,
  createdAt: true,
  device: {
    select: {
      appBuild: true,
      appVersion: true,
      id: true,
      installationId: true,
      lastSeenAt: true,
      locale: true,
      metadata: true,
      platform: true,
      status: true,
    },
  },
  deviceId: true,
  expiresAt: true,
  id: true,
  lastUsedAt: true,
  license: {
    select: {
      activatedAt: true,
      deviceLimit: true,
      id: true,
      key: true,
      ownerEmail: true,
      status: true,
    },
  },
  licenseId: true,
  refreshTokenHash: true,
  revokedAt: true,
} as const;
