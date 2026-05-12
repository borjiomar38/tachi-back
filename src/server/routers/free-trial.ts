import { ORPCError } from '@orpc/client';

import { Prisma } from '@/server/db/generated/client';
import { listFreeAccessIpBlocks } from '@/server/licenses/free-access-ip-block';
import {
  zBackofficeFreeTrialDetail,
  zBackofficeFreeTrialGetInput,
  zBackofficeFreeTrialListInput,
  zBackofficeFreeTrialListResponse,
} from '@/server/licenses/free-trial-backoffice-schema';
import { protectedProcedure } from '@/server/orpc';

const tags = ['free-trials'];
const MAX_BACKOFFICE_FREE_TRIAL_SCAN = 500;

const FREE_TRIAL_IDENTITY_KINDS = {
  deviceFingerprint: 'device_fingerprint',
  email: 'email',
  installation: 'installation',
  ipAddress: 'ip_address',
} as const;

const freeTrialOrderSelect = {
  amountTotalCents: true,
  billingPeriodEnd: true,
  currency: true,
  id: true,
  paidAt: true,
  payerEmail: true,
  status: true,
  tokenPack: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.OrderSelect;

const freeTrialLicenseSelect = {
  id: true,
  key: true,
  ownerEmail: true,
  status: true,
  orders: {
    orderBy: {
      paidAt: 'desc',
    },
    select: freeTrialOrderSelect,
    where: {
      paidAt: {
        not: null,
      },
      status: 'paid',
    },
  },
} satisfies Prisma.LicenseSelect;

const freeTrialListSelect = {
  createdAt: true,
  deviceFingerprintHash: true,
  email: true,
  emailNormalized: true,
  id: true,
  identities: {
    orderBy: [
      {
        kind: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
    select: {
      createdAt: true,
      id: true,
      kind: true,
      value: true,
    },
  },
  installationId: true,
  ipAddress: true,
  license: {
    select: freeTrialLicenseSelect,
  },
  licenseId: true,
  redeemCode: {
    select: {
      code: true,
      id: true,
      redeemedAt: true,
      status: true,
    },
  },
  redeemCodeId: true,
  tokenAmount: true,
  updatedAt: true,
} satisfies Prisma.FreeTrialClaimSelect;

const freeTrialDetailSelect = {
  ...freeTrialListSelect,
  license: {
    select: {
      ...freeTrialLicenseSelect,
      jobs: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          completedAt: true,
          createdAt: true,
          id: true,
          pageCount: true,
          spentTokens: true,
          status: true,
          targetLanguage: true,
        },
        take: 25,
      },
      ledgerEntries: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
          deltaTokens: true,
          description: true,
          id: true,
          status: true,
          type: true,
        },
        take: 40,
      },
    },
  },
} satisfies Prisma.FreeTrialClaimSelect;

const freeTrialDeviceSelect = {
  id: true,
  installationId: true,
  lastIpAddress: true,
  lastSeenAt: true,
  status: true,
} satisfies Prisma.DeviceSelect;

type FreeTrialListRecord = Prisma.FreeTrialClaimGetPayload<{
  select: typeof freeTrialListSelect;
}>;

type FreeTrialDetailRecord = Prisma.FreeTrialClaimGetPayload<{
  select: typeof freeTrialDetailSelect;
}>;

type FreeTrialDeviceRecord = Prisma.DeviceGetPayload<{
  select: typeof freeTrialDeviceSelect;
}>;

type LicenseTokenBalance = {
  availableTokens: number;
};

