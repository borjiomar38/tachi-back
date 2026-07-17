import { describe, expect, it } from 'vitest';

import {
  findDuplicateBlogTopic,
  zCodexBlogArticleDraft,
} from '@/server/blog/codex-draft';

const validDraft = {
  body: {
    disclaimer:
      'Nayovi does not host manga, manhwa, or manhua chapters. Readers should respect official releases and rights holders.',
    downloadCallout: {
      body: 'Use the official Nayovi Android download path to keep OCR translation setup clear, consistent, and away from random APK mirrors.',
      buttonLabel: 'Download Nayovi',
      title: 'Download Nayovi for Android',
    },
    faqs: [
      {
        answer:
          'Nayovi focuses on OCR and translation workflow support. It does not publish or distribute manga, manhwa, or manhua chapters.',
        question: 'Does Nayovi host manga chapters?',
      },
      {
        answer:
          'A cleaner workflow helps preserve names, speech-bubble order, and recurring terms while readers use content they can legally access.',
        question: 'Why use a manga translation workflow?',
      },
      {
        answer:
          'Use the article CTA or Nayovi download page so Android setup stays on the official path instead of random mirrors.',
        question: 'Where should readers download Nayovi?',
      },
    ],
    introduction:
      'Witch Hat Atelier is gaining attention from readers who want careful manga translation around handwritten notes, magical terminology, and detailed page layouts. Nayovi can help readers keep OCR and translation workflow decisions consistent while using material they can legally access.',
    readingProfile: {
      bestFor:
        'Readers who care about detailed fantasy pages, careful lettering, and a clean Android OCR translation workflow.',
      pacing:
        'Best for slower manga pages where terminology and panel order matter more than speed.',
      tone: 'Careful, magical, practical, and reader-focused.',
    },
    sections: [
      {
        body: 'Detailed fantasy manga pages need OCR that respects panel order, short captions, and recurring spell terms. Nayovi keeps those translation workflow decisions organized around a single Android app path.',
        heading: 'Why the workflow matters',
        takeaways: [
          'Preserve recurring fantasy terms.',
          'Keep panel order readable.',
        ],
      },
      {
        body: 'Readers coming from Tachiyomi or Mihon-style habits still need a clean way to process pages they can legally access. The article should guide them to Nayovi without implying chapter hosting.',
        heading: 'How Nayovi fits Android reading',
        takeaways: [
          'Use official download paths.',
          'Avoid random APK mirrors.',
        ],
      },
      {
        body: 'The best SEO article answers the practical intent behind manga translate AI searches: clean OCR, stable terminology, and a safe Android setup path for Nayovi users.',
        heading: 'What search readers need',
        takeaways: [
          'Match manga translate AI intent.',
          'Keep wording useful instead of stuffed.',
        ],
      },
    ],
  },
  excerpt:
    'A practical Nayovi guide for Witch Hat Atelier readers who want manga translate AI workflows, clean OCR, and official Android setup guidance.',
  keywords: [
    'manga translate ai',
    'Nayovi download',
    'manga OCR translator',
    'Android manga AI translator',
    'Mihon manga translator',
    'Tachiyomi manga translator',
  ],
  manhwaTitle: 'Witch Hat Atelier',
  manhwaType: 'manga',
  metaDescription:
    'Use Nayovi for Witch Hat Atelier manga translate AI workflows, clean OCR, stable terms, and the official Android download path.',
  searchIntent: 'witch hat atelier manga translate ai workflow',
  slugBase: 'witch-hat-atelier-manga-translate-ai-guide',
  sourceNotes: [
    {
      summary:
        'A current source about the title that supports ongoing search interest and anime-adjacent visibility.',
      title: 'Witch Hat Atelier current interest',
      url: 'https://example.com/witch-hat-atelier',
    },
    {
      summary:
        'A second source confirming continued reader attention around the manga and adaptation discussion.',
      title: 'Witch Hat Atelier trend context',
      url: 'https://example.com/witch-hat-atelier-trend',
    },
  ],
  title: 'Witch Hat Atelier Manga Translate AI Guide for Nayovi',
  topicEvidence: {
    anilistId: 87275,
    canonicalId: 'anilist:87275',
    kitsuId: null,
    myAnimeListId: 100035,
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
    verifiedAt: '2026-07-17T00:00:00.000Z',
  },
  trendRationale:
    'The topic has current manga and anime-adjacent search demand, while the detailed fantasy pages make OCR order, terminology, and a legal Android translation workflow useful for Nayovi readers.',
};

describe('Codex blog draft validation', () => {
  it('accepts the strict Codex draft shape', () => {
    expect(zCodexBlogArticleDraft.parse(validDraft).manhwaTitle).toBe(
      'Witch Hat Atelier'
    );
  });

  it('rejects extra fields from Codex output', () => {
    expect(() =>
      zCodexBlogArticleDraft.parse({
        ...validDraft,
        extraNarration: 'not allowed',
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

  it('rejects a duplicate topic from an existing title', () => {
    expect(
      findDuplicateBlogTopic(
        {
          manhwaTitle: 'Omniscient Reader',
          title: 'Omniscient Reader Webtoon Guide for Nayovi',
        },
        [
          {
            manhwaTitle: 'ORV',
            title: 'Omniscient Reader Viewpoint Anime Release Guide',
          },
        ]
      )
    ).toEqual({
      manhwaTitle: 'ORV',
      title: 'Omniscient Reader Viewpoint Anime Release Guide',
    });
  });

  it('rejects an existing One Piece article from title and slug aliases', () => {
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
      )
    ).toEqual({
      manhwaTitle: 'One Piece',
      slug: 'manga-translate-ia-one-piece-tachiyomiat-2026-04-26',
      title: 'One Piece manga Translation Guide for TachiyomiAT',
    });
  });

  it('normalizes punctuation, accents, and Japanese title aliases', () => {
    expect(
      findDuplicateBlogTopic(
        {
          aliases: ['ダンダダン'],
          manhwaTitle: 'DAN DA DAN',
          title: 'Dandadan manga translate AI guide',
        },
        [
          {
            manhwaTitle: 'Dan Da Dan',
            slug: 'dan-da-dan-manga-translate-ai-2026-06-01',
            title: 'DAN DA DAN Manga Translation Guide',
          },
        ]
      )?.manhwaTitle
    ).toBe('Dan Da Dan');
  });
});
