import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import {
  ProviderType,
  SourceDiscoveryResultStatus,
  SourceSearchMethodStatus,
} from '@/server/db/generated/client';
import { logger } from '@/server/logger';
import {
  createInvalidProviderResponseError,
  createProviderConfigError,
} from '@/server/provider-gateway/errors';
import { getProviderGatewayRuntimeConfig } from '@/server/provider-gateway/runtime-config';
import {
  fetchTextWithTimeout,
  parseJsonObjectText,
  parseJsonResponse,
  retryProviderCall,
} from '@/server/provider-gateway/utils';

import { GENERATED_SOURCE_THEME_HINTS } from './theme-hints.generated';

const sourceDiscoveryLog = logger.child({ scope: 'source-discovery' });
const KEIYOUSHI_INDEX_URL =
  'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json';
const KEIYOUSHI_REPO_URL =
  'https://raw.githubusercontent.com/keiyoushi/extensions/repo';
const INDEX_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_ALIASES = 12;
const MAX_SEARCH_QUERIES = 24;
const MAX_SOURCE_DISCOVERY_CANDIDATES = 2_500;
const MAX_VERIFY_CANDIDATES_PER_REQUEST = 120;
const SOURCE_DISCOVERY_PLAN_TOKEN_COST = 5;
const ASIAN_SOURCE_LANGUAGES = new Set([
  'all',
  'zh',
  'zh-cn',
  'zh-hans',
  'zh-hant',
  'zh-hk',
  'zh-mo',
  'zh-sg',
  'zh-tw',
  'ko',
  'kr',
  'ja',
  'jp',
  'id',
  'th',
  'vi',
]);
const FEATURED_ASIAN_SOURCE_MATCHERS = [
  '包子',
  'baozi',
  'goda',
  'goda漫畫',
  'goda漫画',
  'manga ball',
  'mangaball',
];
const SUPPORTED_DISCOVERY_ADAPTERS = new Set([
  'asurascans',
  'baozimanhua',
  'goda',
  'madara',
  'mangaball',
  'mangathemesia',
  'manhwaz',
]);
const DISABLING_SEARCH_METHOD_STATUSES = new Set([
  'cloudflare',
  'failed',
  'unsupported',
]);
const zSourceDiscoveryAlias = z.string().trim().min(1).max(200);

export const zSourceDiscoveryPlanInput = z.object({
  aliases: z
    .array(zSourceDiscoveryAlias)
    .max(MAX_SEARCH_QUERIES)
    .optional()
    .default([]),
  catalogAliases: z
    .array(zSourceDiscoveryAlias)
    .max(MAX_SEARCH_QUERIES)
    .optional()
    .default([]),
  clientAliases: z
    .array(zSourceDiscoveryAlias)
    .max(MAX_SEARCH_QUERIES)
    .optional()
    .default([]),
  includeNsfw: z.boolean().default(false),
  maxCandidates: z
    .number()
    .int()
    .min(5)
    .max(MAX_SOURCE_DISCOVERY_CANDIDATES)
    .default(120),
  preferredLanguages: z
    .array(z.string().trim().min(1).max(32))
    .max(20)
    .optional()
    .default([]),
  query: z.string().trim().min(1).max(200),
  targetChapter: z.number().int().positive().optional(),
});

export const zSourceDiscoveryTitleCorrectionInput = z.object({
  attemptedAliases: z
    .array(zSourceDiscoveryAlias)
    .min(1)
    .max(MAX_SEARCH_QUERIES),
  catalogAliases: z
    .array(zSourceDiscoveryAlias)
    .max(MAX_SEARCH_QUERIES)
    .optional()
    .default([]),
  clientAliases: z
    .array(zSourceDiscoveryAlias)
    .max(MAX_SEARCH_QUERIES)
    .optional()
    .default([]),
  observedResultCount: z.number().int().min(0).max(10_000),
  query: z.string().trim().min(1).max(200),
  searchedCandidateCount: z
    .number()
    .int()
    .min(1)
    .max(MAX_SOURCE_DISCOVERY_CANDIDATES),
  targetChapter: z.number().int().positive().optional(),
});

export const zSourceDiscoveryVerifyInput = z.object({
  aliases: z.array(z.string().trim().min(1).max(200)).max(MAX_SEARCH_QUERIES),
  candidates: z
    .array(
      z.object({
        baseUrl: z.string().trim().min(1).max(2_000),
        candidateId: z.string().trim().min(1).max(500),
        description: z.string().trim().max(4_000).nullish(),
        extensionName: z.string().trim().min(1).max(200),
        latestChapterName: z.string().trim().max(500).nullish(),
        latestChapterNumber: z.number().nonnegative().nullish(),
        mangaUrl: z.string().trim().max(2_000).nullish(),
        sourceId: z.string().trim().min(1).max(200),
        sourceLanguage: z.string().trim().min(1).max(32),
        sourceName: z.string().trim().min(1).max(200),
        title: z.string().trim().min(1).max(500),
      })
    )
    .max(MAX_VERIFY_CANDIDATES_PER_REQUEST),
  query: z.string().trim().min(1).max(200),
  targetChapter: z.number().int().positive().optional(),
});

export const zSourceDiscoveryResultSubmitInput = z.object({
  aliases: z.array(z.string().trim().min(1).max(200)).max(MAX_SEARCH_QUERIES),
  query: z.string().trim().min(1).max(200),
  results: z
    .array(
      z.object({
        baseUrl: z.string().trim().min(1).max(2_000),
        confidence: z.number().min(0).max(1),
        decision: z.enum(['match', 'maybe', 'reject']),
        description: z.string().trim().max(4_000).nullish(),
        extensionLang: z.string().trim().min(1).max(32),
        extensionName: z.string().trim().min(1).max(200),
        latestChapterName: z.string().trim().max(500).nullish(),
        latestChapterNumber: z.number().nonnegative().nullish(),
        mangaUrl: z.string().trim().min(1).max(2_000),
        matchedAlias: z.string().trim().max(200).nullish(),
        packageName: z.string().trim().min(1).max(250),
        reason: z.string().trim().max(500).nullish(),
        sourceId: z.string().trim().min(1).max(200),
        sourceLanguage: z.string().trim().min(1).max(32),
        sourceMangaUrl: z.string().trim().min(1).max(2_000),
        sourceName: z.string().trim().min(1).max(200),
        thumbnailUrl: z.string().trim().max(2_000).nullish(),
        title: z.string().trim().min(1).max(500),
      })
    )
    .max(MAX_VERIFY_CANDIDATES_PER_REQUEST),
});

const zAiTitleCorrectionResponse = z.object({
  aliases: z.array(zSourceDiscoveryAlias).max(MAX_SEARCH_QUERIES).default([]),
  confidence: z.number().min(0).max(1).default(0),
  correctedTitle: z.string().trim().max(200).nullish(),
  reason: z.string().trim().max(500).default(''),
});

const zAiVerificationResponse = z.object({
  matches: z.array(
    z.object({
      candidateId: z.string().trim().min(1),
      confidence: z.number().min(0).max(1),
      decision: z.enum(['match', 'maybe', 'reject']),
      reason: z.string().trim().max(500).default(''),
    })
  ),
});

export const zSourceDiscoveryMethodFeedbackInput = z.object({
  error: z.string().trim().max(1_000).nullish(),
  methodId: z.string().trim().min(1).max(200),
  sampleUrl: z.string().trim().max(2_000).nullish(),
  sourceId: z.string().trim().min(1).max(200),
  status: z.enum(['working', 'stale', 'cloudflare', 'failed']),
});

