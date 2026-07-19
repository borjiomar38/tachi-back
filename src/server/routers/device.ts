import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import { Prisma } from '@/server/db/generated/client';
import {
  zBackofficeDeviceListInput,
  zBackofficeDeviceListResponse,
  zBackofficeVersionSummary,
} from '@/server/jobs/backoffice-schema';
import { zTranslationChapterIdentity } from '@/server/jobs/schema';
import {
  listFreeAccessIpBlocks,
  removeFreeAccessIpBlock,
  upsertFreeAccessIpBlock,
} from '@/server/licenses/free-access-ip-block';
import { revokeDeviceActivation } from '@/server/licenses/revoke-device';
import {
  zBackofficeDeviceDetail,
  zRevokeDeviceInput,
  zRevokeDeviceResponse,
  zSetExtensionBlockInput,
  zSetExtensionBlockResponse,
} from '@/server/licenses/schema';
import { getPublicMobileAppUpdatePolicy } from '@/server/mobile-update-policy';
import { protectedProcedure } from '@/server/orpc';
import { setExtensionBlocked } from '@/server/services/extension-access-policy';

const tags = ['devices'];
const VERSION_ACTIVITY_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type MetadataRecord = Record<string, unknown>;

const zFreeAccessIpBlockInput = z.object({
  ipAddress: z.string().trim().min(1).max(128),
  reason: z.string().trim().max(300).optional(),
});

