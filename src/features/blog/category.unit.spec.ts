import { describe, expect, it } from 'vitest';

import {
  blogCategoryConfigs,
  getBlogCategoryConfigBySlug,
  getBlogCategoryPath,
} from '@/features/blog/category';

describe('blog category routing', () => {
  it('provides one stable public URL per editorial category', () => {
    expect(blogCategoryConfigs.map((config) => config.slug)).toEqual([
      'recommendations',
      'manhwa-news',
      'app-updates',
    ]);
    expect(getBlogCategoryPath('app_updates')).toBe(
      '/blog/category/app-updates'
    );
  });

  it('rejects unknown public category slugs', () => {
    expect(getBlogCategoryConfigBySlug('unknown')).toBeNull();
  });
});
