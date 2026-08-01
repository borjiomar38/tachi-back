import { describe, expect, it } from 'vitest';

import {
  buildBlogHeroImageVariantObjectKey,
  buildBlogHeroImageVariantUrl,
  extractBlogHeroImageSlug,
  isBlogHeroImageVariant,
  isSafeBlogHeroImageSlug,
} from '@/features/blog/image-variants';

describe('blog hero image variants', () => {
  it('builds stable same-origin WebP URLs from current hero routes', () => {
    expect(
      buildBlogHeroImageVariantUrl({
        sourceUrl:
          'https://tachiyomiat.com/api/blog/heroes/solo-leveling-guide',
        variant: 'card-sm',
      })
    ).toBe('/media/blog/heroes/v3/solo-leveling-guide/card-sm.webp');
    expect(
      buildBlogHeroImageVariantUrl({
        sourceUrl: '/blog/heroes/solo-leveling-guide.png',
        variant: 'article-lg',
      })
    ).toBe('/media/blog/heroes/v3/solo-leveling-guide/article-lg.webp');
  });

  it('keeps unsupported image URLs on the original delivery path', () => {
    expect(
      buildBlogHeroImageVariantUrl({
        sourceUrl: 'https://images.example.com/hero.png',
        variant: 'card-lg',
      })
    ).toBeNull();
    expect(extractBlogHeroImageSlug('/api/blog/heroes/not%2Fsafe')).toBeNull();
  });

  it('only accepts declared variants and safe object keys', () => {
    expect(isBlogHeroImageVariant('card-lg')).toBe(true);
    expect(isBlogHeroImageVariant('original')).toBe(false);
    expect(isSafeBlogHeroImageSlug('solo-leveling-guide')).toBe(true);
    expect(isSafeBlogHeroImageSlug('../private')).toBe(false);
    expect(
      buildBlogHeroImageVariantObjectKey({
        slug: 'solo-leveling-guide',
        variant: 'card-lg',
      })
    ).toBe('blog/heroes/variants/v3/solo-leveling-guide-card-lg.webp');
  });
});
