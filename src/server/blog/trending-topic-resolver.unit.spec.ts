import { describe, expect, it } from 'vitest';

import {
  resolveTrendingMangaCandidates,
  validateTrendingMangaSelection,
} from '@/server/blog/trending-topic-resolver';

const resolvedAt = new Date('2026-07-17T00:00:00.000Z');

describe('trending manga topic resolver', () => {
  it('selects a real trending candidate only after a second source confirms it', async () => {
    const result = await resolveTrendingMangaCandidates({
      candidateLimit: 1,
      existingTopics: [],
      fetchImpl: buildFetchMock(),
      now: resolvedAt,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      anilistId: 30013,
      canonicalId: 'anilist:30013',
      malId: 13,
      title: 'One Piece',
      type: 'manga',
    });
    expect(
      result.candidates[0]?.sourceEvidence.map((source) => source.kind)
    ).toEqual(['anilist', 'myanimelist']);
  });

  it('does not return a trending title already covered by aliases or slug', async () => {
    const result = await resolveTrendingMangaCandidates({
      candidateLimit: 1,
      existingTopics: [
        {
          manhwaTitle: 'One Piece',
          slug: 'manga-translate-ia-one-piece-tachiyomiat-2026-04-26',
          title: 'One Piece manga Translation Guide for TachiyomiAT',
        },
      ],
      fetchImpl: buildFetchMock(),
      now: resolvedAt,
    });

    expect(result.candidates[0]?.title).toBe('Witch Hat Atelier');
    expect(result.rejected).toContainEqual({
      reason: 'Already covered as One Piece',
      title: 'One Piece',
    });
  });

  it('rejects a fictional candidate that is not in the verified trend result', async () => {
    await expect(
      validateTrendingMangaSelection({
        claim: {
          aliases: ['Endurance Doctor'],
          anilistId: 999_999,
          canonicalId: 'anilist:999999',
          kitsuId: null,
          malId: 999_999,
          sourceUrls: [
            'https://anilist.co/manga/999999/Endurance-Doctor/',
            'https://myanimelist.net/manga/999999/Endurance_Doctor',
          ],
          title: 'Endurance Doctor',
          type: 'manhwa',
        },
        fetchImpl: buildFetchMock(),
        now: resolvedAt,
      })
    ).rejects.toThrow(/not currently eligible/i);
  });
});

function buildFetchMock(): typeof fetch {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url === 'https://graphql.anilist.co') {
      return Response.json(buildAnilistResponse());
    }

    if (url === 'https://api.jikan.moe/v4/manga/100035') {
      return Response.json(buildJikanWitchHatResponse());
    }

    if (url === 'https://api.jikan.moe/v4/manga/13') {
      return Response.json(buildJikanOnePieceResponse());
    }

    return new Response('not found', {
      status: 404,
    });
  };
}

function buildAnilistResponse() {
  return {
    data: {
      Page: {
        media: [
          {
            countryOfOrigin: 'JP',
            format: 'MANGA',
            id: 30013,
            idMal: 13,
            popularity: 960_000,
            siteUrl: 'https://anilist.co/manga/30013/ONE-PIECE/',
            status: 'RELEASING',
            synonyms: ['One Piece', 'ワンピース'],
            title: {
              english: 'One Piece',
              native: 'ワンピース',
              romaji: 'One Piece',
              userPreferred: 'One Piece',
            },
            trending: 900,
          },
          {
            countryOfOrigin: 'JP',
            format: 'MANGA',
            id: 87275,
            idMal: 100035,
            popularity: 220_000,
            siteUrl: 'https://anilist.co/manga/87275/Witch-Hat-Atelier/',
            status: 'RELEASING',
            synonyms: ['Tongari Boushi no Atelier', 'とんがり帽子のアトリエ'],
            title: {
              english: 'Witch Hat Atelier',
              native: 'とんがり帽子のアトリエ',
              romaji: 'Tongari Boushi no Atelier',
              userPreferred: 'Witch Hat Atelier',
            },
            trending: 350,
          },
        ],
      },
    },
  };
}

function buildJikanWitchHatResponse() {
  return {
    data: {
      authors: [
        {
          name: 'Kamome Shirahama',
          url: 'https://myanimelist.net/people/26431/Kamome_Shirahama',
        },
      ],
      mal_id: 100035,
      members: 82_000,
      popularity: 560,
      rank: 48,
      score: 8.6,
      status: 'Publishing',
      title: 'Tongari Boushi no Atelier',
      titles: [
        {
          title: 'Witch Hat Atelier',
          type: 'English',
        },
        {
          title: 'Tongari Boushi no Atelier',
          type: 'Default',
        },
      ],
      type: 'Manga',
      url: 'https://myanimelist.net/manga/100035/Tongari_Boushi_no_Atelier',
    },
  };
}

function buildJikanOnePieceResponse() {
  return {
    data: {
      authors: [
        {
          name: 'Eiichiro Oda',
          url: 'https://myanimelist.net/people/1881/Eiichiro_Oda',
        },
      ],
      mal_id: 13,
      members: 600_000,
      popularity: 12,
      rank: 3,
      score: 9.2,
      status: 'Publishing',
      title: 'One Piece',
      titles: [
        {
          title: 'One Piece',
          type: 'Default',
        },
      ],
      type: 'Manga',
      url: 'https://myanimelist.net/manga/13/One_Piece',
    },
  };
}