const zExtensionIndexSource = z.object({
  baseUrl: z.string().trim(),
  id: z.union([z.string(), z.number()]).transform(String),
  lang: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const zExtensionIndexItem = z.object({
  apk: z.string().trim().min(1),
  code: z.number().int(),
  lang: z.string().trim().min(1),
  name: z.string().trim().min(1),
  nsfw: z.union([z.literal(0), z.literal(1)]),
  pkg: z.string().trim().min(1),
  sources: z.array(zExtensionIndexSource).nullish(),
  version: z.string().trim().min(1),
});

const zExtensionIndex = z.array(zExtensionIndexItem);

export type SourceDiscoveryPlanInput = z.infer<
  typeof zSourceDiscoveryPlanInput
>;
export type SourceDiscoveryVerifyInput = z.infer<
  typeof zSourceDiscoveryVerifyInput
>;
export type SourceDiscoveryResultSubmitInput = z.infer<
  typeof zSourceDiscoveryResultSubmitInput
>;
export type SourceDiscoveryTitleCorrectionInput = z.infer<
  typeof zSourceDiscoveryTitleCorrectionInput
>;

export type SourceDiscoveryKnownResult = {
  apkName: string | null;
  baseUrl: string;
  confidence: number;
  decision: string;
  description: string | null;
  extensionIconUrl: string;
  extensionLang: string;
  extensionName: string;
  libVersion: number | null;
  latestChapterName: string | null;
  latestChapterNumber: number | null;
  mangaUrl: string;
  matchedAlias: string | null;
  packageName: string;
  reason: string | null;
  repoUrl: string | null;
  sourceId: string;
  sourceLanguage: string;
  sourceMangaUrl: string;
  sourceName: string;
  thumbnailUrl: string | null;
  title: string;
  versionCode: number | null;
  versionName: string | null;
};

export type SourceDiscoveryAdapterKey =
  | 'asurascans'
  | 'baozimanhua'
  | 'generic'
  | 'goda'
  | 'madara'
  | 'mangaball'
  | 'mangathemesia'
  | 'manhwaz';

export type SourceDiscoveryPlanCandidate = {
  adapterKey: SourceDiscoveryAdapterKey;
  apkName: string;
  baseUrl: string;
  extensionLang: string;
  extensionName: string;
  iconUrl: string;
  isNsfw: boolean;
  libVersion: number;
  packageName: string;
  priority: number;
  reasonCodes: string[];
  repoUrl: string;
  searchQueries: string[];
  sourceId: string;
  sourceLanguage: string;
  sourceName: string;
  searchMethod: SourceDiscoverySearchMethod | null;
  themeKey: string | null;
  versionCode: number;
  versionName: string;
};

export type SourceDiscoverySearchMethod = {
  adapterKey: string;
  chapterSelector: string | null;
  descriptionSelector: string | null;
  detailTitleSelector: string | null;
  headers: Record<string, string> | null;
  id: string;
  latestChapterSelector: string | null;
  methodType: 'http_template' | 'custom_adapter' | 'unsupported';
  resultSelector: string | null;
  searchUrlPattern: string | null;
  status:
    | 'working'
    | 'stale'
    | 'cloudflare'
    | 'failed'
    | 'unsupported'
    | 'unknown';
  thumbnailSelector: string | null;
  titleSelector: string | null;
  urlSelector: string | null;
};

type ExtensionIndex = z.infer<typeof zExtensionIndex>;
type ExtensionIndexSource = z.infer<typeof zExtensionIndexSource>;

type SourceThemeHint = {
  baseUrl: string;
  extensionName?: string | null;
  themeKey: string;
};

let indexCache:
  | {
      expiresAt: number;
      items: ExtensionIndex;
    }
  | undefined;

export async function buildSourceDiscoveryPlan(
  rawInput: unknown,
  deps: {
    extensionIndexItems?: ExtensionIndex;
    fetchFn?: typeof fetch;
    knownResults?: SourceDiscoveryKnownResult[];
    now?: () => Date;
    sourceSearchMethods?: SourceDiscoverySearchMethod[];
    sourceThemeHints?: SourceThemeHint[];
  } = {}
) {
  const input = zSourceDiscoveryPlanInput.parse(rawInput);
  const now = deps.now?.() ?? new Date();
  const searchQueries = uniqueNonEmpty([
    input.query,
    ...input.catalogAliases,
    ...input.clientAliases,
    ...input.aliases,
  ]).slice(0, MAX_SEARCH_QUERIES);
  const aliases = searchQueries.slice(0, MAX_ALIASES);
  const prioritizedLanguages = uniqueNonEmpty([
    ...input.preferredLanguages,
  ]).map((language) => language.toLowerCase());
  const sourceThemeHints =
    deps.sourceThemeHints ?? (await loadSourceThemeHints());
  const themeByBaseUrl = buildThemeHintMap(sourceThemeHints);
  const items =
    deps.extensionIndexItems ??
    (await fetchExtensionIndex({
      fetchFn: deps.fetchFn ?? fetch,
      now,
    }));

  const baseCandidates = items
    .flatMap((extension) =>
      (extension.sources ?? [])
        .flatMap((source) => {
          const baseUrls = parseBaseUrlCandidates(source.baseUrl);

          return baseUrls.map((baseUrl) => ({
            ...source,
            baseUrl,
            hasAlternateBaseUrls: baseUrls.length > 1,
          }));
        })
        .filter(
          (source) =>
            input.includeNsfw ||
            extension.nsfw !== 1 ||
            isFeaturedAsianExtensionSource({
              baseUrl: source.baseUrl,
              extensionName: extension.name,
              sourceName: source.name,
            })
        )
        .map((source) => {
          const themeKey =
            themeByBaseUrl.get(normalizeBaseUrl(source.baseUrl)) ?? null;

          return buildCandidate({
            aliases,
            extension,
            input,
            prioritizedLanguages,
            searchQueries,
            source,
            themeKey,
          });
        })
    )
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return `${left.extensionName}:${left.sourceName}`.localeCompare(
        `${right.extensionName}:${right.sourceName}`
      );
    })
    .slice(0, input.maxCandidates);
  const searchMethods = await loadSearchMethodsForCandidates(
    baseCandidates,
    deps.sourceSearchMethods
  );
  const candidates = baseCandidates.map((candidate) => ({
    ...candidate,
    searchMethod:
      searchMethods.get(candidate.sourceId) ??
      buildFallbackSearchMethod(candidate),
  }));
  const knownResultsRaw =
    deps.knownResults ??
    (await findKnownSourceDiscoveryResults({
      aliases,
      exactAliasesOnly: true,
      query: input.query,
    }).catch(() => []));
  const extensionByPackageName = new Map(
    items.map((extension) => [extension.pkg, extension])
  );
  const enrichedKnownResults = knownResultsRaw.map((result) =>
    enrichKnownResultWithExtensionMetadata(
      result,
      extensionByPackageName.get(result.packageName) ?? null
    )
  );
  const knownResults = enrichedKnownResults.filter(hasDetectedLatestChapter);
  const knownResultsWithoutLatest =
    enrichedKnownResults.length - knownResults.length;

  sourceDiscoveryLog.info({
    aliasCount: aliases.length,
    candidateCount: candidates.length,
    candidateSample: summarizeDiscoveryCandidates(candidates),
    knownResults: knownResults.length,
    knownResultsWithoutLatest,
    message: 'Built source discovery plan',
    query: input.query,
    runnableMethodCount: candidates.filter(
      (candidate) =>
        candidate.searchMethod &&
        candidate.searchMethod.methodType !== 'unsupported'
    ).length,
    searchMethodCount: candidates.filter(
      (candidate) => candidate.searchMethod !== null
    ).length,
    type: 'source_discovery_plan',
  });

  return {
    aliasStrategy: 'mobile_exact',
    aliases,
    alternativeTitles: [],
    candidates,
    generatedAt: now.toISOString(),
    indexSourceUrl: KEIYOUSHI_INDEX_URL,
    knownResults,
    probableLanguages: [],
    query: input.query,
    romanizedTitles: [],
    searchStrategy:
      'Search the exact catalog aliases from the device across likely manga, manhwa, manhua, scanlation, and webtoon sources.',
    targetChapter: input.targetChapter ?? null,
  };
}

