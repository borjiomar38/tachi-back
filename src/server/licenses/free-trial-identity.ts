import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import {
  buildFreeAccessIpClaimBlock,
  FreeAccessIpBlockedError,
  normalizeFreeAccessIpAddress,
} from '@/server/licenses/free-access-ip-block';
import { hasPaidLicenseEntitlement } from '@/server/licenses/paid-entitlement';

const FREE_TRIAL_IDENTITY_KINDS = {
  deviceFingerprint: 'device_fingerprint',
  email: 'email',
  installation: 'installation',
  ipAddress: 'ip_address',
} as const;

type FreeTrialIdentityKind =
  (typeof FREE_TRIAL_IDENTITY_KINDS)[keyof typeof FREE_TRIAL_IDENTITY_KINDS];

export type FreeTrialIdentitySignal = {
  kind: FreeTrialIdentityKind;
  value: string;
};

type FreeTrialIdentityDbClient = Pick<typeof db, 'freeTrialIdentity'>;
type FreeTrialIdentityClaimDbClient = Pick<
  typeof db,
  'freeTrialClaim' | 'freeTrialIdentity' | 'order'
>;

export function buildFreeTrialIdentitySignals(input: {
  deviceFingerprintHash?: string | null;
  emailNormalized?: string | null;
  installationId?: string | null;
  ipAddress?: string | null;
}) {
  const signals: FreeTrialIdentitySignal[] = [];

  addIdentitySignal(signals, {
    kind: FREE_TRIAL_IDENTITY_KINDS.email,
    value: input.emailNormalized?.trim().toLowerCase(),
  });
  addIdentitySignal(signals, {
    kind: FREE_TRIAL_IDENTITY_KINDS.installation,
    value: input.installationId?.trim(),
  });
  addIdentitySignal(signals, {
    kind: FREE_TRIAL_IDENTITY_KINDS.ipAddress,
    value: normalizeFreeAccessIpAddress(input.ipAddress),
  });
  addIdentitySignal(signals, {
    kind: FREE_TRIAL_IDENTITY_KINDS.deviceFingerprint,
    value: input.deviceFingerprintHash?.trim().toLowerCase(),
  });

  return signals;
}

export async function findFreeTrialIdentityConflict(
  dbClient: FreeTrialIdentityDbClient,
  signals: FreeTrialIdentitySignal[],
  options: {
    excludeClaimId?: string | null;
  } = {}
) {
  if (signals.length === 0) {
    return null;
  }

  return dbClient.freeTrialIdentity.findFirst({
    where: {
      ...(options.excludeClaimId
        ? {
            claimId: {
              not: options.excludeClaimId,
            },
          }
        : {}),
      OR: signals.map((signal) => ({
        kind: signal.kind,
        value: signal.value,
      })),
    },
    select: {
      claimId: true,
      kind: true,
      value: true,
    },
  });
}

export async function createFreeTrialIdentitySignals(
  dbClient: FreeTrialIdentityDbClient,
  input: {
    claimId: string;
    signals: FreeTrialIdentitySignal[];
  }
) {
  if (input.signals.length === 0) {
    return;
  }

  await dbClient.freeTrialIdentity.createMany({
    data: input.signals.map((signal) => ({
      claimId: input.claimId,
      kind: signal.kind,
      value: signal.value,
    })),
  });
}

export async function ensureFreeTrialIdentitySignals(
  dbClient: FreeTrialIdentityDbClient,
  input: {
    claimId: string;
    ipAddress?: string | null;
    now: Date;
    signals: FreeTrialIdentitySignal[];
  }
) {
  if (input.signals.length === 0) {
    return;
  }

  const existingConflict = await findFreeTrialIdentityConflict(
    dbClient,
    input.signals,
    {
      excludeClaimId: input.claimId,
    }
  );

  if (existingConflict) {
    throwFreeTrialIdentityUnavailable({
      ipAddress: input.ipAddress ?? null,
      now: input.now,
    });
  }

  await dbClient.freeTrialIdentity.createMany({
    data: input.signals.map((signal) => ({
      claimId: input.claimId,
      kind: signal.kind,
      value: signal.value,
    })),
    skipDuplicates: true,
  });

  const conflictAfterInsert = await findFreeTrialIdentityConflict(
    dbClient,
    input.signals,
    {
      excludeClaimId: input.claimId,
    }
  );

  if (conflictAfterInsert) {
    throwFreeTrialIdentityUnavailable({
      ipAddress: input.ipAddress ?? null,
      now: input.now,
    });
  }
}

export async function recordFreeTrialNetworkIdentityForLicense(
  input: {
    ipAddress?: string | null;
    licenseId: string;
    now: Date;
  },
  deps: {
    dbClient?: FreeTrialIdentityClaimDbClient;
  } = {}
) {
  const ipAddress = normalizeFreeAccessIpAddress(input.ipAddress);

  if (!ipAddress) {
    return null;
  }

  const dbClient = deps.dbClient ?? db;
  const claim = await findTrialOnlyFreeTrialClaimForLicense(
    {
      licenseId: input.licenseId,
      now: input.now,
    },
    {
      dbClient,
    }
  );

  if (!claim) {
    return null;
  }

  await ensureFreeTrialIdentitySignals(dbClient, {
    claimId: claim.id,
    ipAddress,
    now: input.now,
    signals: buildFreeTrialIdentitySignals({
      ipAddress,
    }),
  });

  return claim;
}

export async function findTrialOnlyFreeTrialClaimForLicense(
  input: {
    licenseId: string;
    now: Date;
  },
  deps: {
    dbClient?: FreeTrialIdentityClaimDbClient;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const claim = await dbClient.freeTrialClaim.findUnique({
    where: {
      licenseId: input.licenseId,
    },
    select: {
      id: true,
    },
  });

  if (!claim) {
    return null;
  }

  const hasPaidEntitlement = await hasPaidLicenseEntitlement(
    {
      licenseId: input.licenseId,
      now: input.now,
    },
    {
      dbClient,
    }
  );

  return hasPaidEntitlement ? null : claim;
}

export function throwFreeTrialIdentityUnavailable(input: {
  ipAddress: string | null;
  now: Date;
}): never {
  throw new FreeAccessIpBlockedError(
    buildFreeAccessIpClaimBlock({
      ipAddress: input.ipAddress ?? 'free-trial-repeat',
      now: input.now,
      reason: 'free_trial_claim_already_used',
    })
  );
}

export function isPrismaUniqueIdentityConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function addIdentitySignal(
  signals: FreeTrialIdentitySignal[],
  input: {
    kind: FreeTrialIdentityKind;
    value?: string | null;
  }
) {
  const value = input.value?.trim();

  if (!value) {
    return;
  }

  if (
    signals.some(
      (signal) => signal.kind === input.kind && signal.value === value
    )
  ) {
    return;
  }

  signals.push({
    kind: input.kind,
    value,
  });
}
