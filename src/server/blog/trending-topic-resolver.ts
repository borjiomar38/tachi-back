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
const ANILIST_MANGA_PAGE_URL = 'https://anilist.co/manga';
const BLOG_RESOLVER_USER_AGENT = 'NayoviBlogBot/1.0 (+https://nayovi.com)';
const DEFAULT_CANDIDATE_LIMIT = 6;
const DEFAULT_SEARCH_LIMIT = 30;
const FETCH_TIMEOUT_MS = 12_000;
const KITSU_TRENDING_MANGA_URL = 'https://kitsu.io/api/edge/trending/manga';
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
        ageRating: z.string().nullable().optional(),
        averageRating: z.string().nullable().optional(),
        canonicalTitle: z.string(),
        favoritesCount: z.number().int().nonnegative().optional(),
        mangaType: z.string().nullable().optional(),
        popularityRank: z.number().int().positive().nullable().optional(),
        ratingRank: z.number().int().positive().nullable().optional(),
        slug: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        subtype: z.string().nullable().optional(),
        titles: z.record(z.string(), z.string()).nullable().optional(),
        updatedAt: z.string().nullable().optional(),
        userCount: z.number().int().nonnegative().optional(),
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

const zKitsuMapping = z
  .object({
    attributes: z
      .object({
        externalId: z.string().min(1),
        externalSite: z.string().min(1),
      })
      .passthrough(),
    id: z.string().min(1),
    type: z.literal('mappings'),
  })
  .passthrough();

