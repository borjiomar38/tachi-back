import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BlogArticleCard } from '@/features/blog/blog-article-card';
import { BlogArticleSummary } from '@/features/blog/schema';

const article: BlogArticleSummary = {
  excerpt: 'A practical translation guide for Android readers.',
  heroImageUrl: '/api/blog/heroes/solo-leveling-guide',
  imageAlt: 'Solo Leveling translation guide',
  imagePrompt: 'Test prompt',
  keywords: ['manhwa translate ai'],
  manhwaTitle: 'Solo Leveling',
  manhwaType: 'manhwa',
  publishedAt: '2026-05-20T12:00:00.000Z',
  slug: 'solo-leveling-guide',
  title: 'Translate Solo Leveling on Android',
  updatedAt: '2026-05-20T12:00:00.000Z',
};

describe('BlogArticleCard image delivery', () => {
  it('renders lazy responsive WebP candidates with an original URL fallback', () => {
    const html = renderToStaticMarkup(
      createElement(BlogArticleCard, { article })
    );

    expect(html).toContain('src="/api/blog/heroes/solo-leveling-guide"');
    expect(html).toContain(
      '/media/blog/heroes/v3/solo-leveling-guide/card-sm.webp 480w'
    );
    expect(html).toContain(
      '/media/blog/heroes/v3/solo-leveling-guide/card-lg.webp 768w'
    );
    expect(html).toContain('width="768"');
    expect(html).toContain('height="432"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).not.toContain('rel="preload"');
  });
});
