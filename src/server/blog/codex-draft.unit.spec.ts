import { describe, expect, it } from 'vitest';

import {
  findDuplicateBlogTopic,
  zCodexBlogArticleDraft,
} from '@/server/blog/codex-draft';

const topicEvidence = {
  anilistId: 87_275,
  canonicalId: 'anilist:87275',
  kitsuId: null,
  myAnimeListId: 100_035,
  sourceUrls: [
    'https://anilist.co/manga/87275/Witch-Hat-Atelier/',
    'https://myanimelist.net/manga/100035/Tongari_Boushi_no_Atelier',
  ],
  titleAliases: [
    'Witch Hat Atelier',
    'Tongari Boushi no Atelier',
    'とんがり帽子のアトリエ',
  ],
  trendRank: 4,
  trendScore: 121,
  type: 'manga' as const,
  verifiedAt: '2026-08-20T00:00:00.000Z',
};

const buildBody = (
  category: 'app_updates' | 'manhwa_news' | 'recommendations'
) => ({
  category,
  disclaimer:
    'Nayovi does not host manga, manhwa, or manhua chapters. Readers should respect official releases and rights holders.',
  downloadCallout: {
    body: 'Use the official Nayovi Android download path for a clear reading and translation workflow without relying on unknown APK mirrors.',
    buttonLabel: 'Download Nayovi' as const,
    title: 'Continue reading with Nayovi',
  },
  faqs: [],
  introduction:
    'This concise editorial introduction gives readers enough context to understand the subject without forcing the same reading profile, takeaway cards, or repeated FAQ into every future article.',
  sections: [
    {
      heading: 'What readers should know now',
      paragraphs: [
        'The first section explains the most useful facts in normal paragraphs, with enough detail for readers to understand why the subject matters and what is genuinely different this time.',
      ],
    },
    {
      heading: 'How to use this information',
      paragraphs: [
        'The second section keeps the article practical and readable, avoids complicated block patterns, and gives a natural next step without repeating a fixed conclusion from other articles.',
      ],
    },
  ],
  sources: [
    {
      publishedAt: '2026-08-18',
      title: 'Verified editorial source',
      url: topicEvidence.sourceUrls[0],
    },
  ],
  version: 2 as const,
});

const commonDraft = {
  editorialRationale:
    'The subject is useful now because readers need a concise, verified explanation with a genuinely different editorial angle and without a repeated article template.',
  excerpt:
    'A concise Nayovi article with verified sources, a simple editorial structure, and no automatic repeated FAQ block.',
  keywords: [
    'manga translate ai',
    'Nayovi download',
    'manga OCR translator',
    'Android manga AI translator',
    'Mihon manga translator',
    'Tachiyomi manga translator',
  ],
  manhwaTitle: 'Witch Hat Atelier',
  manhwaType: 'manga' as const,
  metaDescription:
    'Read a concise Nayovi update with verified sources, a useful editorial angle, and a simpler structure designed for manga and manhwa readers.',
  searchIntent: 'current manga and manhwa reading recommendations',
  slugBase: 'witch-hat-atelier-current-reader-guide',
  title: 'Witch Hat Atelier News Readers Should Know This Week',
};

describe('Codex blog draft validation', () => {
  it('accepts a simple manhwa news article without an automatic FAQ', () => {
    const draft = zCodexBlogArticleDraft.parse({
      ...commonDraft,
      body: buildBody('manhwa_news'),
      category: 'manhwa_news',
      topicEvidence,
    });

    expect(draft.category).toBe('manhwa_news');
    expect(draft.body.faqs).toEqual([]);
  });

  it('accepts a structurally distinct multi-title recommendation article', () => {
    const draft = zCodexBlogArticleDraft.parse({
      ...commonDraft,
      body: buildBody('recommendations'),
      category: 'recommendations',
      featuredTitles: ['Witch Hat Atelier', 'Tower of God'],
      recommendationEvidence: [
        topicEvidence,
        {
          ...topicEvidence,
          anilistId: 8_510,
          canonicalId: 'anilist:8510',
          sourceUrls: [
            'https://anilist.co/manga/8510/Tower-of-God/',
            'https://myanimelist.net/manga/122663/Tower-of-God',
          ],
          titleAliases: ['Tower of God', 'Sin-ui Tap'],
          type: 'manhwa',
        },
      ],
    });

    expect(draft.category).toBe('recommendations');

    if (draft.category !== 'recommendations') {
      throw new Error('Expected a recommendation draft.');
    }

    expect(draft.featuredTitles).toHaveLength(2);
  });

  it('accepts an app update tied to an exact GitHub commit range', () => {
    const commitUrl =
      'https://github.com/borjiomar38/tachi-mobile/commit/abcdef1234567890';
    const draft = zCodexBlogArticleDraft.parse({
      ...commonDraft,
      appUpdateEvidence: {
        branch: 'main',
        commits: [
          {
            authoredAt: '2026-08-20T10:00:00.000Z',
            message: 'feat: improve translation onboarding',
            sha: 'abcdef1234567890',
            url: commitUrl,
          },
        ],
        fromSha: '1111111111111111',
        repository: 'borjiomar38/tachi-mobile',
        toSha: 'abcdef1234567890',
      },
      body: {
        ...buildBody('app_updates'),
        sources: [
          {
            publishedAt: '2026-08-20',
            title: 'Improve translation onboarding',
            url: commitUrl,
          },
        ],
      },
      category: 'app_updates',
      manhwaTitle: 'Nayovi',
      title: 'What Changed in the Latest Nayovi App Update',
    });

    expect(draft.category).toBe('app_updates');

    if (draft.category !== 'app_updates') {
      throw new Error('Expected an app update draft.');
    }

    expect(draft.appUpdateEvidence.toSha).toBe('abcdef1234567890');
  });

  it('rejects mismatched article and body categories', () => {
    expect(() =>
      zCodexBlogArticleDraft.parse({
        ...commonDraft,
        body: buildBody('recommendations'),
        category: 'manhwa_news',
        topicEvidence,
      })
    ).toThrow();
  });

  it('rejects extra fields from Codex output', () => {
    expect(() =>
      zCodexBlogArticleDraft.parse({
        ...commonDraft,
        body: buildBody('manhwa_news'),
        category: 'manhwa_news',
        extraNarration: 'not allowed',
        topicEvidence,
      })
    ).toThrow();
  });
});

describe('Codex blog duplicate detection', () => {
  it('rejects a nested duplicate topic', () => {
    expect(
      findDuplicateBlogTopic(
        {
          manhwaTitle: 'Solo Leveling Season 2',
          title: 'Solo Leveling Season 2 Manhwa Translate AI Guide',
        },
        [
          {
            manhwaTitle: 'Solo Leveling',
            title: 'Solo Leveling Manhwa Translation App Guide',
          },
        ]
      )
    ).toEqual({
      manhwaTitle: 'Solo Leveling',
      title: 'Solo Leveling Manhwa Translation App Guide',
    });
  });

  it('rejects an existing title from title and slug aliases', () => {
    expect(
      findDuplicateBlogTopic(
        {
          aliases: ['One Piece', 'ワンピース'],
          manhwaTitle: 'ONE PIECE',
          slugBase: 'one-piece-manga-translate-ai-guide',
          title: 'One Piece Manga Translate AI Guide for 2026 Readers',
        },
        [
          {
            manhwaTitle: 'One Piece',
            slug: 'manga-translate-ia-one-piece-tachiyomiat-2026-04-26',
            title: 'One Piece manga Translation Guide for TachiyomiAT',
          },
        ]
      )?.manhwaTitle
    ).toBe('One Piece');
  });
});
