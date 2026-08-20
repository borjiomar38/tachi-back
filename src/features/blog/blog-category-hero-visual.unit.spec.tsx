import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BlogCategoryHeroVisual } from '@/features/blog/blog-category-hero-visual';
import type { BlogArticleCategory } from '@/features/blog/schema';

describe('BlogCategoryHeroVisual', () => {
  it('uses a distinct generated image for every category archive', () => {
    const categories: BlogArticleCategory[] = [
      'recommendations',
      'manhwa_news',
      'app_updates',
    ];

    const imageSources = categories.map((category) => {
      const html = renderToStaticMarkup(
        <BlogCategoryHeroVisual category={category} />
      );

      return html.match(/<img[^>]+src="([^"]+)"/)?.[1];
    });

    expect(imageSources.every(Boolean)).toBe(true);
    expect(new Set(imageSources)).toHaveLength(categories.length);
  });
});
