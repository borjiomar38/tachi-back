import { describe, expect, it } from 'vitest';

import type { EditorialBlogArticleBody } from '@/features/blog/schema';
import {
  assertFutureBlogArticlePolicy,
  hasRecentNewsSource,
  resolveScheduledBlogCategory,
} from '@/server/blog/editorial-policy';

const body: EditorialBlogArticleBody = {
  category: 'recommendations',
  disclaimer:
    'Nayovi does not host manga, manhwa, or manhua chapters, and readers should respect official releases and rights holders.',
  downloadCallout: {
    body: 'Continue with the official Nayovi Android download when you want a focused translation workflow for material you can legally access.',
    buttonLabel: 'Download Nayovi',
    title: 'Continue with Nayovi',
  },
  faqs: [],
  introduction:
    'A concise introduction gives this future article its own editorial rhythm and avoids the repeated blocks that made earlier generated posts feel mechanically identical.',
  sections: [
    {
      heading: 'Choose by reading mood',
      paragraphs: [
        'This paragraph gives a concrete recommendation angle in ordinary prose, so the reader receives useful context without a repeated reading-profile card or takeaway grid.',
      ],
    },
    {
      heading: 'Decide what to try next',
      paragraphs: [
        'This second paragraph provides a natural next step while keeping the conclusion specific to the selected works instead of copying a universal closing formula.',
      ],
    },
  ],
  sources: [
    {
      publishedAt: '2026-08-19',
      title: 'Verified current source',
      url: 'https://example.com/current-source',
    },
  ],
  version: 2,
};

describe('blog editorial category policy', () => {
  it('alternates recommendation and news categories by their published counts', () => {
    expect(
      resolveScheduledBlogCategory({
        candidateCount: 4,
        counts: { manhwaNews: 2, recommendations: 1 },
      })
    ).toBe('recommendations');
    expect(
      resolveScheduledBlogCategory({
        candidateCount: 4,
        counts: { manhwaNews: 1, recommendations: 2 },
      })
    ).toBe('manhwa_news');
  });

  it('uses news when only one verified title is available', () => {
    expect(
      resolveScheduledBlogCategory({
        candidateCount: 1,
        counts: { manhwaNews: 0, recommendations: 0 },
      })
    ).toBe('manhwa_news');
  });
});

describe('future article policy', () => {
  it('accepts the simple future format with no FAQ', () => {
    expect(() =>
      assertFutureBlogArticlePolicy({
        body,
        category: 'recommendations',
      })
    ).not.toThrow();
  });

  it('rejects the generic FAQ previously repeated in every article', () => {
    expect(() =>
      assertFutureBlogArticlePolicy({
        body: {
          ...body,
          faqs: [
            {
              answer:
                'This generic answer is deliberately long enough for schema validation but should still be rejected by the future article policy.',
              question: 'Does Nayovi host manga chapters?',
            },
          ],
        },
        category: 'recommendations',
      })
    ).toThrow(/Generic repeated FAQ/);
  });

  it('requires dated recent evidence for manhwa news', () => {
    expect(
      hasRecentNewsSource({
        body: {
          ...body,
          category: 'manhwa_news',
        },
        publicationDate: new Date('2026-08-20T12:00:00.000Z'),
      })
    ).toBe(true);
    expect(
      hasRecentNewsSource({
        body: {
          ...body,
          category: 'manhwa_news',
          sources: [
            {
              publishedAt: '2025-01-01',
              title: 'Old source',
              url: 'https://example.com/old-source',
            },
          ],
        },
        publicationDate: new Date('2026-08-20T12:00:00.000Z'),
      })
    ).toBe(false);
  });
});