const zFreeAccessIpBlockOutput = z.object({
  blockedAt: z.string(),
  ipAddress: z.string(),
  message: z.string(),
  pricingUrl: z.string(),
  reason: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const zFreeAccessIpUnblockOutput = z.object({
  ipAddress: z.string(),
  removed: z.boolean(),
});

type ReadingActivityItem = {
  activityAt: Date;
  chapterCount: number | null;
  chapterName: string | null;
  chapterNumber: string | null;
  chapterUrl: string | null;
  chapters: Array<{
    name: string;
    number: string | null;
    url: string | null;
  }>;
  completedAt: Date | null;
  createdAt: Date;
  id: string;
  jobId: string | null;
  ledgerEntryId: string | null;
  mangaTitle: string | null;
  mangaUrl: string | null;
  pageCount: number | null;
  sourceLanguage: string | null;
  sourceName: string | null;
  sourceType: 'chapter_translation' | 'manga_page_translation';
  spentTokens: number | null;
  status: string;
  targetLanguage: string | null;
};

type VersionCountGroup = {
  appBuild: string | null;
  appVersion: string | null;
  _count: {
    _all: number;
  };
};

type VersionStatsGroup = VersionCountGroup & {
  _max: {
    lastSeenAt: Date | null;
  };
  _min: {
    createdAt: Date | null;
  };
};

const COUNTRY_METADATA_PATHS = [
  ['country'],
  ['countryCode'],
  ['country_code'],
  ['countryIso'],
  ['countryIsoCode'],
  ['geo', 'country'],
  ['geo', 'countryCode'],
  ['geo', 'country_code'],
  ['geo', 'countryIso'],
  ['location', 'country'],
  ['location', 'countryCode'],
  ['location', 'country_code'],
] as const;

function resolveCountryFromMetadata(input: {
  locale: string | null;
  metadata: unknown;
}): string | null {
  const metadataCountry = readStringFromMetadata(
    input.metadata,
    COUNTRY_METADATA_PATHS.map((path) => [...path])
  );

  if (metadataCountry) {
    return metadataCountry;
  }

  return input.locale ? parseCountryFromLocale(input.locale) : null;
}

function parseCountryFromLocale(locale: string) {
  const segments = locale.trim().split(/[-_]/);
  const candidate = segments.at(-1);
  if (!candidate) {
    return null;
  }

  return candidate.length === 2 ? candidate.toUpperCase() : candidate;
}

function resolveDeviceCoordinates(
  metadata: unknown
): [number | null, number | null] {
  const latitude = parseNumericCoordinate(
    readFirstMetadataValue(metadata, [
      ['latitude'],
      ['lat'],
      ['geo', 'latitude'],
      ['geo', 'lat'],
      ['location', 'latitude'],
      ['location', 'lat'],
      ['coordinates', 'latitude'],
      ['coordinates', 'lat'],
      ['position', 'latitude'],
      ['position', 'lat'],
    ]),
    -90,
    90
  );

  const longitude = parseNumericCoordinate(
    readFirstMetadataValue(metadata, [
      ['longitude'],
      ['lng'],
      ['lon'],
      ['long'],
      ['geo', 'longitude'],
      ['geo', 'lng'],
      ['geo', 'lon'],
      ['geo', 'long'],
      ['location', 'longitude'],
      ['location', 'lng'],
      ['location', 'lon'],
      ['location', 'long'],
      ['coordinates', 'longitude'],
      ['coordinates', 'lng'],
      ['coordinates', 'lon'],
      ['coordinates', 'long'],
      ['position', 'longitude'],
      ['position', 'lng'],
      ['position', 'lon'],
      ['position', 'long'],
    ]),
    -180,
    180
  );

  return [latitude, longitude];
}

function resolveAvatarUrl(metadata: unknown): string | null {
  return readStringFromMetadata(metadata, [
    ['avatar'],
    ['avatarUrl'],
    ['avatar_url'],
    ['userAvatar'],
    ['userAvatarUrl'],
    ['profile', 'avatar'],
    ['profile', 'avatarUrl'],
    ['profile', 'image'],
    ['profile', 'imageUrl'],
    ['owner', 'avatar'],
    ['owner', 'avatarUrl'],
    ['owner', 'image'],
    ['owner', 'imageUrl'],
    ['user', 'avatar'],
    ['user', 'avatarUrl'],
    ['user', 'image'],
    ['user', 'imageUrl'],
  ]);
}

function readStringFromMetadata(
  metadata: unknown,
  paths: string[][]
): string | null {
  for (const path of paths) {
    const value = readMetadataValue(metadata, path);
    const asString = parseString(value);
    if (asString) {
      return asString;
    }
  }

  return null;
}

function readFirstMetadataValue(metadata: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = readMetadataValue(metadata, path);
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function readMetadataValue(metadata: unknown, path: string[]) {
  let current = metadata;

  for (const key of path) {
    if (!isMetadataRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

function isMetadataRecord(value: unknown): value is MetadataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNumericCoordinate(
  value: unknown,
  min: number,
  max: number
): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= min && value <= max
      ? value
      : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function compactAndWhere(
  conditions: Array<Prisma.DeviceWhereInput | null>
): Prisma.DeviceWhereInput {
  const nextConditions = conditions.filter(
    (condition): condition is Prisma.DeviceWhereInput => Boolean(condition)
  );

  if (nextConditions.length === 0) {
    return {};
  }

  if (nextConditions.length === 1) {
    return nextConditions[0] ?? {};
  }

  return {
    AND: nextConditions,
  };
}

function buildCountryWhere(country: string): Prisma.DeviceWhereInput | null {
  const normalized = country.trim();
  if (!normalized || normalized === 'all') {
    return null;
  }

  const countryCode = normalized.length === 2 ? normalized.toUpperCase() : null;
  const countrySearchValues = [
    normalized,
    normalized.toUpperCase(),
    normalized.toLowerCase(),
    ...(countryCode ? [countryCode] : []),
  ].filter((value, index, self) => self.indexOf(value) === index);

  return {
    OR: [
      ...(countryCode
        ? [
            {
              locale: {
                endsWith: `-${countryCode}`,
                mode: 'insensitive' as const,
              },
            },
            {
              locale: {
                endsWith: `_${countryCode}`,
                mode: 'insensitive' as const,
              },
            },
            {
              locale: {
                equals: countryCode,
                mode: 'insensitive' as const,
              },
            },
          ]
        : [
            {
              locale: {
                contains: normalized,
                mode: 'insensitive' as const,
              },
            },
          ]),
      ...COUNTRY_METADATA_PATHS.flatMap((path) =>
        countrySearchValues.map((value) => ({
          metadata: {
            path: [...path],
            string_contains: value,
          },
        }))
      ),
    ],
  };
}

function buildReadingActivity(input: {
  jobs: Array<{
    chapterIdentity: unknown;
    completedAt: Date | null;
    createdAt: Date;
    failedAt: Date | null;
    id: string;
    pageCount: number;
    sourceLanguage: string;
    spentTokens: number;
    startedAt: Date | null;
    status: string;
    targetLanguage: string;
    updatedAt: Date;
  }>;
  ledgerEntries: Array<{
    createdAt: Date;
    deltaTokens: number;
    id: string;
    metadata: unknown;
    status: string;
  }>;
}) {
  const jobActivities = input.jobs.map((job) => {
    const identity = normalizeActivityChapterIdentity(job.chapterIdentity);
    const chapterName = identity?.chapterName ?? null;
    const chapterUrl = identity?.chapterUrl ?? null;
    const chapterNumber = resolveChapterNumber({
      chapterName,
      chapterUrl,
    });

    return {
      activityAt:
        job.completedAt ?? job.failedAt ?? job.startedAt ?? job.updatedAt,
      chapterCount: chapterName || chapterUrl ? 1 : null,
      chapterName,
      chapterNumber,
      chapterUrl,
      chapters:
        chapterName || chapterUrl
          ? [
              {
                name: chapterName ?? chapterUrl ?? 'Unknown chapter',
                number: chapterNumber,
                url: chapterUrl,
              },
            ]
          : [],
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      id: `job:${job.id}`,
      jobId: job.id,
      ledgerEntryId: null,
      mangaTitle: identity?.mangaTitle ?? null,
      mangaUrl: identity?.mangaUrl ?? null,
      pageCount: job.pageCount,
      sourceLanguage: job.sourceLanguage,
      sourceName: identity?.sourceName ?? null,
      sourceType: 'chapter_translation' as const,
      spentTokens: job.spentTokens,
      status: job.status,
      targetLanguage: job.targetLanguage,
    } satisfies ReadingActivityItem;
  });

  const mangaPageActivities = input.ledgerEntries
    .map((entry) => buildMangaPageReadingActivity(entry))
    .filter((item): item is ReadingActivityItem => Boolean(item));

  return [...jobActivities, ...mangaPageActivities]
    .sort(
      (left, right) => right.activityAt.getTime() - left.activityAt.getTime()
    )
    .slice(0, 40);
}

function buildMangaPageReadingActivity(entry: {
  createdAt: Date;
  deltaTokens: number;
  id: string;
  metadata: unknown;
  status: string;
}): ReadingActivityItem | null {
  if (!isMetadataRecord(entry.metadata)) {
    return null;
  }

  const mangaTitle = parseString(entry.metadata.mangaTitle);
  const chapters = readActivityChapters(entry.metadata);
  const sourceLanguage = parseString(entry.metadata.sourceLanguage);
  const targetLanguage = parseString(entry.metadata.targetLanguage);

  if (!mangaTitle && chapters.length === 0 && !targetLanguage) {
    return null;
  }

  const firstChapter = chapters.at(0) ?? null;
  const chapterCount =
    parseNonNegativeInteger(entry.metadata.chapterCount) ?? chapters.length;

  return {
    activityAt: entry.createdAt,
    chapterCount,
    chapterName: firstChapter?.name ?? null,
    chapterNumber: firstChapter?.number ?? null,
    chapterUrl: firstChapter?.url ?? null,
    chapters,
    completedAt: entry.createdAt,
    createdAt: entry.createdAt,
    id: `ledger:${entry.id}`,
    jobId: null,
    ledgerEntryId: entry.id,
    mangaTitle,
    mangaUrl: parseString(entry.metadata.mangaUrl),
    pageCount: null,
    sourceLanguage,
    sourceName: parseString(entry.metadata.sourceName),
    sourceType: 'manga_page_translation',
    spentTokens: Math.abs(entry.deltaTokens),
    status: entry.status,
    targetLanguage,
  };
}

function normalizeActivityChapterIdentity(rawIdentity: unknown) {
  const parsed = zTranslationChapterIdentity.safeParse(rawIdentity);

  if (!parsed.success) {
    return null;
  }

  return {
    chapterName: parsed.data.chapterName?.trim() || null,
    chapterUrl: parsed.data.chapterUrl.trim(),
    mangaTitle: parsed.data.mangaTitle?.trim() || null,
    mangaUrl: parsed.data.mangaUrl?.trim() || null,
    sourceName: parsed.data.sourceName?.trim() || null,
  };
}

function readActivityChapters(metadata: MetadataRecord) {
  const rawChapters = metadata.chapters;

  if (!Array.isArray(rawChapters)) {
    return [];
  }

  return rawChapters
    .map((chapter) => {
      if (!isMetadataRecord(chapter)) {
        return null;
      }

      const name =
        parseString(chapter.name) ??
        parseString(chapter.title) ??
        parseString(chapter.key) ??
        parseString(chapter.url);
      const url = parseString(chapter.url);

      if (!name) {
        return null;
      }

      return {
        name,
        number:
          parseString(chapter.number) ??
          resolveChapterNumber({
            chapterName: name,
            chapterUrl: url,
          }),
        url,
      };
    })
    .filter(
      (
        chapter
      ): chapter is {
        name: string;
        number: string | null;
        url: string | null;
      } => Boolean(chapter)
    )
    .slice(0, 20);
}

function resolveChapterNumber(input: {
  chapterName: string | null;
  chapterUrl: string | null;
}) {
  for (const value of [input.chapterName, input.chapterUrl]) {
    if (!value) {
      continue;
    }

    const match =
      value.match(
        /(?:chapter|chap|ch\.?|episode|ep\.?|cap[ií]tulo)\s*#?\s*([0-9]+(?:[.,][0-9]+)?)/i
      ) ??
      value.match(/第\s*([0-9]+(?:[.,][0-9]+)?)/i) ??
      value.match(/(?:^|[/\s_-])([0-9]+(?:[.,][0-9]+)?)(?:$|[/\s_-])/);

    if (match?.[1]) {
      return match[1].replace(',', '.');
    }
  }

  return null;
}

function parseNonNegativeInteger(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function buildVersionGroupKey(input: {
  appBuild: string | null;
  appVersion: string | null;
}) {
  return JSON.stringify([input.appVersion, input.appBuild]);
}

function buildVersionCountMap(groups: VersionCountGroup[]) {
  const counts = new Map<string, number>();

  for (const group of groups) {
    counts.set(buildVersionGroupKey(group), group._count._all);
  }

  return counts;
}

function parseVersionCode(appBuild: string | null) {
  const normalized = appBuild?.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function resolveVersionSupportStatus(input: {
  appVersion: string | null;
  latestVersionCode: number;
  latestVersionName: string | null;
  minimumSupportedVersionCode: number;
  versionCode: number | null;
}) {
  if (input.latestVersionName && input.appVersion === input.latestVersionName) {
    return 'latest' as const;
  }

  if (input.versionCode === null) {
    return 'unknown' as const;
  }

  if (
    input.minimumSupportedVersionCode > 0 &&
    input.versionCode < input.minimumSupportedVersionCode
  ) {
    return 'unsupported' as const;
  }

  if (
    input.latestVersionCode > 0 &&
    input.versionCode === input.latestVersionCode
  ) {
    return 'latest' as const;
  }

  if (
    input.latestVersionCode > 0 &&
    input.versionCode > input.latestVersionCode
  ) {
    return 'ahead' as const;
  }

  if (
    input.latestVersionCode > 0 &&
    input.versionCode < input.latestVersionCode
  ) {
    return 'outdated' as const;
  }

  return 'supported' as const;
}

function compareInstalledVersions(
  left: z.infer<typeof zBackofficeVersionSummary>['versions'][number],
  right: z.infer<typeof zBackofficeVersionSummary>['versions'][number]
) {
  const leftCode = left.versionCode ?? -1;
  const rightCode = right.versionCode ?? -1;

  if (leftCode !== rightCode) {
    return rightCode - leftCode;
  }

  if (left.installCount !== right.installCount) {
    return right.installCount - left.installCount;
  }

  return (right.lastSeenAt?.getTime() ?? 0) - (left.lastSeenAt?.getTime() ?? 0);
}

export default {
  getVersionSummary: protectedProcedure({
    permissions: {
      device: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/devices/version-summary',
      tags,
    })
    .output(zBackofficeVersionSummary)
    .handler(async ({ context }) => {
      const generatedAt = new Date();
      const activeSince = new Date(
        generatedAt.getTime() - VERSION_ACTIVITY_WINDOW_DAYS * MS_PER_DAY
      );

      const [policy, versionGroups, activeGroups, linkedGroups] =
        await Promise.all([
          getPublicMobileAppUpdatePolicy(),
          context.db.device.groupBy({
            by: ['appVersion', 'appBuild'],
            _count: {
              _all: true,
            },
            _max: {
              lastSeenAt: true,
            },
            _min: {
              createdAt: true,
            },
          }),
          context.db.device.groupBy({
            by: ['appVersion', 'appBuild'],
            _count: {
              _all: true,
            },
            where: {
              lastSeenAt: {
                gte: activeSince,
              },
            },
          }),
          context.db.device.groupBy({
            by: ['appVersion', 'appBuild'],
            _count: {
              _all: true,
            },
            where: {
              licenseBindings: {
                some: {
                  status: 'active' as const,
                },
              },
            },
          }),
        ]);

      const activeCountByVersion = buildVersionCountMap(activeGroups);
      const linkedCountByVersion = buildVersionCountMap(linkedGroups);

      const versions = (versionGroups as VersionStatsGroup[])
        .map((group) => {
          const key = buildVersionGroupKey(group);
          const versionCode = parseVersionCode(group.appBuild);

          return {
            activeInstallCount: activeCountByVersion.get(key) ?? 0,
            appBuild: group.appBuild,
            appVersion: group.appVersion,
            firstSeenAt: group._min.createdAt,
            installCount: group._count._all,
            lastSeenAt: group._max.lastSeenAt,
            linkedInstallCount: linkedCountByVersion.get(key) ?? 0,
            status: resolveVersionSupportStatus({
              appVersion: group.appVersion,
              latestVersionCode: policy.latestVersionCode,
              latestVersionName: policy.latestVersionName,
              minimumSupportedVersionCode: policy.minimumSupportedVersionCode,
              versionCode,
            }),
            versionCode,
          };
        })
        .sort(compareInstalledVersions);

      const stats = versions.reduce(
        (accumulator, version) => {
          const isOutdated =
            version.status === 'outdated' || version.status === 'unsupported';

          return {
            activeInstallCount:
              accumulator.activeInstallCount + version.activeInstallCount,
            latestInstallCount:
              accumulator.latestInstallCount +
              (version.status === 'latest' ? version.installCount : 0),
            linkedInstallCount:
              accumulator.linkedInstallCount + version.linkedInstallCount,
            outdatedInstallCount:
              accumulator.outdatedInstallCount +
              (isOutdated ? version.installCount : 0),
            totalInstallCount:
              accumulator.totalInstallCount + version.installCount,
            unknownVersionInstallCount:
              accumulator.unknownVersionInstallCount +
              (version.status === 'unknown' ? version.installCount : 0),
            unsupportedInstallCount:
              accumulator.unsupportedInstallCount +
              (version.status === 'unsupported' ? version.installCount : 0),
            versionCount: accumulator.versionCount,
          };
        },
        {
          activeInstallCount: 0,
          latestInstallCount: 0,
          linkedInstallCount: 0,
          outdatedInstallCount: 0,
          totalInstallCount: 0,
          unknownVersionInstallCount: 0,
          unsupportedInstallCount: 0,
          versionCount: versions.length,
        }
      );

      return {
        activeSince,
        generatedAt,
        policy: {
          checkedAt: policy.checkedAt,
          forceUpdate: policy.forceUpdate,
          latestVersionCode: policy.latestVersionCode,
          latestVersionName: policy.latestVersionName,
          message: policy.message,
          minimumSupportedVersionCode: policy.minimumSupportedVersionCode,
          releaseUrl: policy.releaseUrl,
          updateUrl: policy.updateUrl,
        },
        stats,
        versions,
      };
    }),

  list: protectedProcedure({
    permissions: {
      device: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/devices',
      tags,
    })
    .input(zBackofficeDeviceListInput)
    .output(zBackofficeDeviceListResponse)
    .handler(async ({ context, input }) => {
      const searchTerm = input.searchTerm.trim();
      const skip = (input.page - 1) * input.limit;
      const searchWhere: Prisma.DeviceWhereInput | null = searchTerm
        ? {
            OR: [
              {
                appBuild: {
                  contains: searchTerm,
                },
              },
              {
                appVersion: {
                  contains: searchTerm,
                },
              },
              {
                installationId: {
                  contains: searchTerm,
                },
              },
              {
                locale: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              ...COUNTRY_METADATA_PATHS.map((path) => ({
                metadata: {
                  path: [...path],
                  string_contains: searchTerm,
                },
              })),
              {
                licenseBindings: {
                  some: {
                    license: {
                      key: {
                        contains: searchTerm,
                      },
                    },
                  },
                },
              },
              {
                licenseBindings: {
                  some: {
                    license: {
                      ownerEmail: {
                        contains: searchTerm,
                        mode: 'insensitive' as const,
                      },
                    },
                  },
                },
              },
              {
                redeemedCodes: {
                  some: {
                    code: {
                      contains: searchTerm,
                    },
                  },
                },
              },
            ],
          }
        : null;
      const statusWhere: Prisma.DeviceWhereInput | null =
        input.status === 'all' ? null : { status: input.status };
      const countryWhere = buildCountryWhere(input.country);
      const baseWhere = compactAndWhere([
        searchWhere,
        statusWhere,
        countryWhere,
      ]);
      const linkedWhere: Prisma.DeviceWhereInput | null =
        input.linked === 'linked'
          ? {
              licenseBindings: {
                some: {
                  status: 'active' as const,
                },
              },
            }
          : input.linked === 'unlinked'
            ? {
                licenseBindings: {
                  none: {
                    status: 'active' as const,
                  },
                },
              }
            : null;
      const where = compactAndWhere([baseWhere, linkedWhere]);

      const [items, total, linkedCount, unlinkedCount, freeAccessIpBlocks] =
        await Promise.all([
          context.db.device.findMany({
            orderBy: [
              {
                lastSeenAt: 'desc',
              },
              {
                createdAt: 'desc',
              },
            ],
            select: {
              appBuild: true,
              appVersion: true,
              metadata: true,
              createdAt: true,
              id: true,
              installationId: true,
              lastIpAddress: true,
              lastSeenAt: true,
              licenseBindings: {
                orderBy: {
                  boundAt: 'desc',
                },
                select: {
                  boundAt: true,
                  license: {
                    select: {
                      id: true,
                      key: true,
                      ownerEmail: true,
                      status: true,
                    },
                  },
                },
                where: {
                  status: 'active' as const,
                },
                take: 1,
              },
              locale: true,
              platform: true,
              redeemedCodes: {
                orderBy: [
                  {
                    redeemedAt: 'desc',
                  },
                  {
                    createdAt: 'desc',
                  },
                ],
                select: {
                  code: true,
                  redeemedAt: true,
                  status: true,
                },
                take: 1,
              },
              status: true,
            },
            take: input.limit,
            skip,
            where,
          }),
          context.db.device.count({
            where,
          }),
          context.db.device.count({
            where: {
              ...baseWhere,
              licenseBindings: {
                some: {
                  status: 'active' as const,
                },
              },
            },
          }),
          context.db.device.count({
            where: {
              ...baseWhere,
              licenseBindings: {
                none: {
                  status: 'active',
                },
              },
            },
          }),
          listFreeAccessIpBlocks({
            dbClient: context.db,
          }),
        ]);
      const blockedFreeAccessIpSet = new Set(
        freeAccessIpBlocks.map((block) => block.ipAddress)
      );

      const ipAddresses = [
        ...new Set(
          items
            .map((device) => device.lastIpAddress)
            .filter((value): value is string => !!value)
        ),
      ];
      const sameIpCounts = new Map<string, number>();
      const sameIpOwnerEmails = new Map<string, string[]>();

      if (ipAddresses.length > 0) {
        const [ipGroups, ipPeers] = await Promise.all([
          context.db.device.groupBy({
            by: ['lastIpAddress'],
            where: {
              lastIpAddress: {
                in: ipAddresses,
              },
            },
            _count: {
              _all: true,
            },
          }),
          context.db.device.findMany({
            where: {
              lastIpAddress: {
                in: ipAddresses,
              },
            },
            select: {
              lastIpAddress: true,
              licenseBindings: {
                where: {
                  status: 'active' as const,
                },
                orderBy: {
                  boundAt: 'desc',
                },
                take: 1,
                select: {
                  license: {
                    select: {
                      ownerEmail: true,
                    },
                  },
                },
              },
            },
          }),
        ]);

        for (const group of ipGroups) {
          if (group.lastIpAddress) {
            sameIpCounts.set(group.lastIpAddress, group._count._all);
          }
        }

        for (const peer of ipPeers) {
          const email = peer.licenseBindings.at(0)?.license.ownerEmail;
          if (!peer.lastIpAddress || !email) {
            continue;
          }

          const emails = sameIpOwnerEmails.get(peer.lastIpAddress) ?? [];
          if (!emails.includes(email)) {
            emails.push(email);
            sameIpOwnerEmails.set(peer.lastIpAddress, emails);
          }
        }
      }

      return {
        items: items.map((device) => {
          const activeLicense = device.licenseBindings.at(0) ?? null;
          const redeemedCode = device.redeemedCodes.at(0) ?? null;
          const country = resolveCountryFromMetadata({
            locale: device.locale,
            metadata: device.metadata,
          });
          const [latitude, longitude] = resolveDeviceCoordinates(
            device.metadata
          );

          return {
            activeLicense: activeLicense
              ? {
                  boundAt: activeLicense.boundAt,
                  id: activeLicense.license.id,
                  key: activeLicense.license.key,
                  ownerEmail: activeLicense.license.ownerEmail,
                  status: activeLicense.license.status,
                }
              : null,
            appBuild: device.appBuild,
            appVersion: device.appVersion,
            country,
            freeAccessIpBlocked: device.lastIpAddress
              ? blockedFreeAccessIpSet.has(device.lastIpAddress)
              : false,
            latitude,
            longitude,
            ownerAvatarUrl: resolveAvatarUrl(device.metadata),
            createdAt: device.createdAt,
            id: device.id,
            installationId: device.installationId,
            lastIpAddress: device.lastIpAddress,
            lastSeenAt: device.lastSeenAt,
            locale: device.locale,
            platform: device.platform,
            redeemedCode: redeemedCode
              ? {
                  code: redeemedCode.code,
                  redeemedAt: redeemedCode.redeemedAt,
                  status: redeemedCode.status,
                }
              : null,
            sameIpInstallCount: device.lastIpAddress
              ? (sameIpCounts.get(device.lastIpAddress) ?? 1)
              : 0,
            sameIpOwnerEmails: device.lastIpAddress
              ? (sameIpOwnerEmails.get(device.lastIpAddress) ?? [])
              : [],
            status: device.status,
          };
        }),
        linkedCount,
        unlinkedCount,
        total,
      };
    }),

  blockFreeAccessIp: protectedProcedure({
    permissions: {
      device: ['revoke'],
    },
  })
    .route({
      method: 'POST',
      path: '/devices/free-access-ip-blocks',
      tags,
    })
    .input(zFreeAccessIpBlockInput)
    .output(zFreeAccessIpBlockOutput)
    .handler(async ({ context, input }) => {
      return await upsertFreeAccessIpBlock(input, {
        dbClient: context.db,
      });
    }),

  unblockFreeAccessIp: protectedProcedure({
    permissions: {
      device: ['revoke'],
    },
  })
    .route({
      method: 'POST',
      path: '/devices/free-access-ip-blocks/unblock',
      tags,
    })
    .input(zFreeAccessIpBlockInput.pick({ ipAddress: true }))
    .output(zFreeAccessIpUnblockOutput)
    .handler(async ({ context, input }) => {
      return await removeFreeAccessIpBlock(input, {
        dbClient: context.db,
      });
    }),

  getById: protectedProcedure({
    permissions: {
      device: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/devices/{deviceId}',
      tags,
    })
    .input(
      zRevokeDeviceInput
        .pick({
          deviceId: true,
        })
        .transform((input) => ({
          id: input.deviceId,
        }))
    )
    .output(zBackofficeDeviceDetail)
    .handler(async ({ context, input }) => {
      const device = await context.db.device.findUnique({
        where: {
          id: input.id,
        },
        select: {
          appBuild: true,
          appVersion: true,
          createdAt: true,
          id: true,
          installationId: true,
          lastIpAddress: true,
          lastSeenAt: true,
          licenseBindings: {
            orderBy: {
              boundAt: 'desc',
            },
            select: {
              boundAt: true,
              id: true,
              license: {
                select: {
                  id: true,
                  key: true,
                  ownerEmail: true,
                  status: true,
                },
              },
              status: true,
              unboundAt: true,
            },
          },
          locale: true,
          jobs: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              chapterIdentity: true,
              completedAt: true,
              createdAt: true,
              failedAt: true,
              id: true,
              pageCount: true,
              sourceLanguage: true,
              spentTokens: true,
              startedAt: true,
              status: true,
              targetLanguage: true,
              updatedAt: true,
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
              id: true,
              metadata: true,
              status: true,
              type: true,
            },
            take: 25,
            where: {
              type: 'job_spend',
            },
          },
          mangaVisits: {
            orderBy: {
              lastVisitedAt: 'desc',
            },
            select: {
              extensionLang: true,
              extensionName: true,
              extensionPackageName: true,
              firstVisitedAt: true,
              id: true,
              lastVisitedAt: true,
              mangaUrl: true,
              sourceId: true,
              sourceLanguage: true,
              sourceName: true,
              thumbnailUrl: true,
              title: true,
              visitCount: true,
            },
          },
          metadata: true,
          platform: true,
          status: true,
          extensionVisits: {
            orderBy: {
              lastVisitedAt: 'desc',
            },
            select: {
              extensionLang: true,
              extensionName: true,
              firstVisitedAt: true,
              iconUrl: true,
              id: true,
              lastVisitedAt: true,
              packageName: true,
              sourceId: true,
              sourceLanguage: true,
              sourceName: true,
              visitCount: true,
            },
          },
        },
      });

      if (!device) {
        throw new ORPCError('NOT_FOUND');
      }

      const activeBinding =
        device.licenseBindings.find((binding) => binding.status === 'active') ??
        null;
      const extensionPackages = device.extensionVisits.map(
        (visit) => visit.packageName
      );
      const extensionBlocks = extensionPackages.length
        ? await context.db.extensionBlock.findMany({
            where: {
              packageName: {
                in: extensionPackages,
              },
            },
            select: {
              packageName: true,
            },
          })
        : [];
      const blockedPackages = new Set(
        extensionBlocks.map((block) => block.packageName)
      );
      const titleCountsByPackage = device.mangaVisits.reduce(
        (counts, visit) => {
          if (visit.extensionPackageName) {
            counts.set(
              visit.extensionPackageName,
              (counts.get(visit.extensionPackageName) ?? 0) + 1
            );
          }
          return counts;
        },
        new Map<string, number>()
      );

      return {
        activeLicense: activeBinding
          ? {
              boundAt: activeBinding.boundAt,
              id: activeBinding.license.id,
              key: activeBinding.license.key,
              ownerEmail: activeBinding.license.ownerEmail,
              status: activeBinding.license.status,
            }
          : null,
        appBuild: device.appBuild,
        appVersion: device.appVersion,
        bindings: device.licenseBindings.map((binding) => ({
          boundAt: binding.boundAt,
          key: binding.license.key,
          licenseBindingId: binding.id,
          licenseId: binding.license.id,
          licenseStatus: binding.license.status,
          ownerEmail: binding.license.ownerEmail,
          status: binding.status,
          unboundAt: binding.unboundAt,
        })),
        readingActivity: buildReadingActivity({
          jobs: device.jobs ?? [],
          ledgerEntries: device.ledgerEntries ?? [],
        }),
        visitedExtensions: device.extensionVisits.map((visit) => ({
          ...visit,
          blocked: blockedPackages.has(visit.packageName),
          titlesOpened: titleCountsByPackage.get(visit.packageName) ?? 0,
        })),
        visitedTitles: device.mangaVisits,
        createdAt: device.createdAt,
        id: device.id,
        installationId: device.installationId,
        lastIpAddress: device.lastIpAddress,
        lastSeenAt: device.lastSeenAt,
        locale: device.locale,
        metadata: device.metadata,
        platform: device.platform,
        status: device.status,
      };
    }),

  setExtensionBlock: protectedProcedure({
    permissions: {
      device: ['revoke'],
    },
  })
    .route({
      method: 'POST',
      path: '/devices/extensions/block',
      tags,
    })
    .input(zSetExtensionBlockInput)
    .output(zSetExtensionBlockResponse)
    .handler(async ({ context, input }) => {
      return await setExtensionBlocked(input, {
        dbClient: context.db,
      });
    }),

  revokeById: protectedProcedure({
    permissions: {
      device: ['revoke'],
    },
  })
    .route({
      method: 'POST',
      path: '/devices/{deviceId}/revoke',
      tags,
    })
    .input(zRevokeDeviceInput)
    .output(zRevokeDeviceResponse)
    .handler(async ({ context, input }) => {
      return await revokeDeviceActivation(input, {
        dbClient: context.db,
        log: context.logger,
      });
    }),
};
