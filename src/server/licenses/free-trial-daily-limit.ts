import { createHash } from 'node:crypto';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { hasPaidLicenseEntitlement } from '@/server/licenses/paid-entitlement';

export const FREE_TRIAL_DAILY_CHAPTER_LIMIT = 2;

const FREE_TRIAL_DAILY_USAGE_LOCK_NAMESPACE = 74_224_302;
const MANGA_PAGE_USAGE_IDEMPOTENCY_PREFIX = 'free-trial-daily:manga-page:v1';
const LEGACY_MANGA_PAGE_SPEND_IDEMPOTENCY_PREFIX = 'manga-page-spend';

type FreeTrialDailyLimitActor = {
  deviceId: string;
  licenseId: string;
};

export type FreeTrialDailyLimitScope = {
  claimId: string;
  dayEnd: Date;
  dayStart: Date;
  licenseId: string;
  now: Date;
};

type MangaPageDailyUsageRequest = {
  chapters: Array<{
    key: string;
    name: string;
    url: string;
  }>;
  manga: {
    url: string;
  };
  sourceId: string;
  targetLanguage: string;
};

type FreeTrialDailyLimitTx = {
  $queryRaw?: <T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
  order: {
    findFirst: (args: {
      where: {
        licenseId: string;
        paidAt: {
          not: null;
        };
        status: 'paid';
        OR: Array<
          | {
              lsSubscriptionId: null;
            }
          | {
              billingPeriodEnd: null;
            }
          | {
              billingPeriodEnd: {
                gt: Date;
              };
            }
        >;
      };
      select: {
        id: true;
      };
    }) => Promise<{ id: string } | null>;
  };
  tokenLedger?: {
    createMany: (args: {
      data: Array<{
        deltaTokens: number;
        description: string;
        deviceId: string;
        idempotencyKey: string;
        licenseId: string;
        metadata: Prisma.InputJsonObject;
        status: 'pending';
        type: 'job_reserve';
      }>;
      skipDuplicates: true;
    }) => Promise<unknown>;
  };
  translationJob: {
    count: (args: {
      where: {
        createdAt: {
          gte: Date;
          lt: Date;
        };
        licenseId: string;
      };
    }) => Promise<number>;
  };
};

export type FreeTrialDailyUsageReservation = {
  idempotencyKey: string;
};

export class FreeTrialDailyLimitError extends Error {
  constructor(
    readonly details: {
      dailyLimit: number;
      remainingChapters: number;
      requestedChapters: number;
      resetsAt: string;
      usedChapters: number;
    }
  ) {
    super('free_trial_daily_limit_exceeded');
    this.name = 'FreeTrialDailyLimitError';
  }

  readonly code = 'free_trial_daily_limit_exceeded';
  readonly statusCode = 429;
}

export async function resolveFreeTrialDailyLimitScope(input: {
  dbClient: typeof db;
  licenseId: string;
  now: Date;
}): Promise<FreeTrialDailyLimitScope | null> {
  const freeTrialClaim = await input.dbClient.freeTrialClaim.findUnique({
    where: {
      licenseId: input.licenseId,
    },
    select: {
      id: true,
    },
  });

  if (!freeTrialClaim) {
    return null;
  }

  const hasPaidEntitlement = await hasPaidLicenseEntitlement(
    {
      licenseId: input.licenseId,
      now: input.now,
    },
    {
      dbClient: input.dbClient,
    }
  );

  if (hasPaidEntitlement) {
    return null;
  }

  const dayStart = getUtcDayStart(input.now);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return {
    claimId: freeTrialClaim.id,
    dayEnd,
    dayStart,
    licenseId: input.licenseId,
    now: input.now,
  };
}

export async function enforceFreeTrialDailyChapterLimit(input: {
  actor: FreeTrialDailyLimitActor;
  requestedChapters?: number;
  scope: FreeTrialDailyLimitScope | null;
  tx: FreeTrialDailyLimitTx;
}) {
  if (!input.scope) {
    return;
  }

  await assertFreeTrialDailyUsageAvailable({
    actor: input.actor,
    requestedChapters: input.requestedChapters ?? 1,
    scope: input.scope,
    tx: input.tx,
  });
}