export default {
  list: protectedProcedure({
    permissions: {
      device: ['read'],
      license: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/free-trials',
      tags,
    })
    .input(zBackofficeFreeTrialListInput)
    .output(zBackofficeFreeTrialListResponse)
    .handler(async ({ context, input }) => {
      const query = input.query.trim();
      const where = buildFreeTrialWhere({
        query,
        status: input.status,
      });

      const [claims, freeAccessIpBlocks] = await Promise.all([
        context.db.freeTrialClaim.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          select: freeTrialListSelect,
          take: MAX_BACKOFFICE_FREE_TRIAL_SCAN,
          where,
        }),
        listFreeAccessIpBlocks({
          dbClient: context.db,
        }),
      ]);
      const blockedFreeAccessIps = new Set(
        freeAccessIpBlocks.map((block) => block.ipAddress)
      );
      const [balanceByLicenseId, deviceByInstallationId] = await Promise.all([
        getBalanceByLicenseId(context.db, claims),
        getDeviceByInstallationId(context.db, claims),
      ]);

      const mappedClaims = claims.map((claim) =>
        mapClaimForBackoffice(claim, {
          balanceByLicenseId,
          blockedFreeAccessIps,
          deviceByInstallationId,
        })
      );
      const stats = buildStats(mappedClaims);
      const filteredClaims = mappedClaims.filter((claim) =>
        matchesStatusFilter(claim, input.status)
      );
      const total = filteredClaims.length;
      const pageCount = Math.max(1, Math.ceil(total / input.limit));
      const normalizedPage = Math.min(input.page, pageCount);
      const skip = (normalizedPage - 1) * input.limit;

      return {
        items: filteredClaims.slice(skip, skip + input.limit),
        limit: input.limit,
        page: normalizedPage,
        pageCount,
        stats,
        total,
      };
    }),

  getById: protectedProcedure({
    permissions: {
      device: ['read'],
      license: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/free-trials/{claimId}',
      tags,
    })
    .input(zBackofficeFreeTrialGetInput)
    .output(zBackofficeFreeTrialDetail)
    .handler(async ({ context, input }) => {
      const [claim, freeAccessIpBlocks] = await Promise.all([
        context.db.freeTrialClaim.findUnique({
          select: freeTrialDetailSelect,
          where: {
            id: input.claimId,
          },
        }),
        listFreeAccessIpBlocks({
          dbClient: context.db,
        }),
      ]);

      if (!claim) {
        throw new ORPCError('NOT_FOUND');
      }

      const blockedFreeAccessIps = new Set(
        freeAccessIpBlocks.map((block) => block.ipAddress)
      );
      const [balanceByLicenseId, relatedDevices] = await Promise.all([
        getBalanceByLicenseId(context.db, [claim]),
        getRelatedDevices(context.db, claim),
      ]);
      const deviceByInstallationId = new Map(
        relatedDevices.map((device) => [device.installationId, device])
      );
      const baseClaim = mapClaimForBackoffice(claim, {
        balanceByLicenseId,
        blockedFreeAccessIps,
        deviceByInstallationId,
      });

      return {
        ...baseClaim,
        identities: claim.identities,
        ledgerEntries: claim.license.ledgerEntries,
        networkHistory: claim.identities.filter(
          (identity) => identity.kind === FREE_TRIAL_IDENTITY_KINDS.ipAddress
        ),
        paidOrders: claim.license.orders.map(mapPaidOrder),
        recentJobs: claim.license.jobs,
        relatedDevices,
      };
    }),
};