const zKitsuMappingsResponse = z
  .object({
    data: z.array(zKitsuMapping),
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
  let media: z.infer<typeof zAnilistMedia>[];

  try {
    media = await fetchAnilistTrendingManga({
      fetchImpl,
      limit: searchLimit,
    });
  } catch (anilistError) {
    try {
      return await resolveKitsuTrendingMangaCandidates({
        anilistError,
        candidateLimit,
        existingTopics: options.existingTopics,
        fetchImpl,
        resolvedAt,
        searchLimit,
      });
    } catch (kitsuError) {
      throw new Error(
        `AniList trend source failed (${toErrorMessage(anilistError)}); Kitsu fallback failed (${toErrorMessage(kitsuError)}).`
      );
    }
  }

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

async function resolveKitsuTrendingMangaCandidates(input: {
  anilistError: unknown;
  candidateLimit: number;
  existingTopics: readonly ExistingBlogTopic[];
  fetchImpl: typeof fetch;
  resolvedAt: string;
  searchLimit: number;
}): Promise<TrendingMangaResolverResult> {
  const manga = await fetchKitsuTrendingManga({
    fetchImpl: input.fetchImpl,
    limit: input.searchLimit,
  });
  const candidates: TrendingMangaCandidate[] = [];
  const rejected: TrendingMangaCandidateRejection[] = [
    {
      reason: `Primary trend source unavailable; Kitsu fallback activated: ${toErrorMessage(input.anilistError)}`,
      title: 'AniList trend feed',
    },
  ];

  for (const [index, item] of manga.entries()) {
    const title = getKitsuTitle(item);
    const aliases = buildKitsuAliases(item);
    const subtype =
      item.attributes.subtype ?? item.attributes.mangaType ?? null;

    if (
      !isAllowedKitsuManga({
        ageRating: item.attributes.ageRating ?? null,
        subtype,
      })
    ) {
      rejected.push({
        reason: `Unsupported Kitsu manga subtype or age rating: ${subtype ?? 'unknown'} / ${item.attributes.ageRating ?? 'unknown'}`,
        title,
      });
      continue;
    }

    const duplicate = findDuplicateBlogTopic(
      {
        aliases,
        manhwaTitle: title,
        title,
      },
      input.existingTopics
    );

    if (duplicate) {
      rejected.push({
        reason: `Already covered as ${duplicate.manhwaTitle}`,
        title,
      });
      continue;
    }

    try {
      candidates.push(
        await buildKitsuTrendingCandidate({
          fetchImpl: input.fetchImpl,
          item,
          resolvedAt: input.resolvedAt,
          trendRank: index + 1,
        })
      );
    } catch (error) {
      rejected.push({
        reason: `Kitsu fallback verification failed: ${toErrorMessage(error)}`,
        title,
      });
      continue;
    }

    if (candidates.length >= input.candidateLimit) {
      break;
    }
  }

  return {
    candidates,
    rejected,
    resolvedAt: input.resolvedAt,
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

  let media: z.infer<typeof zAnilistMedia>[];

  try {
    media = await fetchAnilistTrendingManga({
      fetchImpl,
      limit: searchLimit,
    });
  } catch {
    return await validateKitsuTrendingMangaSelection({
      claim: options.claim,
      fetchImpl,
      resolvedAt,
      searchLimit,
    });
  }

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

  assertClaimMatchesCandidate(options.claim, candidate);

  return candidate;
}

async function validateKitsuTrendingMangaSelection(input: {
  claim: BlogTopicSelectionClaim;
  fetchImpl: typeof fetch;
  resolvedAt: string;
  searchLimit: number;
}): Promise<TrendingMangaCandidate> {
  if (!input.claim.kitsuId) {
    throw new Error(
      'AniList is unavailable and the draft has no Kitsu fallback id.'
    );
  }

  const manga = await fetchKitsuTrendingManga({
    fetchImpl: input.fetchImpl,
    limit: input.searchLimit,
  });
  const matchingManga = manga
    .map((item, index) => ({
      item,
      trendRank: index + 1,
    }))
    .find((entry) => entry.item.id === input.claim.kitsuId);

  if (!matchingManga) {
    throw new Error(
      'The selected title is not currently eligible in the Kitsu fallback trend resolver.'
    );
  }

  const candidate = await buildKitsuTrendingCandidate({
    expectedAnilistId: input.claim.anilistId,
    fetchImpl: input.fetchImpl,
    item: matchingManga.item,
    resolvedAt: input.resolvedAt,
    trendRank: matchingManga.trendRank,
  });

  assertClaimMatchesCandidate(input.claim, candidate);

  return candidate;
}

function assertClaimMatchesCandidate(
  claim: BlogTopicSelectionClaim,
  candidate: TrendingMangaCandidate
): void {
  if (candidate.anilistId !== claim.anilistId) {
    throw new Error('The draft AniList id does not match sources.');
  }

  if (candidate.type !== claim.type) {
    throw new Error(
      'The draft manga/manhwa/manhua type does not match sources.'
    );
  }

  if (candidate.malId && claim.malId !== candidate.malId) {
    throw new Error('The draft MyAnimeList id does not match sources.');
  }

  if (candidate.kitsuId && claim.kitsuId !== candidate.kitsuId) {
    throw new Error('The draft Kitsu id does not match sources.');
  }

  const claimAliases = buildBlogTopicAliases([claim.title, ...claim.aliases]);

  if (!hasBlogTopicAliasOverlap(candidate.aliases, claimAliases)) {
    throw new Error('The draft title aliases do not match the verified title.');
  }

  const verifiedUrls = new Set(
    candidate.sourceEvidence.map((source) => source.url)
  );
  const matchingSourceCount = claim.sourceUrls.filter((url) =>
    verifiedUrls.has(url)
  ).length;

  if (matchingSourceCount < 2) {
    throw new Error('The draft does not cite both verified source URLs.');
  }
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
      'User-Agent': BLOG_RESOLVER_USER_AGENT,
    },
    method: 'POST',
    url: ANILIST_GRAPHQL_URL,
  });
  const parsed = zAnilistTrendingResponse.parse(responseJson);

  return parsed.data.Page.media.filter((item) => item.trending > 0);
}

