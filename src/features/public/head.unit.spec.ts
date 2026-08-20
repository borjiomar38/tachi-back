import { describe, expect, it } from 'vitest';

import { getBlogCategoryConfig } from '@/features/blog/category';
import { fallbackBlogArticle } from '@/features/blog/fallback';
import {
  buildPublicBlogArticleHead,
  buildPublicBlogCategoryHead,
  buildPublicNotFoundHead,
  buildPublicPageHead,
} from '@/features/public/head';

describe('public page head policy', () => {
  it('indexes populated category archives and noindexes empty ones', () => {
    const category = getBlogCategoryConfig('recommendations');
    const populatedHead = buildPublicBlogCategoryHead(category, 1, 3);
    const emptyHead = buildPublicBlogCategoryHead(category, 1, 0);

    expect(populatedHead.links).toContainEqual({
      href: expect.stringContaining('/blog/category/recommendations'),
      rel: 'canonical',
    });
    expect(populatedHead.meta).toContainEqual({
      content: 'index, follow, max-image-preview:large',
      name: 'robots',
    });
    expect(emptyHead.meta).toContainEqual({
      content: 'noindex, follow',
      name: 'robots',
    });
  });

  it('keeps normal public pages indexable with a canonical URL', () => {
    const head = buildPublicPageHead(
      'Download Nayovi',
      'Download Nayovi for Android.',
      '/download'
    );

    const canonicalLink = head.links.find((link) => link.rel === 'canonical');

    expect(canonicalLink).toBeDefined();
    expect(new URL(canonicalLink?.href ?? '').pathname).toBe('/download');
    expect(head.meta).toContainEqual({
      content: 'index, follow, max-image-preview:large',
      name: 'robots',
    });
  });

  it('keeps true 404 pages out of search without a misleading URL', () => {
    const head = buildPublicNotFoundHead(
      'Article not found',
      'This Nayovi blog article is not available.'
    );

    expect(head.links).toEqual([]);
    expect(head.meta).toContainEqual({
      content: 'noindex, nofollow',
      name: 'robots',
    });
    expect(head.meta).not.toContainEqual(
      expect.objectContaining({ property: 'og:url' })
    );
    expect(head.meta).not.toContainEqual(
      expect.objectContaining({ 'script:ld+json': expect.anything() })
    );
  });

  it('uses the future editorial category in article SEO metadata', () => {
    const head = buildPublicBlogArticleHead({
      ...fallbackBlogArticle,
      body: {
        category: 'app_updates',
        disclaimer:
          'Nayovi does not host manga, manhwa, or manhua chapters. Readers should respect official releases and rights holders.',
        downloadCallout: {
          body: 'Use the official Nayovi Android download for the latest user-facing improvements and a consistent translation workflow.',
          buttonLabel: 'Download Nayovi',
          title: 'Update Nayovi for Android',
        },
        faqs: [],
        introduction:
          'This application update explains the latest user-facing improvements in plain language without exposing implementation details or adding repeated FAQ blocks.',
        sections: [
          {
            heading: 'A smoother translation start',
            paragraphs: [
              'The latest release makes the first translation steps clearer for readers, while keeping technical implementation details out of the public explanation.',
            ],
          },
          {
            heading: 'What existing readers will notice',
            paragraphs: [
              'Returning readers receive a concise explanation of the visible changes and can decide when to update without reading raw commit messages.',
            ],
          },
        ],
        sources: [
          {
            publishedAt: '2026-08-20',
            title: 'Nayovi app update commit',
            url: 'https://github.com/borjiomar38/tachi-mobile/commit/aaaaaaaaaaaa',
          },
        ],
        version: 2,
      },
      category: 'app_updates',
      imageAlt: 'Original illustration for the latest Nayovi app update',
      keywords: ['Nayovi update', 'Nayovi Android'],
      title: 'A Smoother Translation Start in the Latest Nayovi Update',
    });

    expect(head.meta).toContainEqual({
      content: 'App updates',
      property: 'article:section',
    });
    expect(head.meta).toContainEqual({
      content: fallbackBlogArticle.publishedAt,
      property: 'article:published_time',
    });
    expect(head.meta).toContainEqual(
      expect.objectContaining({
        title: expect.stringContaining('A Smoother Translation Start'),
      })
    );
  });
});