export async function verifySourceDiscoveryCandidates(
  rawInput: unknown,
  deps: {
    fetchFn?: typeof fetch;
    verifier?: (input: SourceDiscoveryVerifyInput) => Promise<unknown>;
  } = {}
) {
  const parsedInput = zSourceDiscoveryVerifyInput.parse(rawInput);
  const input = {
    ...parsedInput,
    aliases: normalizeSourceDiscoveryApiAliases(parsedInput.aliases),
  };
  const candidatesWithLatest = input.candidates.filter(
    hasDetectedLatestChapter
  );
  const droppedMissingLatest =
    input.candidates.length - candidatesWithLatest.length;

  sourceDiscoveryLog.info({
    aliasCount: input.aliases.length,
    candidateCount: input.candidates.length,
    candidateSample: summarizeDiscoveryCandidates(input.candidates),
    droppedMissingLatest,
    message: 'Verifying source discovery candidates',
    query: input.query,
    type: 'source_discovery_verify_start',
  });

  if (candidatesWithLatest.length === 0) {
    return {
      matches: [],
    };
  }

  const verificationInput = {
    ...input,
    candidates: candidatesWithLatest,
  };
  const raw =
    deps.verifier !== undefined
      ? await deps.verifier(verificationInput)
      : await generateVerification(verificationInput, {
          fetchFn: deps.fetchFn,
        });
  const parsed = zAiVerificationResponse.parse(raw);
  const knownIds = new Set(
    candidatesWithLatest.map((candidate) => candidate.candidateId)
  );
  const matches = parsed.matches
    .filter((match) => knownIds.has(match.candidateId))
    .map((match) => ({
      candidateId: match.candidateId,
      confidence: match.confidence,
      decision: match.decision,
      reason: match.reason,
    }));

  sourceDiscoveryLog.info({
    acceptedCount: matches.filter((match) => match.decision !== 'reject')
      .length,
    matchSample: matches.slice(0, 12),
    message: 'Verified source discovery candidates',
    query: input.query,
    returnedMatchCount: matches.length,
    type: 'source_discovery_verify_done',
  });

  return {
    matches,
  };
}

export async function generateSourceDiscoveryTitleCorrection(
  rawInput: unknown,
  deps: {
    fetchFn?: typeof fetch;
    generator?: (
      input: SourceDiscoveryTitleCorrectionInput
    ) => Promise<unknown>;
  } = {}
) {
  const input = zSourceDiscoveryTitleCorrectionInput.parse(rawInput);
  const attemptedKeys = new Set(
    buildExactDiscoveryAliasKeys([
      input.query,
      ...input.catalogAliases,
      ...input.clientAliases,
      ...input.attemptedAliases,
    ])
  );
  const raw =
    deps.generator !== undefined
      ? await deps.generator(input)
      : await generateTitleCorrection(input, {
          fetchFn: deps.fetchFn,
        });
  const parsed = zAiTitleCorrectionResponse.parse(raw);
  const aliases = uniqueNonEmpty([
    parsed.correctedTitle ?? '',
    ...parsed.aliases,
  ])
    .filter((alias) => !attemptedKeys.has(normalizeDiscoveryKey(alias)))
    .slice(0, MAX_SEARCH_QUERIES);

  return {
    aliasStrategy: 'ai_title_correction',
    aliases,
    canRetry: aliases.length > 0,
    confidence: parsed.confidence,
    correctedTitle: parsed.correctedTitle?.trim() || null,
    reason: parsed.reason,
  };
}

export async function findKnownSourceDiscoveryResults(input: {
  aliases?: string[];
  exactAliasesOnly?: boolean;
  limit?: number;
  query: string;
}): Promise<SourceDiscoveryKnownResult[]> {
  const aliasKeys = input.exactAliasesOnly
    ? buildExactDiscoveryAliasKeys([input.query, ...(input.aliases ?? [])])
    : buildDiscoveryAliasKeys(input.query, input.aliases ?? []);
  if (aliasKeys.length === 0) {
    return [];
  }

  const rows = await db.sourceDiscoveryResultAlias.findMany({
    include: {
      result: true,
    },
    orderBy: [
      { result: { latestChapterNumber: 'desc' } },
      { result: { confidence: 'desc' } },
      { result: { confirmationCount: 'desc' } },
      { result: { lastSeenAt: 'desc' } },
    ],
    take: Math.min(input.limit ?? 40, 80),
    where: {
      aliasKey: {
        in: aliasKeys,
      },
      result: {
        OR: [
          {
            AND: [
              {
                latestChapterName: {
                  not: null,
                },
              },
              {
                latestChapterName: {
                  not: '',
                },
              },
            ],
          },
          {
            latestChapterNumber: {
              not: null,
            },
          },
        ],
        status: SourceDiscoveryResultStatus.active,
      },
    },
  });
  const seen = new Set<string>();

  return rows
    .map((row) => row.result)
    .filter((result) => {
      if (seen.has(result.id)) {
        return false;
      }
      seen.add(result.id);
      return true;
    })
    .map(serializeKnownResult);
}

export async function submitSourceDiscoveryResults(rawInput: unknown) {
  const parsedInput = zSourceDiscoveryResultSubmitInput.parse(rawInput);
  const input = {
    ...parsedInput,
    aliases: normalizeSourceDiscoveryApiAliases(parsedInput.aliases),
  };
  const now = new Date();
  let accepted = 0;
  let rejected = 0;

  await db.$transaction(async (tx) => {
    for (const result of input.results) {
      if (result.decision === 'reject' || result.confidence < 0.65) {
        rejected += 1;
        continue;
      }
      if (!hasDetectedLatestChapter(result)) {
        rejected += 1;
        sourceDiscoveryLog.info({
          message: 'Rejected source discovery result without latest chapter',
          query: input.query,
          sourceId: result.sourceId,
          sourceName: result.sourceName,
          title: result.title,
          type: 'source_discovery_result_without_latest',
        });
        continue;
      }

      const canonicalMangaUrl = canonicalizeMangaUrl(
        result.mangaUrl || result.sourceMangaUrl,
        result.baseUrl
      );
      const titleKey = normalizeDiscoveryKey(result.title);
      if (!canonicalMangaUrl || !titleKey) {
        rejected += 1;
        continue;
      }

      const existing = await tx.sourceDiscoveryResult.findUnique({
        where: {
          sourceId_canonicalMangaUrl: {
            canonicalMangaUrl,
            sourceId: result.sourceId,
          },
        },
      });
      const latestChapterNumber = maxNullableNumber(
        existing?.latestChapterNumber ?? null,
        result.latestChapterNumber ?? null
      );
      const nextConfirmationCount =
        (existing?.confirmationCount ?? 0) +
        (result.decision === 'match' ? 1 : 0);
      const isGlobalSearchObservation =
        result.reason === 'Found by installed global source search';
      const shouldPromote =
        result.decision === 'match' &&
        ((!isGlobalSearchObservation && result.confidence >= 0.75) ||
          (nextConfirmationCount >= 2 && result.confidence >= 0.7));
      const status = shouldPromote
        ? SourceDiscoveryResultStatus.active
        : SourceDiscoveryResultStatus.pending;
      const row = existing
        ? await tx.sourceDiscoveryResult.update({
            data: {
              baseUrl: result.baseUrl,
              confidence: Math.max(existing.confidence, result.confidence),
              decision:
                result.decision === 'match' ? 'match' : existing.decision,
              description: result.description ?? existing.description,
              extensionLang: result.extensionLang,
              extensionName: result.extensionName,
              lastSeenAt: now,
              lastVerifiedAt: now,
              latestChapterName:
                result.latestChapterName ?? existing.latestChapterName,
              latestChapterNumber,
              metadata: {
                lastSubmittedQueryKey: normalizeDiscoveryKey(input.query),
                matchedAlias: result.matchedAlias ?? null,
              },
              observationCount: {
                increment: 1,
              },
              packageName: result.packageName,
              reason: result.reason ?? existing.reason,
              sourceLanguage: result.sourceLanguage,
              sourceMangaUrl: result.sourceMangaUrl,
              sourceName: result.sourceName,
              status:
                existing.status === SourceDiscoveryResultStatus.active ||
                shouldPromote
                  ? SourceDiscoveryResultStatus.active
                  : status,
              thumbnailUrl: result.thumbnailUrl ?? existing.thumbnailUrl,
              title: result.title,
              titleKey,
              confirmationCount: nextConfirmationCount,
            },
            where: {
              id: existing.id,
            },
          })
        : await tx.sourceDiscoveryResult.create({
            data: {
              baseUrl: result.baseUrl,
              canonicalMangaUrl,
              confidence: result.confidence,
              decision: result.decision,
              description: result.description ?? null,
              extensionLang: result.extensionLang,
              extensionName: result.extensionName,
              firstSeenAt: now,
              lastSeenAt: now,
              lastVerifiedAt: now,
              latestChapterName: result.latestChapterName ?? null,
              latestChapterNumber: result.latestChapterNumber ?? null,
              mangaUrl: result.mangaUrl,
              metadata: {
                firstSubmittedQueryKey: normalizeDiscoveryKey(input.query),
                matchedAlias: result.matchedAlias ?? null,
              },
              packageName: result.packageName,
              reason: result.reason ?? null,
              confirmationCount: result.decision === 'match' ? 1 : 0,
              sourceId: result.sourceId,
              sourceLanguage: result.sourceLanguage,
              sourceMangaUrl: result.sourceMangaUrl,
              sourceName: result.sourceName,
              status,
              thumbnailUrl: result.thumbnailUrl ?? null,
              title: result.title,
              titleKey,
            },
          });

      for (const alias of buildSubmissionAliases(
        input.query,
        input.aliases,
        result
      )) {
        const aliasKey = normalizeDiscoveryKey(alias);
        if (!aliasKey) {
          continue;
        }
        await tx.sourceDiscoveryResultAlias.upsert({
          create: {
            alias,
            aliasKey,
            resultId: row.id,
          },
          update: {
            alias,
          },
          where: {
            resultId_aliasKey: {
              aliasKey,
              resultId: row.id,
            },
          },
        });
      }

      accepted += 1;
    }
  });

  sourceDiscoveryLog.info({
    accepted,
    inputCount: input.results.length,
    message: 'Submitted source discovery results',
    query: input.query,
    rejected,
    resultSample: summarizeDiscoveryResults(input.results),
    type: 'source_discovery_results_submit',
  });

  return {
    accepted,
    rejected,
  };
}