export async function reserveFreeTrialDailyMangaPageUsage(input: {
  actor: FreeTrialDailyLimitActor;
  request: MangaPageDailyUsageRequest;
  scope: FreeTrialDailyLimitScope | null;
  tx: FreeTrialDailyLimitTx;
}): Promise<FreeTrialDailyUsageReservation | null> {
  if (!input.scope) {
    return null;
  }

  const requestedChapters = countUniqueMangaPageChapters(input.request);

  if (requestedChapters <= 0) {
    return null;
  }

  const idempotencyKey = buildMangaPageUsageIdempotencyKey({
    licenseId: input.actor.licenseId,
    request: input.request,
    scope: input.scope,
  });

  if (!input.tx.tokenLedger) {
    await assertFreeTrialDailyUsageAvailable({
      actor: input.actor,
      excludeMangaPageReservationKey: idempotencyKey,
      requestedChapters,
      scope: input.scope,
      tx: input.tx,
    });
    return null;
  }

  await assertFreeTrialDailyUsageAvailable({
    actor: input.actor,
    excludeMangaPageReservationKey: idempotencyKey,
    requestedChapters,
    scope: input.scope,
    tx: input.tx,
  });

  await input.tx.tokenLedger.createMany({
    data: [
      {
        deltaTokens: 0,
        description: 'Reserved free trial daily manga page usage',
        deviceId: input.actor.deviceId,
        idempotencyKey,
        licenseId: input.actor.licenseId,
        metadata: {
          chapterCount: requestedChapters,
          dayStart: input.scope.dayStart.toISOString(),
          freeTrialClaimId: input.scope.claimId,
          source: 'manga_page_translation',
        } satisfies Prisma.InputJsonObject,
        status: 'pending',
        type: 'job_reserve',
      },
    ],
    skipDuplicates: true,
  });

  return {
    idempotencyKey,
  };
}

export async function markFreeTrialDailyUsageReservationPosted(input: {
  dbClient?: typeof db;
  reservation: FreeTrialDailyUsageReservation | null;
}) {
  if (!input.reservation) {
    return;
  }

  const dbClient = input.dbClient ?? db;

  await dbClient.tokenLedger.updateMany({
    where: {
      idempotencyKey: input.reservation.idempotencyKey,
      status: 'pending',
    },
    data: {
      status: 'posted',
    },
  });
}

export async function voidFreeTrialDailyUsageReservation(input: {
  dbClient?: typeof db;
  reservation: FreeTrialDailyUsageReservation | null;
}) {
  if (!input.reservation) {
    return;
  }

  const dbClient = input.dbClient ?? db;

  await dbClient.tokenLedger.updateMany({
    where: {
      idempotencyKey: input.reservation.idempotencyKey,
      status: 'pending',
    },
    data: {
      status: 'voided',
    },
  });
}

async function assertFreeTrialDailyUsageAvailable(input: {
  actor: FreeTrialDailyLimitActor;
  excludeMangaPageReservationKey?: string;
  requestedChapters: number;
  scope: FreeTrialDailyLimitScope;
  tx: FreeTrialDailyLimitTx;
}) {
  const hasPaidEntitlement = await hasPaidLicenseEntitlementForJobTx(input.tx, {
    licenseId: input.scope.licenseId,
    now: input.scope.now,
  });

  if (hasPaidEntitlement) {
    return;
  }

  await acquireFreeTrialDailyUsageLock(input.tx, input.scope);

  const usedChapters = await countFreeTrialDailyUsedChapters({
    actor: input.actor,
    excludeMangaPageReservationKey: input.excludeMangaPageReservationKey,
    scope: input.scope,
    tx: input.tx,
  });
  const remainingChapters = Math.max(
    FREE_TRIAL_DAILY_CHAPTER_LIMIT - usedChapters,
    0
  );

  if (
    input.requestedChapters > 0 &&
    usedChapters + input.requestedChapters > FREE_TRIAL_DAILY_CHAPTER_LIMIT
  ) {
    throw new FreeTrialDailyLimitError({
      dailyLimit: FREE_TRIAL_DAILY_CHAPTER_LIMIT,
      remainingChapters,
      requestedChapters: input.requestedChapters,
      resetsAt: input.scope.dayEnd.toISOString(),
      usedChapters,
    });
  }
}

async function countFreeTrialDailyUsedChapters(input: {
  actor: FreeTrialDailyLimitActor;
  excludeMangaPageReservationKey?: string;
  scope: FreeTrialDailyLimitScope;
  tx: FreeTrialDailyLimitTx;
}) {
  const translationJobChapters = await input.tx.translationJob.count({
    where: {
      createdAt: {
        gte: input.scope.dayStart,
        lt: input.scope.dayEnd,
      },
      licenseId: input.actor.licenseId,
    },
  });
  const mangaPageChapters = await countMangaPageDailyUsageChapters(
    input.tx,
    input.scope,
    input.excludeMangaPageReservationKey
  );

  return translationJobChapters + mangaPageChapters;
}

