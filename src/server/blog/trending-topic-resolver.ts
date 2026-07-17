import { z } from 'zod';

import {
  BlogWorkType,
  buildBlogTopicAliases,
  ExistingBlogTopic,
  findDuplicateBlogTopic,
  hasBlogTopicAliasOverlap,
} from '@/server/blog/topic-policy';

export type TrendSourceKind = 'anilist' | 'kitsu' | 'myanimelist';
export type TrendSourceRole = 'canonical' | 'metadata' | 'trend';
export type TrendEvidenceMetadataValue = boolean | null | number | string;

export interface TrendSourceEvidence {
  canonicalId: string;
  kind: TrendSourceKind;
  metadata: Record<string, TrendEvidenceMetadataValue>;
  retrievedAt: string;
  role: TrendSourceRole;
  sourceName: string;
  title: string;
  url: string;
}

export interface TrendingMangaCandidate {
  aliases: string[];
  anilistId: number;
  canonicalId: string;
  countryOfOrigin: string | null;
  kitsuId: string | null;
  malId: number | null;
  sourceEvidence: TrendSourceEvidence[];
  title: string;
  trendRank: number;
  trendRationale: string;
  trendScore: number;
  type: BlogWorkType;
}

export interface TrendingMangaCandidateRejection {
  reason: string;
  title: string;
}

export interface TrendingMangaResolverResult {
  candidates: TrendingMangaCandidate[];
  rejected: TrendingMangaCandidateRejection[];
  resolvedAt: string;
}

export interface ResolveTrendingMangaCandidatesOptions {
  candidateLimit?: number;
  existingTopics: readonly ExistingBlogTopic[];
  fetchImpl?: typeof fetch;
  now?: Date;
  searchLimit?: number;
}

export interface BlogTopicSelectionClaim {
  aliases: readonly string[];
  anilistId: number;
  canonicalId: string;
  kitsuId: string | null;
  malId: number | null;
  sourceUrls: readonly string[];
  title: string;
  type: BlogWorkType;
}

export interface ValidateTrendingMangaSelectionOptions {
  claim: BlogTopicSelectionClaim;
  fetchImpl?: typeof fetch;
  now?: Date;
  searchLimit?: number;
}

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';
const DEFAULT_CANDIDATE_LIMIT = 6;
const DEFAULT_SEARCH_LIMIT = 30;
const FETCH_TIMEOUT_MS = 12_000;
const SECONDARY_SOURCE_LIMIT = 18;

const workTypeByCountry: Record<string, BlogWorkType> = {
  CN: 'manhua',
  HK: 'manhua',
  JP: 'manga',
  KR: 'manhwa',
  TW: 'manhua',
};

const zAnilistTitle = z
  .object({
    english: z.string().nullable(),
    native: z.string().nullable(),
    romaji: z.string().nullable(),
    userPreferred: z.string().nullable(),
  })
  .strict();

const zAnilistMedia = z
  .object({
    countryOfOrigin: z.string().nullable(),
    format: z.string().nullable(),
    id: z.number().int().positive(),
    idMal: z.number().int().positive().nullable(),
    popularity: z.number().int().nonnegative(),
    siteUrl: z.url(),
    status: z.string().nullable(),
    synonyms: z.array(z.string()),
    title: zAnilistTitle,
    trending: z.number().int().nonnegative(),
  })
  .strict();