export function calculateSourceDiscoveryPlanTokenCost() {
  return 0;
}

export function calculateSourceDiscoveryTitleCorrectionTokenCost(
  rawInput: unknown
) {
  zSourceDiscoveryTitleCorrectionInput.parse(rawInput);

  return SOURCE_DISCOVERY_PLAN_TOKEN_COST;
}

export function calculateSourceDiscoveryVerifyTokenCost(rawInput: unknown) {
  zSourceDiscoveryVerifyInput.parse(rawInput);

  return 0;
}

export async function updateSourceDiscoveryMethodFeedback(rawInput: unknown) {
  const input = zSourceDiscoveryMethodFeedbackInput.parse(rawInput);
  const status = input.status;
  const now = new Date();
  const rows = await db.sourceSearchMethod.findMany({
    select: {
      baseUrl: true,
      extensionName: true,
      id: true,
      sourceName: true,
    },
    where: {
      OR: [{ id: input.methodId }, { sourceId: input.sourceId }],
    },
  });

  for (const row of rows) {
    const persistedStatus =
      status !== 'working' &&
      isFeaturedAsianExtensionSource({
        baseUrl: row.baseUrl,
        extensionName: row.extensionName,
        sourceName: row.sourceName,
      })
        ? SourceSearchMethodStatus.stale
        : status;

    await db.sourceSearchMethod.update({
      data: {
        failureReason: input.error ?? null,
        lastSuccessAt: status === 'working' ? now : undefined,
        lastTestedAt: now,
        metadata: {
          lastFeedbackSampleUrl: input.sampleUrl ?? null,
        },
        status: persistedStatus,
      },
      where: {
        id: row.id,
      },
    });
  }

  sourceDiscoveryLog.info({
    error: input.error ?? null,
    matchedRows: rows.length,
    message: 'Updated source discovery method feedback',
    methodId: input.methodId,
    sampleUrl: input.sampleUrl ?? null,
    sourceId: input.sourceId,
    status,
    type: 'source_discovery_method_feedback',
  });

  return { ok: true };
}

export async function importSourceSearchMethodsFromExtensionsSource(
  deps: {
    extensionIndexItems?: ExtensionIndex;
    fetchFn?: typeof fetch;
    now?: () => Date;
    sourceThemeHints?: SourceThemeHint[];
  } = {}
) {
  const now = deps.now?.() ?? new Date();
  const items =
    deps.extensionIndexItems ??
    (await fetchExtensionIndex({
      fetchFn: deps.fetchFn ?? fetch,
      now,
    }));
  const sourceThemeHints =
    deps.sourceThemeHints ?? (await loadSourceThemeHints());
  const themeByBaseUrl = buildThemeHintMap(sourceThemeHints);
  let imported = 0;
  let unsupported = 0;

  for (const extension of items) {
    for (const source of extension.sources ?? []) {
      const baseUrls = parseBaseUrlCandidates(source.baseUrl);
      const baseUrl = baseUrls[0];

      if (!baseUrl) {
        continue;
      }

      const themeKey =
        themeByBaseUrl.get(normalizeBaseUrl(baseUrl)) ??
        themeByBaseUrl.get(normalizeBaseUrl(source.baseUrl)) ??
        null;
      const adapterKey = resolveAdapterKey({
        baseUrl,
        sourceName: source.name,
        themeKey,
      });
      const template = getAdapterSearchMethodTemplate(adapterKey);
      const methodType = template?.methodType ?? 'unsupported';
      const methodStatus = template ? 'unknown' : 'unsupported';

      await db.sourceSearchMethod.upsert({
        create: {
          adapterKey,
          apkName: extension.apk,
          baseUrl,
          chapterSelector: template?.chapterSelector ?? null,
          descriptionSelector: template?.descriptionSelector ?? null,
          detailTitleSelector: template?.detailTitleSelector ?? null,
          extensionLang: extension.lang,
          extensionName: extension.name,
          headers: template?.headers ?? undefined,
          latestChapterSelector: template?.latestChapterSelector ?? null,
          lastImportedAt: now,
          methodType,
          metadata: {
            alternateBaseUrls: baseUrls.slice(1),
            reason: template ? 'template_detected' : 'no_supported_template',
          },
          packageName: extension.pkg,
          resultSelector: template?.resultSelector ?? null,
          searchUrlPattern: template?.searchUrlPattern ?? null,
          sourceId: source.id,
          sourceLanguage: source.lang,
          sourceName: source.name,
          status: methodStatus,
          themeKey,
          thumbnailSelector: template?.thumbnailSelector ?? null,
          titleSelector: template?.titleSelector ?? null,
          urlSelector: template?.urlSelector ?? null,
          versionCode: extension.code,
          versionName: extension.version,
        },
        update: {
          adapterKey,
          apkName: extension.apk,
          baseUrl,
          chapterSelector: template?.chapterSelector ?? null,
          descriptionSelector: template?.descriptionSelector ?? null,
          detailTitleSelector: template?.detailTitleSelector ?? null,
          extensionLang: extension.lang,
          extensionName: extension.name,
          headers: template?.headers ?? undefined,
          latestChapterSelector: template?.latestChapterSelector ?? null,
          lastImportedAt: now,
          methodType,
          metadata: {
            alternateBaseUrls: baseUrls.slice(1),
            reason: template ? 'template_detected' : 'no_supported_template',
          },
          packageName: extension.pkg,
          resultSelector: template?.resultSelector ?? null,
          searchUrlPattern: template?.searchUrlPattern ?? null,
          sourceLanguage: source.lang,
          sourceName: source.name,
          status: template ? undefined : methodStatus,
          themeKey,
          thumbnailSelector: template?.thumbnailSelector ?? null,
          titleSelector: template?.titleSelector ?? null,
          urlSelector: template?.urlSelector ?? null,
          versionCode: extension.code,
          versionName: extension.version,
        },
        where: {
          sourceId: source.id,
        },
      });

      if (template) {
        imported += 1;
      } else {
        unsupported += 1;
      }
    }
  }

  return {
    imported,
    total: imported + unsupported,
    unsupported,
  };
}