function buildFreeTrialWhere(input: {
  query: string;
  status:
    | 'all'
    | 'active'
    | 'exhausted'
    | 'has_fingerprint'
    | 'has_ip'
    | 'paid_converted';
}): Prisma.FreeTrialClaimWhereInput {
  const conditions: Prisma.FreeTrialClaimWhereInput[] = [];

  if (input.query) {
    conditions.push({
      OR: [
        {
          deviceFingerprintHash: {
            contains: input.query,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: input.query,
            mode: 'insensitive',
          },
        },
        {
          emailNormalized: {
            contains: input.query.toLowerCase(),
            mode: 'insensitive',
          },
        },
        {
          identities: {
            some: {
              value: {
                contains: input.query,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          installationId: {
            contains: input.query,
            mode: 'insensitive',
          },
        },
        {
          ipAddress: {
            contains: input.query,
            mode: 'insensitive',
          },
        },
        {
          license: {
            key: {
              contains: input.query,
              mode: 'insensitive',
            },
          },
        },
        {
          license: {
            ownerEmail: {
              contains: input.query,
              mode: 'insensitive',
            },
          },
        },
        {
          redeemCode: {
            code: {
              contains: input.query,
              mode: 'insensitive',
            },
          },
        },
      ],
    });
  }

  if (input.status === 'has_ip') {
    conditions.push({
      OR: [
        {
          ipAddress: {
            not: null,
          },
        },
        {
          identities: {
            some: {
              kind: FREE_TRIAL_IDENTITY_KINDS.ipAddress,
            },
          },
        },
      ],
    });
  }

  if (input.status === 'has_fingerprint') {
    conditions.push({
      OR: [
        {
          deviceFingerprintHash: {
            not: null,
          },
        },
        {
          identities: {
            some: {
              kind: FREE_TRIAL_IDENTITY_KINDS.deviceFingerprint,
            },
          },
        },
      ],
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0] ?? {};
  }

  return {
    AND: conditions,
  };
}

async function getBalanceByLicenseId(
  dbClient: {
    tokenLedger: {
      groupBy: (args: Prisma.TokenLedgerGroupByArgs) => Promise<unknown>;
    };
  },
  claims: Array<{ licenseId: string }>
) {
  const uniqueLicenseIds = [
    ...new Set(claims.map((claim) => claim.licenseId).filter(Boolean)),
  ];

  if (uniqueLicenseIds.length === 0) {
    return new Map<string, LicenseTokenBalance>();
  }

  const balances = (await dbClient.tokenLedger.groupBy({
    by: ['licenseId'],
    where: {
      licenseId: {
        in: uniqueLicenseIds,
      },
      OR: [
        {
          status: 'posted',
        },
        {
          status: 'pending',
          type: {
            not: 'job_reserve',
          },
        },
      ],
    },
    _sum: {
      deltaTokens: true,
    },
  })) as Array<{
    _sum: {
      deltaTokens: number | null;
    };
    licenseId: string;
  }>;

  return new Map(
    balances.map((balance) => [
      balance.licenseId,
      {
        availableTokens: balance._sum.deltaTokens ?? 0,
      },
    ])
  );
}

async function getDeviceByInstallationId(
  dbClient: {
    device: {
      findMany: (
        args: Prisma.DeviceFindManyArgs
      ) => Promise<FreeTrialDeviceRecord[]>;
    };
  },
  claims: Array<{ installationId: string }>
) {
  const installationIds = [
    ...new Set(claims.map((claim) => claim.installationId).filter(Boolean)),
  ];

  if (installationIds.length === 0) {
    return new Map<string, FreeTrialDeviceRecord>();
  }

  const devices = await dbClient.device.findMany({
    orderBy: {
      lastSeenAt: 'desc',
    },
    select: freeTrialDeviceSelect,
    where: {
      installationId: {
        in: installationIds,
      },
    },
  });

  return new Map(devices.map((device) => [device.installationId, device]));
}

async function getRelatedDevices(
  dbClient: {
    device: {
      findMany: (
        args: Prisma.DeviceFindManyArgs
      ) => Promise<FreeTrialDeviceRecord[]>;
    };
  },
  claim: Pick<
    FreeTrialDetailRecord,
    'identities' | 'installationId' | 'ipAddress'
  >
) {
  const installationIds = new Set([claim.installationId]);
  const ipAddresses = new Set<string>();

  if (claim.ipAddress) {
    ipAddresses.add(claim.ipAddress);
  }

  for (const identity of claim.identities) {
    if (identity.kind === FREE_TRIAL_IDENTITY_KINDS.installation) {
      installationIds.add(identity.value);
    }

    if (identity.kind === FREE_TRIAL_IDENTITY_KINDS.ipAddress) {
      ipAddresses.add(identity.value);
    }
  }

  return await dbClient.device.findMany({
    orderBy: {
      lastSeenAt: 'desc',
    },
    select: freeTrialDeviceSelect,
    take: 50,
    where: {
      OR: [
        {
          installationId: {
            in: [...installationIds],
          },
        },
        {
          lastIpAddress: {
            in: [...ipAddresses],
          },
        },
      ],
    },
  });
}

function mapClaimForBackoffice(
  claim: FreeTrialListRecord | FreeTrialDetailRecord,
  deps: {
    balanceByLicenseId: Map<string, LicenseTokenBalance>;
    blockedFreeAccessIps: Set<string>;
    deviceByInstallationId: Map<string, FreeTrialDeviceRecord>;
  }
) {
  const availableTokens =
    deps.balanceByLicenseId.get(claim.licenseId)?.availableTokens ?? 0;
  const paidConversion = claim.license.orders.at(0) ?? null;
  const identityCounts = buildIdentityCounts(claim);
  const identityIpAddresses = claim.identities
    .filter((identity) => identity.kind === FREE_TRIAL_IDENTITY_KINDS.ipAddress)
    .map((identity) => identity.value);
  const freeAccessIpBlocked = [claim.ipAddress, ...identityIpAddresses].some(
    (ipAddress) =>
      ipAddress ? deps.blockedFreeAccessIps.has(ipAddress) : false
  );

  return {
    availableTokens,
    createdAt: claim.createdAt,
    device: deps.deviceByInstallationId.get(claim.installationId) ?? null,
    deviceFingerprintHash: claim.deviceFingerprintHash,
    email: claim.email,
    emailNormalized: claim.emailNormalized,
    freeAccessIpBlocked,
    id: claim.id,
    identityCounts,
    installationId: claim.installationId,
    ipAddress: claim.ipAddress,
    license: {
      id: claim.license.id,
      key: claim.license.key,
      ownerEmail: claim.license.ownerEmail,
      status: claim.license.status,
    },
    paidConversion: paidConversion ? mapPaidOrder(paidConversion) : null,
    redeemCode: claim.redeemCode,
    spentTokens: Math.max(0, claim.tokenAmount - Math.max(0, availableTokens)),
    status: paidConversion
      ? ('paid_converted' as const)
      : availableTokens > 0
        ? ('trial_active' as const)
        : ('exhausted' as const),
    tokenAmount: claim.tokenAmount,
    updatedAt: claim.updatedAt,
  };
}

function mapPaidOrder(order: FreeTrialListRecord['license']['orders'][number]) {
  return {
    amountTotalCents: order.amountTotalCents,
    billingPeriodEnd: order.billingPeriodEnd,
    currency: order.currency,
    id: order.id,
    paidAt: order.paidAt,
    payerEmail: order.payerEmail,
    status: order.status,
    tokenPackName: order.tokenPack?.name ?? null,
  };
}

function buildIdentityCounts(
  claim: Pick<
    FreeTrialListRecord,
    | 'deviceFingerprintHash'
    | 'emailNormalized'
    | 'identities'
    | 'installationId'
    | 'ipAddress'
  >
) {
  const emails = new Set([claim.emailNormalized]);
  const installations = new Set([claim.installationId]);
  const ipAddresses = new Set(claim.ipAddress ? [claim.ipAddress] : []);
  const deviceFingerprints = new Set(
    claim.deviceFingerprintHash ? [claim.deviceFingerprintHash] : []
  );

  for (const identity of claim.identities) {
    if (identity.kind === FREE_TRIAL_IDENTITY_KINDS.email) {
      emails.add(identity.value);
    }

    if (identity.kind === FREE_TRIAL_IDENTITY_KINDS.installation) {
      installations.add(identity.value);
    }

    if (identity.kind === FREE_TRIAL_IDENTITY_KINDS.ipAddress) {
      ipAddresses.add(identity.value);
    }

    if (identity.kind === FREE_TRIAL_IDENTITY_KINDS.deviceFingerprint) {
      deviceFingerprints.add(identity.value);
    }
  }

  return {
    deviceFingerprints: deviceFingerprints.size,
    emails: emails.size,
    installations: installations.size,
    ipAddresses: ipAddresses.size,
    total:
      deviceFingerprints.size +
      emails.size +
      installations.size +
      ipAddresses.size,
  };
}

function buildStats(claims: Array<ReturnType<typeof mapClaimForBackoffice>>) {
  return {
    active: claims.filter((claim) => claim.status === 'trial_active').length,
    exhausted: claims.filter((claim) => claim.status === 'exhausted').length,
    paidConverted: claims.filter((claim) => claim.status === 'paid_converted')
      .length,
    total: claims.length,
    withFingerprint: claims.filter(
      (claim) => claim.identityCounts.deviceFingerprints > 0
    ).length,
    withIp: claims.filter((claim) => claim.identityCounts.ipAddresses > 0)
      .length,
  };
}

function matchesStatusFilter(
  claim: ReturnType<typeof mapClaimForBackoffice>,
  status:
    | 'all'
    | 'active'
    | 'exhausted'
    | 'has_fingerprint'
    | 'has_ip'
    | 'paid_converted'
) {
  switch (status) {
    case 'active':
      return claim.status === 'trial_active';
    case 'exhausted':
      return claim.status === 'exhausted';
    case 'has_fingerprint':
      return claim.identityCounts.deviceFingerprints > 0;
    case 'has_ip':
      return claim.identityCounts.ipAddresses > 0;
    case 'paid_converted':
      return claim.status === 'paid_converted';
    case 'all':
    default:
      return true;
  }
}