const zAnilistTrendingResponse = z
  .object({
    data: z
      .object({
        Page: z
          .object({
            media: z.array(zAnilistMedia),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const zJikanTitle = z
  .object({
    title: z.string(),
    type: z.string(),
  })
  .strict();

const zJikanMangaResponse = z
  .object({
    data: z
      .object({
        authors: z
          .array(
            z
              .object({
                name: z.string(),
                url: z.url().nullable(),
              })
              .strict()
          )
          .optional(),
        mal_id: z.number().int().positive(),
        members: z.number().int().nonnegative().nullable().optional(),
        popularity: z.number().int().positive().nullable().optional(),
        rank: z.number().int().positive().nullable().optional(),
        score: z.number().nullable().optional(),
        status: z.string().nullable().optional(),
        title: z.string(),
        titles: z.array(zJikanTitle),
        type: z.string().nullable().optional(),
        url: z.url(),
      })
      .passthrough(),
  })
  .passthrough();

const zKitsuManga = z
  .object({
    attributes: z
      .object({
        abbreviatedTitles: z.array(z.string()).nullable().optional(),
        canonicalTitle: z.string(),
        mangaType: z.string().nullable().optional(),
        popularityRank: z.number().int().positive().nullable().optional(),
        ratingRank: z.number().int().positive().nullable().optional(),
        slug: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        titles: z.record(z.string(), z.string()).nullable().optional(),
      })
      .passthrough(),
    id: z.string().min(1),
    type: z.literal('manga'),
  })
  .passthrough();

const zKitsuSearchResponse = z
  .object({
    data: z.array(zKitsuManga),
  })
  .passthrough();

interface BaseTrendingCandidate {
  aliases: string[];
  anilistId: number;
  canonicalId: string;
  countryOfOrigin: string | null;
  format: string | null;
  malId: number | null;
  sourceEvidence: TrendSourceEvidence[];
  status: string | null;
  title: string;
  trendRank: number;
  trendScore: number;
  type: BlogWorkType;
}

export async function resolveTrendingMangaCandidates(
  options: ResolveTrendingMangaCandidatesOptions
): Promise<TrendingMangaResolverResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const resolvedAt = (options.now ?? new Date()).toISOString();
  const candidateLimit = options.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
  const searchLimit = options.searchLimit ?? DEFAULT_SEARCH_LIMIT;
  const media = await fetchAnilistTrendingManga({
    fetchImpl,
    limit: searchLimit,
  });
  const candidates: TrendingMangaCandidate[] = [];
  const rejected: TrendingMangaCandidateRejection[] = [];

  for (const [index, item] of media.entries()) {
    const baseCandidate = buildBaseTrendingCandidate({
      item,
      resolvedAt,
      trendRank: index + 1,
    });

    if (!isAllowedAnilistFormat(baseCandidate.format)) {
      rejected.push({
        reason: `Unsupported AniList format: ${baseCandidate.format ?? 'unknown'}`,
        title: baseCandidate.title,
      });
      continue;
    }

    const duplicate = findDuplicateBlogTopic(
      {
        aliases: baseCandidate.aliases,
        manhwaTitle: baseCandidate.title,
        title: baseCandidate.title,
      },
      options.existingTopics
    );

    if (duplicate) {
      rejected.push({
        reason: `Already covered as ${duplicate.manhwaTitle}`,
        title: baseCandidate.title,
      });
      continue;
    }

    const verifiedCandidate = await verifyCandidateWithSecondarySource({
      baseCandidate,
      fetchImpl,
      resolvedAt,
    });

    if (!verifiedCandidate) {
      rejected.push({
        reason: 'No second credible source confirmed this title.',
        title: baseCandidate.title,
      });
      continue;
    }

    candidates.push(verifiedCandidate);

    if (candidates.length >= candidateLimit) {
      break;
    }
  }

  return {
    candidates,
    rejected,
    resolvedAt,
  };
}

export async function validateTrendingMangaSelection(
  options: ValidateTrendingMangaSelectionOptions
): Promise<TrendingMangaCandidate> {
  const expectedCanonicalId = `anilist:${options.claim.anilistId}`;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const resolvedAt = (options.now ?? new Date()).toISOString();
  const searchLimit = options.searchLimit ?? DEFAULT_SEARCH_LIMIT;

  if (options.claim.canonicalId !== expectedCanonicalId) {
    throw new Error('The draft canonicalId does not match the AniList id.');
  }

  const media = await fetchAnilistTrendingManga({
    fetchImpl,
    limit: searchLimit,
  });
  const matchingMedia = media
    .map((item, index) => ({
      item,
      trendRank: index + 1,
    }))
    .find((item) => item.item.id === options.claim.anilistId);

  if (!matchingMedia) {
    throw new Error(
      'The selected title is not currently eligible in the verified trend resolver.'
    );
  }

  const baseCandidate = buildBaseTrendingCandidate({
    item: matchingMedia.item,
    resolvedAt,
    trendRank: matchingMedia.trendRank,
  });

  if (!isAllowedAnilistFormat(baseCandidate.format)) {
    throw new Error('The selected AniList title is not a manga-format work.');
  }

  const candidate = await verifyCandidateWithSecondarySource({
    baseCandidate,
    fetchImpl,
    resolvedAt,
  });

  if (!candidate) {
    throw new Error('The selected title is not confirmed by a second source.');
  }

  if (candidate.type !== options.claim.type) {
    throw new Error(
      'The draft manga/manhwa/manhua type does not match sources.'
    );
  }

  if (candidate.malId && options.claim.malId !== candidate.malId) {
    throw new Error('The draft MyAnimeList id does not match sources.');
  }

  if (candidate.kitsuId && options.claim.kitsuId !== candidate.kitsuId) {
    throw new Error('The draft Kitsu id does not match sources.');
  }

  const claimAliases = buildBlogTopicAliases([
    options.claim.title,
    ...options.claim.aliases,
  ]);

  if (!hasBlogTopicAliasOverlap(candidate.aliases, claimAliases)) {
    throw new Error('The draft title aliases do not match the verified title.');
  }

  const verifiedUrls = new Set(
    candidate.sourceEvidence.map((source) => source.url)
  );
  const matchingSourceCount = options.claim.sourceUrls.filter((url) =>
    verifiedUrls.has(url)
  ).length;

  if (matchingSourceCount < 2) {
    throw new Error('The draft does not cite both verified source URLs.');
  }

  return candidate;
}

function buildBaseTrendingCandidate(input: {
  item: z.infer<typeof zAnilistMedia>;
  resolvedAt: string;
  trendRank: number;
}): BaseTrendingCandidate {
  const title =
    input.item.title.english ??
    input.item.title.romaji ??
    input.item.title.userPreferred ??
    input.item.title.native ??
    `AniList manga ${input.item.id}`;
  const aliases = buildBlogTopicAliases([
    title,
    input.item.title.english,
    input.item.title.native,
    input.item.title.romaji,
    input.item.title.userPreferred,
    ...input.item.synonyms,
  ]);
  const type = workTypeByCountry[input.item.countryOfOrigin ?? ''] ?? 'manga';
  const canonicalId = `anilist:${input.item.id}`;

  return {
    aliases,
    anilistId: input.item.id,
    canonicalId,
    countryOfOrigin: input.item.countryOfOrigin,
    format: input.item.format,
    malId: input.item.idMal,
    sourceEvidence: [
      {
        canonicalId,
        kind: 'anilist',
        metadata: compactMetadata({
          anilistId: input.item.id,
          countryOfOrigin: input.item.countryOfOrigin,
          format: input.item.format,
          myAnimeListId: input.item.idMal,
          popularity: input.item.popularity,
          status: input.item.status,
          trendRank: input.trendRank,
          trending: input.item.trending,
        }),
        retrievedAt: input.resolvedAt,
        role: 'trend',
        sourceName: 'AniList',
        title,
        url: input.item.siteUrl,
      },
    ],
    status: input.item.status,
    title,
    trendRank: input.trendRank,
    trendScore: input.item.trending,
    type,
  };
}

async function verifyCandidateWithSecondarySource(input: {
  baseCandidate: BaseTrendingCandidate;
  fetchImpl: typeof fetch;
  resolvedAt: string;
}): Promise<TrendingMangaCandidate | null> {
  const jikanEvidence = input.baseCandidate.malId
    ? await fetchJikanEvidence({
        baseCandidate: input.baseCandidate,
        fetchImpl: input.fetchImpl,
        resolvedAt: input.resolvedAt,
      }).catch(() => null)
    : null;
  const kitsuEvidence =
    jikanEvidence === null
      ? await fetchKitsuEvidence({
          baseCandidate: input.baseCandidate,
          fetchImpl: input.fetchImpl,
          resolvedAt: input.resolvedAt,
        }).catch(() => null)
      : null;
  const secondaryEvidence = jikanEvidence ?? kitsuEvidence;

  if (!secondaryEvidence) {
    return null;
  }

  return {
    aliases: [
      ...new Set([
        ...input.baseCandidate.aliases,
        ...secondaryEvidence.aliases,
      ]),
    ],
    anilistId: input.baseCandidate.anilistId,
    canonicalId: input.baseCandidate.canonicalId,
    countryOfOrigin: input.baseCandidate.countryOfOrigin,
    kitsuId: secondaryEvidence.kitsuId,
    malId: input.baseCandidate.malId,
    sourceEvidence: [
      ...input.baseCandidate.sourceEvidence,
      secondaryEvidence.evidence,
    ],
    title: input.baseCandidate.title,
    trendRank: input.baseCandidate.trendRank,
    trendRationale: buildTrendRationale(input.baseCandidate),
    trendScore: input.baseCandidate.trendScore,
    type: input.baseCandidate.type,
  };
}

async function fetchAnilistTrendingManga(input: {
  fetchImpl: typeof fetch;
  limit: number;
}): Promise<z.infer<typeof zAnilistMedia>[]> {
  const responseJson = await fetchJson({
    body: JSON.stringify({
      query: `
        query TrendingManga($perPage: Int!) {
          Page(page: 1, perPage: $perPage) {
            media(type: MANGA, sort: TRENDING_DESC, isAdult: false) {
              id
              idMal
              siteUrl
              title {
                english
                native
                romaji
                userPreferred
              }
              synonyms
              countryOfOrigin
              trending
              popularity
              format
              status
            }
          }
        }
      `,
      variables: {
        perPage: input.limit,
      },
    }),
    fetchImpl: input.fetchImpl,
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    url: ANILIST_GRAPHQL_URL,
  });
  const parsed = zAnilistTrendingResponse.parse(responseJson);

  return parsed.data.Page.media.filter((item) => item.trending > 0);
}

async function fetchJikanEvidence(input: {
  baseCandidate: BaseTrendingCandidate;
  fetchImpl: typeof fetch;
  resolvedAt: string;
}): Promise<{
  aliases: string[];
  evidence: TrendSourceEvidence;
  kitsuId: null;
}> {
  const responseJson = await fetchJson({
    fetchImpl: input.fetchImpl,
    url: `https://api.jikan.moe/v4/manga/${input.baseCandidate.malId}`,
  });
  const parsed = zJikanMangaResponse.parse(responseJson);
  const aliases = buildBlogTopicAliases([
    parsed.data.title,
    ...parsed.data.titles.map((title) => title.title),
  ]);

  if (parsed.data.mal_id !== input.baseCandidate.malId) {
    throw new Error('Jikan returned a different MyAnimeList id.');
  }

  return {
    aliases,
    evidence: {
      canonicalId: `myanimelist:${parsed.data.mal_id}`,
      kind: 'myanimelist',
      metadata: compactMetadata({
        author:
          parsed.data.authors?.map((author) => author.name).join(', ') ?? null,
        members: parsed.data.members ?? null,
        myAnimeListId: parsed.data.mal_id,
        popularity: parsed.data.popularity ?? null,
        rank: parsed.data.rank ?? null,
        score: parsed.data.score ?? null,
        status: parsed.data.status ?? null,
        type: parsed.data.type ?? null,
      }),
      retrievedAt: input.resolvedAt,
      role: 'canonical',
      sourceName: 'MyAnimeList via Jikan',
      title: parsed.data.title,
      url: parsed.data.url,
    },
    kitsuId: null,
  };
}

async function fetchKitsuEvidence(input: {
  baseCandidate: BaseTrendingCandidate;
  fetchImpl: typeof fetch;
  resolvedAt: string;
}): Promise<{
  aliases: string[];
  evidence: TrendSourceEvidence;
  kitsuId: string;
}> {
  const query = encodeURIComponent(input.baseCandidate.title);
  const responseJson = await fetchJson({
    fetchImpl: input.fetchImpl,
    url: `https://kitsu.io/api/edge/manga?filter[text]=${query}&page[limit]=5`,
  });
  const parsed = zKitsuSearchResponse.parse(responseJson);
  const matchingManga = parsed.data
    .slice(0, SECONDARY_SOURCE_LIMIT)
    .map((item) => ({
      aliases: buildKitsuAliases(item),
      item,
    }))
    .find((item) =>
      hasBlogTopicAliasOverlap(input.baseCandidate.aliases, item.aliases)
    );

  if (!matchingManga) {
    throw new Error('Kitsu did not confirm the AniList title aliases.');
  }

  return {
    aliases: matchingManga.aliases,
    evidence: {
      canonicalId: `kitsu:${matchingManga.item.id}`,
      kind: 'kitsu',
      metadata: compactMetadata({
        kitsuId: matchingManga.item.id,
        mangaType: matchingManga.item.attributes.mangaType ?? null,
        popularityRank: matchingManga.item.attributes.popularityRank ?? null,
        ratingRank: matchingManga.item.attributes.ratingRank ?? null,
        slug: matchingManga.item.attributes.slug ?? null,
        status: matchingManga.item.attributes.status ?? null,
      }),
      retrievedAt: input.resolvedAt,
      role: 'canonical',
      sourceName: 'Kitsu',
      title: matchingManga.item.attributes.canonicalTitle,
      url: `https://kitsu.io/manga/${matchingManga.item.id}`,
    },
    kitsuId: matchingManga.item.id,
  };
}

async function fetchJson(input: {
  body?: BodyInit;
  fetchImpl: typeof fetch;
  headers?: HeadersInit;
  method?: string;
  url: string;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await input.fetchImpl(input.url, {
      body: input.body,
      headers: input.headers,
      method: input.method ?? 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Fetch failed with HTTP ${response.status}: ${input.url}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildKitsuAliases(item: z.infer<typeof zKitsuManga>): string[] {
  return buildBlogTopicAliases([
    item.attributes.canonicalTitle,
    item.attributes.slug,
    ...(item.attributes.abbreviatedTitles ?? []),
    ...Object.values(item.attributes.titles ?? {}),
  ]);
}

function buildTrendRationale(candidate: BaseTrendingCandidate): string {
  const typeLabels = {
    manga: 'manga',
    manhua: 'manhua',
    manhwa: 'manhwa',
  } satisfies Record<BlogWorkType, string>;

  return `${candidate.title} is currently in AniList's manga trend feed at rank ${candidate.trendRank} with trend score ${candidate.trendScore}, then confirmed against a second canonical metadata source before article generation. Treat it as a ${typeLabels[candidate.type]} topic and avoid unsourced claims beyond the verified metadata.`;
}

function compactMetadata(
  input: Record<string, TrendEvidenceMetadataValue | undefined>
): Record<string, TrendEvidenceMetadataValue> {
  return Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, TrendEvidenceMetadataValue] =>
        entry[1] !== undefined
    )
  );
}

function isAllowedAnilistFormat(format: string | null): boolean {
  return format !== 'NOVEL';
}
