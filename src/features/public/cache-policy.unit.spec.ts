import { describe, expect, it } from 'vitest';

import {
  BLOG_HERO_PRESIGNED_URL_TTL_SECONDS,
  createPublicImageRedirectResponse,
  PUBLIC_IMAGE_REDIRECT_CACHE_SECONDS,
  PUBLIC_MARKETING_ASSET_CACHE_CONTROL,
  publicMarketingAssetRouteRules,
} from '@/features/public/cache-policy';

describe('public cache policy', () => {
  it('adds a long, revalidatable cache policy to marketing assets', () => {
    expect(publicMarketingAssetRouteRules).toEqual({
      '/marketing/**': {
        headers: {
          'cache-control': PUBLIC_MARKETING_ASSET_CACHE_CONTROL,
        },
      },
    });
    expect(PUBLIC_MARKETING_ASSET_CACHE_CONTROL).toContain('max-age=2592000');
    expect(PUBLIC_MARKETING_ASSET_CACHE_CONTROL).not.toContain('immutable');
  });

  it('caches a public image redirect for less than its signed URL lifetime', () => {
    const signedUrl =
      'https://objects.example.test/blog/heroes/demo.png?signature=test';
    const response = createPublicImageRedirectResponse(signedUrl);

    expect(PUBLIC_IMAGE_REDIRECT_CACHE_SECONDS).toBeLessThan(
      BLOG_HERO_PRESIGNED_URL_TTL_SECONDS
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(signedUrl);
    expect(response.headers.get('cache-control')).toBe(
      `public, max-age=${PUBLIC_IMAGE_REDIRECT_CACHE_SECONDS}`
    );
    expect(response.headers.get('x-robots-tag')).toBe('index, follow');
  });
});
