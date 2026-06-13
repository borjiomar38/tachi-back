import { describe, expect, it } from 'vitest';

import { isExplicitAdultContentBlocked } from '@/server/content-policy/explicit-adult-content-gate';

describe('explicit adult content gate', () => {
  it('blocks official hentai and pornographic metadata signals', () => {
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          genres: ['Action', 'Hentai'],
        },
      })
    ).toBe(true);
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          tags: ['Pornographic'],
        },
      })
    ).toBe(true);
  });

  it('allows normal manga and manhua metadata', () => {
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          categories: ['Adventure'],
          genres: ['Action', 'Fantasy', 'Comedy'],
          rating: 'Teen',
          tags: ['Martial Arts'],
        },
      })
    ).toBe(false);
  });

  it('allows mature, ecchi, sexy, yaoi, BL, and yuri without explicit adult metadata', () => {
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          genres: ['Romance', 'Mature', 'Ecchi', 'Sexy', 'Yaoi', 'BL', 'Yuri'],
        },
      })
    ).toBe(false);
  });

  it('blocks orientation-neutral explicit porn and adult-sex metadata paired with romance genres', () => {
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          genres: ['BL', 'Romance'],
          tags: ['Explicit sex'],
        },
      })
    ).toBe(true);
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          genres: ['Yuri', 'Girls Love'],
          rating: 'Explicit adult rating',
        },
      })
    ).toBe(true);
  });

  it('only blocks smut and erotica when official metadata is clearly adult explicit', () => {
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          tags: ['Smut'],
        },
      })
    ).toBe(false);
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          tags: ['Adult explicit smut'],
        },
      })
    ).toBe(true);
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          tags: ['Erotica'],
        },
      })
    ).toBe(false);
    expect(
      isExplicitAdultContentBlocked({
        manga: {
          tags: ['18+ explicit erotica'],
        },
      })
    ).toBe(true);
  });
});