async function fetchKitsuTrendingManga(input: {
  fetchImpl: typeof fetch;
  limit: number;
}): Promise<z.infer<typeof zKitsuManga>[]> {
  const responseJson = await fetchJson({
    fetchImpl: input.fetchImpl,
    url: `${KITSU_TRENDING_MANGA_URL}?limit=${input.limit}`,
  });
  const parsed = zKitsuSearchResponse.parse(responseJson);

  return parsed.data;
}

async function buildKitsuTrendingCandidate(input: {
  expectedAnilistId?: number;
  fetchImpl: typeof fetch;
  item: z.infer<typeof zKitsuManga>;
  resolvedAt: string;
  trendRank: number;
}): Promise<TrendingMangaCandidate> {
  const title = getKitsuTitle(input.item);
  const kitsuAliases = buildKitsuAliases(input.item);
  const mappings = await fetchKitsuMappings({
    fetchImpl: input.fetchImpl,
    kitsuId: input.item.id,
  });
  const anilistId = findMappedInteger(mappings, 'anilist/manga');

  if (!anilistId) {
    throw new Error('Kitsu has no AniList manga mapping for this title.');
  }

  if (input.expectedAnilistId && input.expectedAnilistId !== anilistId) {
    throw new Error('The Kitsu mapping does not match the draft AniList id.');
  }

  const anilistUrl = `${ANILIST_MANGA_PAGE_URL}/${anilistId}`;
  const anilistTitle = await fetchAnilistPageTitle({
    fetchImpl: input.fetchImpl,
    url: anilistUrl,
  });
  const anilistAliases = buildBlogTopicAliases([anilistTitle]);

  if (!hasBlogTopicAliasOverlap(kitsuAliases, anilistAliases)) {
    throw new Error(
      'The mapped AniList page does not confirm the Kitsu title.'
    );
  }

  const aliases = buildBlogTopicAliases([...kitsuAliases, anilistTitle]);

  if (aliases.length < 2) {
    throw new Error('The verified title does not expose enough aliases.');
  }

  const subtype =
    input.item.attributes.subtype ?? input.item.attributes.mangaType ?? null;
  const type = resolveKitsuWorkType(subtype);
  const canonicalId = `anilist:${anilistId}`;
  const trendScore = Math.max(1, input.item.attributes.userCount ?? 1);
  const malId = findMappedInteger(mappings, 'myanimelist/manga');

  return {
    aliases,
    anilistId,
    canonicalId,
    countryOfOrigin: resolveKitsuCountryOfOrigin(type),
    kitsuId: input.item.id,
    malId,
    sourceEvidence: [
      {
        canonicalId: `kitsu:${input.item.id}`,
        kind: 'kitsu',
        metadata: compactMetadata({
          ageRating: input.item.attributes.ageRating ?? null,
          averageRating: input.item.attributes.averageRating ?? null,
          favoritesCount: input.item.attributes.favoritesCount,
          popularityRank: input.item.attributes.popularityRank ?? null,
          ratingRank: input.item.attributes.ratingRank ?? null,
          status: input.item.attributes.status ?? null,
          subtype,
          trendRank: input.trendRank,
          updatedAt: input.item.attributes.updatedAt ?? null,
          userCount: input.item.attributes.userCount,
        }),
        retrievedAt: input.resolvedAt,
        role: 'trend',
        sourceName: 'Kitsu',
        title,
        url: `https://kitsu.io/manga/${input.item.id}`,
      },
      {
        canonicalId,
        kind: 'anilist',
        metadata: compactMetadata({
          anilistId,
          mappedBy: 'Kitsu',
          pageTitle: anilistTitle,
        }),
        retrievedAt: input.resolvedAt,
        role: 'canonical',
        sourceName: 'AniList',
        title: anilistTitle,
        url: anilistUrl,
      },
    ],
    title,
    trendRank: input.trendRank,
    trendRationale: buildKitsuTrendRationale({
      title,
      trendRank: input.trendRank,
      type,
    }),
    trendScore,
    type,
  };
}