export function buildSearchAliases(query: string) {
  const normalized = query.trim().replace(/\s+/g, ' ');
  const withoutBracketText = normalized
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const punctuationAsSpace = withoutBracketText
    .replace(/['’]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const titleParts = withoutBracketText
    .split(/\s*[:|/-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const compactKeywords = punctuationAsSpace
    .split(' ')
    .filter(
      (word) => !['a', 'an', 'and', 'of', 'the'].includes(word.toLowerCase())
    )
    .join(' ');

  return uniqueNonEmpty([
    normalized,
    withoutBracketText,
    punctuationAsSpace,
    ...titleParts,
    compactKeywords,
    punctuationAsSpace.toLowerCase(),
  ]).slice(0, MAX_ALIASES);
}

function buildDiscoveryAliases(query: string, aliases: string[]) {
  return uniqueNonEmpty([
    query,
    ...buildSearchAliases(query),
    ...aliases,
  ]).slice(0, MAX_ALIASES + 8);
}

function buildDiscoveryAliasKeys(query: string, aliases: string[]) {
  return uniqueNonEmpty(
    buildDiscoveryAliases(query, aliases).map(normalizeDiscoveryKey)
  );
}

function buildExactDiscoveryAliasKeys(values: string[]) {
  return uniqueNonEmpty(values.map(normalizeDiscoveryKey));
}

function buildSubmissionAliases(
  query: string,
  aliases: string[],
  result: {
    confidence: number;
    decision: string;
    matchedAlias?: string | null;
    reason?: string | null;
    title: string;
  }
) {
  const isGlobalSearchObservation =
    result.reason === 'Found by installed global source search';
  const shouldUseRequestedAliases =
    result.decision === 'match' &&
    result.confidence >= 0.75 &&
    !isGlobalSearchObservation;

  return uniqueNonEmpty([
    result.title,
    result.matchedAlias ?? '',
    ...(shouldUseRequestedAliases ? [query, ...aliases] : []),
  ]).slice(0, MAX_ALIASES);
}

function hasDetectedLatestChapter(result: {
  latestChapterName?: string | null;
  latestChapterNumber?: number | null;
}) {
  return (
    result.latestChapterNumber != null ||
    (typeof result.latestChapterName === 'string' &&
      result.latestChapterName.trim().length > 0)
  );
}

function summarizeDiscoveryCandidates(
  candidates: Array<{
    adapterKey?: string | null;
    extensionName?: string | null;
    latestChapterName?: string | null;
    latestChapterNumber?: number | null;
    searchMethod?: SourceDiscoverySearchMethod | null;
    sourceLanguage: string;
    sourceName: string;
    title?: string | null;
  }>,
  limit = 12
) {
  return candidates.slice(0, limit).map((candidate) => ({
    adapterKey: candidate.adapterKey ?? null,
    extensionName: candidate.extensionName ?? null,
    latest:
      candidate.latestChapterNumber ?? candidate.latestChapterName ?? null,
    methodStatus: candidate.searchMethod?.status ?? null,
    methodType: candidate.searchMethod?.methodType ?? null,
    sourceLanguage: candidate.sourceLanguage,
    sourceName: candidate.sourceName,
    title: candidate.title ?? null,
  }));
}

function summarizeDiscoveryResults(
  results: Array<{
    confidence?: number | null;
    decision?: string | null;
    latestChapterName?: string | null;
    latestChapterNumber?: number | null;
    sourceLanguage: string;
    sourceName: string;
    title: string;
  }>,
  limit = 12
) {
  return results.slice(0, limit).map((result) => ({
    confidence: result.confidence ?? null,
    decision: result.decision ?? null,
    latest: result.latestChapterNumber ?? result.latestChapterName ?? null,
    sourceLanguage: result.sourceLanguage,
    sourceName: result.sourceName,
    title: result.title,
  }));
}

function normalizeDiscoveryKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/gi, ' ')
    .replace(
      /\b(chapter|chapitre|capitulo|capitulo|manga|manhwa|manhua|scan|scans|webtoon)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeMangaUrl(url: string, baseUrl: string) {
  const rawUrl = url.trim();
  if (!rawUrl) {
    return '';
  }

  try {
    const parsed = new URL(rawUrl, baseUrl);
    parsed.hash = '';
    for (const key of parsed.searchParams.keys()) {
      if (
        key.toLowerCase().startsWith('utm_') ||
        ['fbclid', 'gclid', 'ref'].includes(key.toLowerCase())
      ) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/g, '') || '/';
    return parsed.toString();
  } catch {
    return rawUrl.replace(/#.*$/, '').replace(/\/+$/, '');
  }
}

function maxNullableNumber(left: number | null, right: number | null) {
  if (left == null) {
    return right;
  }
  if (right == null) {
    return left;
  }
  return Math.max(left, right);
}

function serializeKnownResult(result: {
  baseUrl: string;
  confidence: number;
  decision: string;
  description: string | null;
  extensionLang: string;
  extensionName: string;
  latestChapterName: string | null;
  latestChapterNumber: number | null;
  mangaUrl: string;
  metadata?: unknown;
  packageName: string;
  reason: string | null;
  sourceId: string;
  sourceLanguage: string;
  sourceMangaUrl: string;
  sourceName: string;
  thumbnailUrl: string | null;
  title: string;
}): SourceDiscoveryKnownResult {
  return {
    apkName: null,
    baseUrl: result.baseUrl,
    confidence: result.confidence,
    decision: result.decision,
    description: result.description,
    extensionIconUrl: `${KEIYOUSHI_REPO_URL}/icon/${result.packageName}.png`,
    extensionLang: result.extensionLang,
    extensionName: result.extensionName,
    libVersion: null,
    latestChapterName: result.latestChapterName,
    latestChapterNumber: result.latestChapterNumber,
    mangaUrl: result.mangaUrl,
    matchedAlias: extractMatchedAlias(result.metadata),
    packageName: result.packageName,
    reason: result.reason,
    repoUrl: null,
    sourceId: result.sourceId,
    sourceLanguage: result.sourceLanguage,
    sourceMangaUrl: result.sourceMangaUrl,
    sourceName: result.sourceName,
    thumbnailUrl: result.thumbnailUrl,
    title: result.title,
    versionCode: null,
    versionName: null,
  };
}

function extractMatchedAlias(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const value = (metadata as { matchedAlias?: unknown }).matchedAlias;

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function enrichKnownResultWithExtensionMetadata(
  result: SourceDiscoveryKnownResult,
  extension: ExtensionIndex[number] | null
): SourceDiscoveryKnownResult {
  if (!extension) {
    return result;
  }

  return {
    ...result,
    apkName: extension.apk,
    extensionIconUrl: `${KEIYOUSHI_REPO_URL}/icon/${extension.pkg}.png`,
    libVersion: extractLibVersion(extension.version),
    repoUrl: KEIYOUSHI_REPO_URL,
    versionCode: extension.code,
    versionName: extension.version,
  };
}

function extractLibVersion(version: string): number {
  const parsed = Number.parseFloat(version.split('.').slice(0, -1).join('.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchExtensionIndex(input: {
  fetchFn: typeof fetch;
  now: Date;
}): Promise<ExtensionIndex> {
  if (indexCache && indexCache.expiresAt > input.now.getTime()) {
    return indexCache.items;
  }

  const response = await input.fetchFn(KEIYOUSHI_INDEX_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'TachiyomiAT-Back/source-discovery',
    },
  });

  if (!response.ok) {
    throw new SourceDiscoveryError(
      'extension_index_unavailable',
      `Keiyoushi extension index returned HTTP ${response.status}`,
      502
    );
  }

  const parsed = zExtensionIndex.safeParse(await response.json());

  if (!parsed.success) {
    throw new SourceDiscoveryError(
      'extension_index_invalid',
      'Keiyoushi extension index has an unexpected shape',
      502
    );
  }

  indexCache = {
    expiresAt: input.now.getTime() + INDEX_CACHE_TTL_MS,
    items: parsed.data,
  };

  return parsed.data;
}

function buildCandidate(input: {
  aliases: string[];
  extension: ExtensionIndex[number];
  input: SourceDiscoveryPlanInput;
  prioritizedLanguages: string[];
  searchQueries: string[];
  source: ExtensionIndexSource & { hasAlternateBaseUrls?: boolean };
  themeKey: string | null;
}): SourceDiscoveryPlanCandidate {
  const adapterKey = resolveAdapterKey({
    baseUrl: input.source.baseUrl,
    sourceName: input.source.name,
    themeKey: input.themeKey,
  });
  const { priority, reasonCodes } = scoreCandidate({
    adapterKey,
    baseUrl: input.source.baseUrl,
    extensionLang: input.extension.lang,
    extensionName: input.extension.name,
    prioritizedLanguages: input.prioritizedLanguages,
    sourceLanguage: input.source.lang,
    sourceName: input.source.name,
    themeKey: input.themeKey,
  });
  if (input.source.hasAlternateBaseUrls) {
    reasonCodes.push('multi_base_url');
  }

  return {
    adapterKey,
    apkName: input.extension.apk,
    baseUrl: input.source.baseUrl,
    extensionLang: input.extension.lang,
    extensionName: input.extension.name,
    iconUrl: `${KEIYOUSHI_REPO_URL}/icon/${input.extension.pkg}.png`,
    isNsfw: input.extension.nsfw === 1,
    libVersion: extractLibVersion(input.extension.version),
    packageName: input.extension.pkg,
    priority,
    reasonCodes,
    repoUrl: KEIYOUSHI_REPO_URL,
    searchQueries: input.searchQueries,
    sourceId: input.source.id,
    sourceLanguage: input.source.lang,
    sourceName: input.source.name,
    searchMethod: null,
    themeKey: input.themeKey,
    versionCode: input.extension.code,
    versionName: input.extension.version,
  };
}

async function loadSearchMethodsForCandidates(
  candidates: SourceDiscoveryPlanCandidate[],
  injectedMethods?: SourceDiscoverySearchMethod[]
) {
  const candidateBySourceId = new Map(
    candidates.map((candidate) => [candidate.sourceId, candidate])
  );

  if (injectedMethods) {
    return normalizeSearchMethodMapForCandidates(
      candidateBySourceId,
      new Map(injectedMethods.map((method) => [method.id, method]))
    );
  }

  const sourceIds = uniqueNonEmpty(
    candidates.map((candidate) => candidate.sourceId)
  );

  if (sourceIds.length === 0) {
    return new Map<string, SourceDiscoverySearchMethod>();
  }

  const rows =
    (await Promise.resolve(
      db.sourceSearchMethod.findMany({
        where: {
          sourceId: {
            in: sourceIds,
          },
        },
      })
    ).catch(() => [])) ?? [];

  return normalizeSearchMethodMapForCandidates(
    candidateBySourceId,
    new Map(
      rows.map((row) => {
        const method = serializeSearchMethodRow(row);

        return [row.sourceId, method] as const;
      })
    )
  );
}

function normalizeSearchMethodMapForCandidates(
  candidateBySourceId: Map<string, SourceDiscoveryPlanCandidate>,
  methodsBySourceId: Map<string, SourceDiscoverySearchMethod>
) {
  return new Map(
    Array.from(methodsBySourceId.entries()).map(([sourceId, method]) => {
      const candidate = candidateBySourceId.get(sourceId);

      if (
        candidate &&
        DISABLING_SEARCH_METHOD_STATUSES.has(method.status) &&
        isFeaturedAsianExtensionSource({
          baseUrl: candidate.baseUrl,
          extensionName: candidate.extensionName,
          sourceName: candidate.sourceName,
        })
      ) {
        return [sourceId, { ...method, status: 'stale' }] as const;
      }

      return [sourceId, method] as const;
    })
  );
}

function serializeSearchMethodRow(row: {
  adapterKey: string;
  chapterSelector: string | null;
  descriptionSelector: string | null;
  detailTitleSelector: string | null;
  headers: unknown;
  id: string;
  latestChapterSelector: string | null;
  methodType: string;
  resultSelector: string | null;
  searchUrlPattern: string | null;
  status: string;
  thumbnailSelector: string | null;
  titleSelector: string | null;
  urlSelector: string | null;
}): SourceDiscoverySearchMethod {
  return {
    adapterKey: row.adapterKey,
    chapterSelector: row.chapterSelector,
    descriptionSelector: row.descriptionSelector,
    detailTitleSelector: row.detailTitleSelector,
    headers: isStringRecord(row.headers) ? row.headers : null,
    id: row.id,
    latestChapterSelector: row.latestChapterSelector,
    methodType: normalizeMethodType(row.methodType),
    resultSelector: row.resultSelector,
    searchUrlPattern: row.searchUrlPattern,
    status: normalizeMethodStatus(row.status),
    thumbnailSelector: row.thumbnailSelector,
    titleSelector: row.titleSelector,
    urlSelector: row.urlSelector,
  };
}

function buildFallbackSearchMethod(
  candidate: SourceDiscoveryPlanCandidate
): SourceDiscoverySearchMethod | null {
  const template = getAdapterSearchMethodTemplate(candidate.adapterKey);

  if (!template) {
    return null;
  }

  return {
    ...template,
    adapterKey: candidate.adapterKey,
    id: `fallback:${candidate.sourceId}`,
    status: 'unknown',
  };
}

function getAdapterSearchMethodTemplate(
  adapterKey: SourceDiscoveryAdapterKey
): Omit<SourceDiscoverySearchMethod, 'adapterKey' | 'id' | 'status'> | null {
  switch (adapterKey) {
    case 'asurascans':
      return {
        chapterSelector: 'div.scrollbar-thumb-themecolor > div.group h3',
        descriptionSelector: 'span.font-medium.text-sm',
        detailTitleSelector: 'span.text-xl.font-bold, h3.truncate',
        headers: null,
        latestChapterSelector: 'div.scrollbar-thumb-themecolor > div.group h3',
        methodType: 'http_template',
        resultSelector: 'div.grid > a[href]',
        searchUrlPattern:
          '{baseUrl}/series?page={page}&name={query}&genres=&status=-1&types=-1&order=rating',
        thumbnailSelector: 'img',
        titleSelector: 'div.block > span.block',
        urlSelector: '&',
      };
    case 'baozimanhua':
      return {
        chapterSelector: '.comics-chapters a',
        descriptionSelector: 'p.comics-detail__desc',
        detailTitleSelector: 'h1.comics-detail__title',
        headers: null,
        latestChapterSelector: '.comics-chapters a',
        methodType: 'http_template',
        resultSelector:
          'div.pure-g div a.comics-card__poster[href], a.comics-card__poster[href]',
        searchUrlPattern: '{baseUrl}/search?q={query}',
        thumbnailSelector: 'amp-img[src], img[src]',
        titleSelector: null,
        urlSelector: '&',
      };
    case 'goda':
      return {
        chapterSelector: '.chapteritem a[data-ct], .chapteritem a',
        descriptionSelector: 'main p, #mangachapters ~ p',
        detailTitleSelector: 'main h1, h1',
        headers: null,
        latestChapterSelector: '.chapteritem a[data-ct], .chapteritem a',
        methodType: 'http_template',
        resultSelector: '.container > .cardlist .pb-2 a[href]',
        searchUrlPattern: '{baseUrl}/s/{query}?page={page}',
        thumbnailSelector: 'img[src]',
        titleSelector: 'h3',
        urlSelector: '&',
      };
    case 'mangaball':
      return {
        chapterSelector: null,
        descriptionSelector: null,
        detailTitleSelector: null,
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        latestChapterSelector: null,
        methodType: 'custom_adapter',
        resultSelector: null,
        searchUrlPattern: '{baseUrl}/api/v1/title/search-advanced/',
        thumbnailSelector: null,
        titleSelector: null,
        urlSelector: null,
      };
    case 'mangathemesia':
      return {
        chapterSelector:
          'div.bxcl li a, div.cl li a, #chapterlist li a, .eph-num a',
        descriptionSelector: '.desc, .entry-content[itemprop=description]',
        detailTitleSelector:
          'h1.entry-title, .ts-breadcrumb li:last-child span',
        headers: null,
        latestChapterSelector:
          'div.bxcl li a, div.cl li a, #chapterlist li a, .eph-num a',
        methodType: 'http_template',
        resultSelector: '.utao .uta .imgu, .listupd .bs .bsx, .listo .bs .bsx',
        searchUrlPattern: '{baseUrl}/manga?title={query}&page={page}',
        thumbnailSelector: 'img',
        titleSelector: 'a[title]',
        urlSelector: 'a[href]',
      };
    case 'madara':
    case 'manhwaz':
      return {
        chapterSelector: 'li.wp-manga-chapter a, .chapter-list a',
        descriptionSelector:
          '.description-summary, .summary__content, .entry-content[itemprop=description]',
        detailTitleSelector: 'div.post-title h1, .post-title h1, h1',
        headers: null,
        latestChapterSelector: 'li.wp-manga-chapter a, .chapter-list a',
        methodType: 'http_template',
        resultSelector:
          'div.c-tabs-item__content, .manga__item, div.page-item-detail',
        searchUrlPattern: '{baseUrl}/?s={query}&post_type=wp-manga',
        thumbnailSelector: 'img',
        titleSelector: 'div.post-title a[href], a[href]',
        urlSelector: 'div.post-title a[href], a[href]',
      };
    default:
      return null;
  }
}

async function generateVerification(
  input: SourceDiscoveryVerifyInput,
  deps: {
    fetchFn?: typeof fetch;
  } = {}
) {
  const compactCandidates = input.candidates.map((candidate) => ({
    baseUrl: candidate.baseUrl,
    candidateId: candidate.candidateId,
    description: candidate.description?.slice(0, 900) ?? null,
    extensionName: candidate.extensionName,
    latestChapterName: candidate.latestChapterName ?? null,
    latestChapterNumber: candidate.latestChapterNumber ?? null,
    mangaUrl: candidate.mangaUrl ?? null,
    sourceLanguage: candidate.sourceLanguage,
    sourceName: candidate.sourceName,
    title: candidate.title,
  }));
  const prompt = [
    'You verify manga/manhwa source search results before they are shown to a user.',
    'Return strict JSON with key matches: array of {candidateId, decision, confidence, reason}.',
    'decision must be match, maybe, or reject.',
    'Reject unrelated results even if one generic word overlaps. Match alternate-language titles, romanization differences, subtitles, and common scanlation title variants.',
    'If targetChapter is present, do not reject only because the latest chapter is lower; the app still needs to show it, but confidence can be lower.',
    `User query: ${input.query}`,
    `Search aliases used silently by the app: ${JSON.stringify(input.aliases)}`,
    input.targetChapter ? `Target chapter: ${input.targetChapter}` : '',
    `Candidates: ${JSON.stringify(compactCandidates)}`,
  ]
    .filter(Boolean)
    .join('\n');

  return await generateJsonObject({
    fetchFn: deps.fetchFn,
    prompt,
    schemaName: 'source_discovery_candidate_verification',
  });
}

async function generateTitleCorrection(
  input: SourceDiscoveryTitleCorrectionInput,
  deps: {
    fetchFn?: typeof fetch;
  } = {}
) {
  const prompt = [
    'You help a manga/manhwa reader recover from a failed source search.',
    'The app already tried the provided aliases exactly and found zero usable results.',
    'Return strict JSON with keys: correctedTitle, aliases, confidence, reason.',
    'Only return known/common manga, manhwa, or manhua titles. Prefer official/native titles and common scan titles.',
    'Do not split titles into generic fragments. Do not return aliases already attempted. If unsure, return an empty aliases array.',
    `User query: ${input.query}`,
    `Catalog aliases already tried: ${JSON.stringify(input.catalogAliases)}`,
    `Client aliases already tried: ${JSON.stringify(input.clientAliases)}`,
    `Attempted aliases: ${JSON.stringify(input.attemptedAliases)}`,
    `Searched source count: ${input.searchedCandidateCount}`,
    input.targetChapter ? `Target chapter: ${input.targetChapter}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return await generateJsonObject({
    fetchFn: deps.fetchFn,
    prompt,
    schemaName: 'source_discovery_title_correction',
  });
}

async function generateJsonObject(input: {
  fetchFn?: typeof fetch;
  prompt: string;
  schemaName: string;
}) {
  return await retryProviderCall(
    async () => {
      switch (envServer.TRANSLATION_PROVIDER_PRIMARY) {
        case 'openai':
          return await generateJsonWithOpenAI(input);
        case 'anthropic':
          return await generateJsonWithAnthropic(input);
        case 'gemini':
        default:
          return await generateJsonWithGemini(input);
      }
    },
    {
      maxAttempts: envServer.PROVIDER_RETRY_MAX_ATTEMPTS,
    }
  );
}

async function generateJsonWithGemini(input: {
  fetchFn?: typeof fetch;
  prompt: string;
  schemaName: string;
}) {
  const apiKey = envServer.GEMINI_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.gemini,
      'GEMINI_API_KEY is not configured.'
    );
  }
  const runtimeConfig = (await getProviderGatewayRuntimeConfig()).current;
  const modelName = runtimeConfig.geminiTranslationModel;
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: input.prompt }],
          role: 'user',
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are a precise JSON API for manga source discovery. Return only a valid JSON object.',
          },
        ],
      },
    }),
    fetchFn: input.fetchFn,
    headers: {
      'Content-Type': 'application/json',
    },
    provider: ProviderType.gemini,
    timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
  });
  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.gemini,
    response.text,
    'Gemini returned malformed JSON'
  );
  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const candidate = candidates[0];
  const parts =
    candidate &&
    typeof candidate === 'object' &&
    candidate.content &&
    typeof candidate.content === 'object' &&
    Array.isArray(candidate.content.parts)
      ? candidate.content.parts
      : [];
  const text = parts
    .map((part: unknown) =>
      part && typeof part === 'object' && 'text' in part
        ? String(part.text ?? '')
        : ''
    )
    .join('\n');

  return parseJsonObjectText(
    ProviderType.gemini,
    text,
    `Gemini returned invalid ${input.schemaName} JSON`
  );
}

async function generateJsonWithOpenAI(input: {
  fetchFn?: typeof fetch;
  prompt: string;
  schemaName: string;
}) {
  const apiKey = envServer.OPENAI_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.openai,
      'OPENAI_API_KEY is not configured.'
    );
  }
  const runtimeConfig = (await getProviderGatewayRuntimeConfig()).current;
  const modelName = runtimeConfig.openaiTranslationModel;
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      max_completion_tokens: 4096,
      messages: [
        {
          content:
            'You are a precise JSON API for manga source discovery. Return only a valid JSON object.',
          role: 'system',
        },
        {
          content: input.prompt,
          role: 'user',
        },
      ],
      model: modelName,
      response_format: {
        type: 'json_object',
      },
    }),
    fetchFn: input.fetchFn,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    provider: ProviderType.openai,
    timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: 'https://api.openai.com/v1/chat/completions',
  });
  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.openai,
    response.text,
    'OpenAI returned malformed JSON'
  );
  const choices = Array.isArray(json.choices) ? json.choices : [];
  const choice = choices[0];
  const message =
    choice &&
    typeof choice === 'object' &&
    choice.message &&
    typeof choice.message === 'object'
      ? choice.message
      : null;
  const content =
    message && typeof message.content === 'string' ? message.content : '';

  return parseJsonObjectText(
    ProviderType.openai,
    content,
    `OpenAI returned invalid ${input.schemaName} JSON`
  );
}

async function generateJsonWithAnthropic(input: {
  fetchFn?: typeof fetch;
  prompt: string;
  schemaName: string;
}) {
  const apiKey = envServer.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.anthropic,
      'ANTHROPIC_API_KEY is not configured.'
    );
  }
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      max_tokens: 4096,
      messages: [
        {
          content: input.prompt,
          role: 'user',
        },
      ],
      model: envServer.ANTHROPIC_TRANSLATION_MODEL,
      system:
        'You are a precise JSON API for manga source discovery. Return only a valid JSON object.',
    }),
    fetchFn: input.fetchFn,
    headers: {
      'Anthropic-Version': '2023-06-01',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    provider: ProviderType.anthropic,
    timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: 'https://api.anthropic.com/v1/messages',
  });
  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.anthropic,
    response.text,
    'Anthropic returned malformed JSON'
  );
  const contentBlocks = Array.isArray(json.content) ? json.content : [];
  const text = contentBlocks
    .map((block) =>
      block &&
      typeof block === 'object' &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block
        ? String(block.text ?? '')
        : ''
    )
    .join('\n');

  if (!text.trim()) {
    throw createInvalidProviderResponseError(
      ProviderType.anthropic,
      'Anthropic did not return text content.'
    );
  }

  return parseJsonObjectText(
    ProviderType.anthropic,
    text,
    `Anthropic returned invalid ${input.schemaName} JSON`
  );
}

function scoreCandidate(input: {
  adapterKey: SourceDiscoveryAdapterKey;
  baseUrl: string;
  extensionLang: string;
  extensionName: string;
  prioritizedLanguages: string[];
  sourceLanguage: string;
  sourceName: string;
  themeKey: string | null;
}) {
  const haystack = `${input.extensionName} ${input.sourceName} ${input.baseUrl}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  const prioritizedLanguages = new Set(
    input.prioritizedLanguages.map((language) => language.toLowerCase())
  );
  const sourceLanguage = input.sourceLanguage.toLowerCase();
  const extensionLang = input.extensionLang.toLowerCase();
  const reasonCodes: string[] = [];
  let priority = 0;

  if (input.adapterKey !== 'generic') {
    priority += 30;
    reasonCodes.push('supported_adapter');
  } else if (input.themeKey) {
    priority += 10;
    reasonCodes.push('known_theme');
  }

  for (const [keyword, score] of [
    ['manhwa', 24],
    ['webtoon', 20],
    ['asura', 18],
    ['flame', 16],
    ['toon', 12],
    ['scan', 10],
    ['manga', 8],
    ['comic', 6],
  ] as const) {
    if (haystack.includes(keyword)) {
      priority += score;
      reasonCodes.push(`keyword_${keyword}`);
    }
  }

  if (isFeaturedAsianSource(haystack)) {
    priority += 95;
    reasonCodes.push('featured_asian_source');
  }

  if (
    prioritizedLanguages.has(sourceLanguage) ||
    prioritizedLanguages.has(extensionLang)
  ) {
    priority += 80;
    reasonCodes.push('preferred_language');
    reasonCodes.push('probable_original_language');
  }

  if (
    ASIAN_SOURCE_LANGUAGES.has(sourceLanguage) ||
    ASIAN_SOURCE_LANGUAGES.has(extensionLang)
  ) {
    priority += 35;
    reasonCodes.push('asian_language');
  }

  if (input.sourceLanguage === 'all' || input.extensionLang === 'all') {
    priority += 4;
    reasonCodes.push('all_language');
  }

  return {
    priority,
    reasonCodes: uniqueNonEmpty(reasonCodes),
  };
}

function isFeaturedAsianSource(value: string) {
  const normalized = value.toLowerCase();
  return FEATURED_ASIAN_SOURCE_MATCHERS.some((matcher) =>
    normalized.includes(matcher.toLowerCase())
  );
}

function isFeaturedAsianExtensionSource(input: {
  baseUrl: string;
  extensionName: string;
  sourceName: string;
}) {
  return isFeaturedAsianSource(
    `${input.extensionName} ${input.sourceName} ${input.baseUrl}`
  );
}

function resolveAdapterKey(input: {
  baseUrl: string;
  sourceName: string;
  themeKey: string | null;
}): SourceDiscoveryAdapterKey {
  const sourceKey = `${input.sourceName} ${input.baseUrl}`.toLowerCase();

  if (sourceKey.includes('asura')) return 'asurascans';
  if (
    sourceKey.includes('goda') ||
    sourceKey.includes('godamh') ||
    sourceKey.includes('g-mh') ||
    sourceKey.includes('bzmh.org') ||
    sourceKey.includes('baozimh.org') ||
    sourceKey.includes('m.baozimh.one')
  ) {
    return 'goda';
  }
  if (sourceKey.includes('包子') || sourceKey.includes('baozimanhua')) {
    return 'baozimanhua';
  }
  if (sourceKey.includes('manga ball') || sourceKey.includes('mangaball')) {
    return 'mangaball';
  }
  if (
    input.themeKey &&
    SUPPORTED_DISCOVERY_ADAPTERS.has(input.themeKey.toLowerCase())
  ) {
    return input.themeKey.toLowerCase() as SourceDiscoveryAdapterKey;
  }

  return 'generic';
}

async function loadSourceThemeHints(): Promise<SourceThemeHint[]> {
  const generatedHints = GENERATED_SOURCE_THEME_HINTS.map((hint) => ({
    baseUrl: hint.baseUrl,
    extensionName: hint.extensionName,
    themeKey: hint.themeKey,
  }));
  const sourceRoot = path.resolve(process.cwd(), '../extensions-source');

  try {
    const localHints = await readLocalSourceThemeHints(
      path.join(sourceRoot, 'src')
    );
    return [...generatedHints, ...localHints];
  } catch {
    return generatedHints;
  }
}

async function readLocalSourceThemeHints(
  root: string
): Promise<SourceThemeHint[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nestedHints = await Promise.all(
    entries.map(async (entry) => {
      const itemPath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        return await readLocalSourceThemeHints(itemPath);
      }

      if (entry.name !== 'build.gradle') {
        return [];
      }

      const gradle = await readFile(itemPath, 'utf8');
      const baseUrl = readGradleStringValue(gradle, 'baseUrl');
      const themeKey = readGradleStringValue(gradle, 'themePkg');
      const extensionName = readGradleStringValue(gradle, 'extName');

      if (!baseUrl || !themeKey) {
        return [];
      }

      return [
        {
          baseUrl,
          extensionName,
          themeKey,
        },
      ];
    })
  );

  return nestedHints.flat();
}

function readGradleStringValue(text: string, key: string) {
  return (
    text.match(new RegExp(`${key}\\s*=\\s*['"]([^'"]+)['"]`))?.[1]?.trim() ??
    null
  );
}

function buildThemeHintMap(hints: SourceThemeHint[]) {
  const map = new Map<string, string>();

  for (const hint of hints) {
    map.set(normalizeBaseUrl(hint.baseUrl), hint.themeKey.toLowerCase());
  }

  return map;
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

function parseBaseUrlCandidates(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const matchedUrls = trimmed.match(/https?:\/\/[^#,\s]+/gi);
  const urls = matchedUrls?.map((url) => url.replace(/\/+$/, '')) ?? [
    trimmed.replace(/#+$/, '').replace(/\/+$/, ''),
  ];

  return uniqueNonEmpty(urls);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

function normalizeMethodType(
  value: string
): SourceDiscoverySearchMethod['methodType'] {
  if (
    value === 'http_template' ||
    value === 'custom_adapter' ||
    value === 'unsupported'
  ) {
    return value;
  }

  return 'unsupported';
}

function normalizeMethodStatus(
  value: string
): SourceDiscoverySearchMethod['status'] {
  if (
    value === 'working' ||
    value === 'stale' ||
    value === 'cloudflare' ||
    value === 'failed' ||
    value === 'unsupported' ||
    value === 'unknown'
  ) {
    return value;
  }

  return 'unknown';
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeSourceDiscoveryApiAliases(values: string[]) {
  return uniqueNonEmpty(values).slice(0, MAX_ALIASES);
}

export class SourceDiscoveryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}