async function countMangaPageDailyUsageChapters(
  tx: FreeTrialDailyLimitTx,
  scope: FreeTrialDailyLimitScope,
  excludeMangaPageReservationKey?: string
) {
  if (!tx.$queryRaw || !tx.tokenLedger) {
    return 0;
  }

  const excludedReservationKey = excludeMangaPageReservationKey ?? '';
  const rows = await tx.$queryRaw<Array<{ chapterCount: bigint | number }>>`
    WITH free_trial_markers AS (
      SELECT COALESCE(SUM(
        CASE
          WHEN jsonb_typeof("metadata" -> 'chapterCount') = 'number'
          THEN ("metadata" ->> 'chapterCount')::integer
          ELSE 0
        END
      ), 0)::integer AS "chapterCount"
      FROM "token_ledger"
      WHERE "licenseId" = ${scope.licenseId}
        AND "createdAt" >= ${scope.dayStart}
        AND "createdAt" < ${scope.dayEnd}
        AND "idempotencyKey" LIKE ${`${MANGA_PAGE_USAGE_IDEMPOTENCY_PREFIX}:%`}
        AND "idempotencyKey" <> ${excludedReservationKey}
        AND "status" IN ('pending', 'posted')
    ),
    legacy_spend AS (
      SELECT COALESCE(SUM(
        CASE
          WHEN jsonb_typeof("metadata" -> 'chapterCount') = 'number'
          THEN ("metadata" ->> 'chapterCount')::integer
          WHEN jsonb_typeof("metadata" -> 'chapters') = 'array'
          THEN jsonb_array_length("metadata" -> 'chapters')
          ELSE 0
        END
      ), 0)::integer AS "chapterCount"
      FROM "token_ledger"
      WHERE "licenseId" = ${scope.licenseId}
        AND "createdAt" >= ${scope.dayStart}
        AND "createdAt" < ${scope.dayEnd}
        AND "idempotencyKey" LIKE ${`${LEGACY_MANGA_PAGE_SPEND_IDEMPOTENCY_PREFIX}:%`}
        AND "status" = 'posted'
        AND "type" = 'job_spend'
        AND NOT ("metadata" ? 'freeTrialDailyUsageIdempotencyKey')
    )
    SELECT (
      (SELECT "chapterCount" FROM free_trial_markers) +
      (SELECT "chapterCount" FROM legacy_spend)
    )::integer AS "chapterCount"
  `;

  return Number(rows[0]?.chapterCount ?? 0);
}

async function acquireFreeTrialDailyUsageLock(
  tx: FreeTrialDailyLimitTx,
  scope: FreeTrialDailyLimitScope
) {
  if (!tx.$queryRaw) {
    return;
  }

  const lockKey = `${scope.claimId}:${scope.dayStart.toISOString()}`;

  await tx.$queryRaw`
    WITH lock AS (
      SELECT pg_advisory_xact_lock(
        ${FREE_TRIAL_DAILY_USAGE_LOCK_NAMESPACE}::integer,
        hashtext(${lockKey})::integer
      )
    )
    SELECT true AS "locked"
    FROM lock
  `;
}

function getUtcDayStart(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

async function hasPaidLicenseEntitlementForJobTx(
  tx: FreeTrialDailyLimitTx,
  input: {
    licenseId: string;
    now: Date;
  }
) {
  const paidOrder = await tx.order.findFirst({
    where: {
      licenseId: input.licenseId,
      paidAt: {
        not: null,
      },
      status: 'paid',
      OR: [
        {
          lsSubscriptionId: null,
        },
        {
          billingPeriodEnd: null,
        },
        {
          billingPeriodEnd: {
            gt: input.now,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(paidOrder);
}

function countUniqueMangaPageChapters(request: MangaPageDailyUsageRequest) {
  return new Set(
    request.chapters.map(
      (chapter) => `${chapter.key.trim()}:${chapter.url.trim()}`
    )
  ).size;
}

function buildMangaPageUsageIdempotencyKey(input: {
  licenseId: string;
  request: MangaPageDailyUsageRequest;
  scope: FreeTrialDailyLimitScope;
}) {
  const chapterKeys = input.request.chapters
    .map((chapter) => ({
      key: chapter.key.trim(),
      url: chapter.url.trim(),
    }))
    .sort((left, right) =>
      `${left.key}:${left.url}`.localeCompare(`${right.key}:${right.url}`)
    );
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        chapterKeys,
        dayStart: input.scope.dayStart.toISOString(),
        licenseId: input.licenseId,
        mangaUrl: input.request.manga.url.trim(),
        sourceId: input.request.sourceId.trim(),
        targetLanguage: input.request.targetLanguage.trim().toLowerCase(),
      })
    )
    .digest('hex');

  return `${MANGA_PAGE_USAGE_IDEMPOTENCY_PREFIX}:${digest}`;
}
