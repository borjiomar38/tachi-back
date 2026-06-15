import { describe, expect, it } from 'vitest';

import {
  getDefaultExplicitAdultContentGateResult,
  getExplicitAdultContentGateResultForPolicy,
  isExplicitAdultContentBlockedForPolicy,
} from '@/server/content-policy/explicit-adult-content-gate';
import { normalizeBlockedMetadataValues } from '@/server/content-policy/metadata-policy';

describe('explicit adult content gate', () => {
  it('blocks official hentai and pornographic metadata signals', () => {
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          genres: ['Action', 'Hentai'],
        },
      })
    ).not.toBeNull();
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          tags: ['Pornographic'],
        },
      })
    ).not.toBeNull();
  });

  it('allows normal manga and manhua metadata', () => {
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          categories: ['Adventure'],
          genres: ['Action', 'Fantasy', 'Comedy'],
          rating: 'Teen',
          tags: ['Martial Arts'],
        },
      })
    ).toBeNull();
  });

  it('allows mature, ecchi, sexy, yaoi, BL, and yuri without explicit adult metadata', () => {
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          genres: ['Romance', 'Mature', 'Ecchi', 'Sexy', 'Yaoi', 'BL', 'Yuri'],
        },
      })
    ).toBeNull();
  });

  it('blocks orientation-neutral explicit porn and adult-sex metadata paired with romance genres', () => {
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          genres: ['BL', 'Romance'],
          tags: ['Explicit sex'],
        },
      })
    ).not.toBeNull();
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          genres: ['Yuri', 'Girls Love'],
          rating: 'Explicit adult rating',
        },
      })
    ).not.toBeNull();
  });

  it('only blocks smut and erotica when official metadata is clearly adult explicit', () => {
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          tags: ['Smut'],
        },
      })
    ).toBeNull();
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          tags: ['Adult explicit smut'],
        },
      })
    ).not.toBeNull();
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          tags: ['Erotica'],
        },
      })
    ).toBeNull();
    expect(
      getDefaultExplicitAdultContentGateResult({
        manga: {
          tags: ['18+ explicit erotica'],
        },
      })
    ).not.toBeNull();
  });

  it('blocks admin-selected custom genre and tag values', () => {
    const policy = normalizeBlockedMetadataValues([
      {
        field: 'genres',
        value: 'No Translation',
      },
      {
        field: 'tags',
        value: 'Publisher blocked',
      },
    ]);

    expect(
      getExplicitAdultContentGateResultForPolicy(
        {
          manga: {
            genres: ['Romance', 'No Translation'],
          },
        },
        policy
      )
    ).toMatchObject({
      signal: {
        field: 'genres',
        value: 'No Translation',
      },
    });
    expect(
      isExplicitAdultContentBlockedForPolicy(
        {
          manga: {
            tags: ['Publisher blocked'],
          },
        },
        policy
      )
    ).toBe(true);
  });

  it('uses saved policy as an override when explicit defaults are unchecked', () => {
    const policy = normalizeBlockedMetadataValues([
      {
        field: 'tags',
        value: 'Publisher blocked',
      },
    ]);

    expect(
      isExplicitAdultContentBlockedForPolicy(
        {
          manga: {
            genres: ['Hentai'],
            tags: ['Pornographic'],
          },
        },
        policy
      )
    ).toBe(false);
  });
});