async function fetchKitsuMappings(input: {
  fetchImpl: typeof fetch;
  kitsuId: string;
}): Promise<z.infer<typeof zKitsuMapping>[]> {
  const responseJson = await fetchJson({
    fetchImpl: input.fetchImpl,
    url: `https://kitsu.io/api/edge/manga/${encodeURIComponent(input.kitsuId)}/mappings`,
  });
  const parsed = zKitsuMappingsResponse.parse(responseJson);

  return parsed.data;
}

async function fetchAnilistPageTitle(input: {
  fetchImpl: typeof fetch;
  url: string;
}): Promise<string> {
  const html = await fetchText(input);
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const property = readHtmlAttribute(tag, 'property');

    if (property?.toLowerCase() !== 'og:title') {
      continue;
    }

    const content = readHtmlAttribute(tag, 'content');

    if (content?.trim()) {
      return decodeHtmlEntities(content.trim());
    }
  }

  throw new Error('The mapped AniList page has no readable title metadata.');
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

async function fetchText(input: {
  fetchImpl: typeof fetch;
  url: string;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await input.fetchImpl(input.url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': BLOG_RESOLVER_USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Fetch failed with HTTP ${response.status}: ${input.url}`
      );
    }

    return await response.text();
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

function getKitsuTitle(item: z.infer<typeof zKitsuManga>): string {
  return (
    item.attributes.titles?.['en'] ??
    item.attributes.titles?.['en_us'] ??
    item.attributes.canonicalTitle
  );
}

function findMappedInteger(
  mappings: readonly z.infer<typeof zKitsuMapping>[],
  externalSite: string
): number | null {
  const value = mappings.find(
    (mapping) =>
      mapping.attributes.externalSite.toLowerCase() ===
      externalSite.toLowerCase()
  )?.attributes.externalId;

  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveKitsuWorkType(subtype: string | null): BlogWorkType {
  const normalizedSubtype = subtype?.trim().toLowerCase();

  if (normalizedSubtype === 'manhwa') {
    return 'manhwa';
  }

  if (normalizedSubtype === 'manhua') {
    return 'manhua';
  }

  return 'manga';
}

function resolveKitsuCountryOfOrigin(type: BlogWorkType): string | null {
  const countries = {
    manga: null,
    manhua: 'CN',
    manhwa: 'KR',
  } satisfies Record<BlogWorkType, string | null>;

  return countries[type];
}

function isAllowedKitsuManga(input: {
  ageRating: string | null;
  subtype: string | null;
}): boolean {
  return (
    input.subtype?.trim().toLowerCase() !== 'novel' &&
    input.ageRating?.trim().toUpperCase() !== 'R18'
  );
}

function readHtmlAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag);

  return match?.[2] ?? null;
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  };

  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, named: string) => {
      if (decimal) {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      }

      if (hexadecimal) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }

      return namedEntities[named.toLowerCase()] ?? entity;
    }
  );
}

function buildTrendRationale(candidate: BaseTrendingCandidate): string {
  const typeLabels = {
    manga: 'manga',
    manhua: 'manhua',
    manhwa: 'manhwa',
  } satisfies Record<BlogWorkType, string>;

  return `${candidate.title} is currently in AniList's manga trend feed at rank ${candidate.trendRank} with trend score ${candidate.trendScore}, then confirmed against a second canonical metadata source before article generation. Treat it as a ${typeLabels[candidate.type]} topic and avoid unsourced claims beyond the verified metadata.`;
}

function buildKitsuTrendRationale(input: {
  title: string;
  trendRank: number;
  type: BlogWorkType;
}): string {
  return `${input.title} is currently in Kitsu's manga trend feed at rank ${input.trendRank}, and Kitsu's external mapping was confirmed against the title metadata on the canonical AniList page. Treat it as a ${input.type} topic and avoid unsourced claims beyond the verified metadata.`;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
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
