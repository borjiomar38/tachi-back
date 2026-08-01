export const BLOG_HERO_PRESIGNED_URL_TTL_SECONDS = 10 * 60;
export const PUBLIC_IMAGE_REDIRECT_CACHE_SECONDS = 5 * 60;

export const PUBLIC_MARKETING_ASSET_CACHE_CONTROL =
  'public, max-age=2592000, stale-while-revalidate=604800';

export const publicMarketingAssetRouteRules = {
  '/marketing/**': {
    headers: {
      'cache-control': PUBLIC_MARKETING_ASSET_CACHE_CONTROL,
    },
  },
} as const;

export const createPublicImageRedirectResponse = (url: string) =>
  new Response(null, {
    headers: {
      'cache-control': `public, max-age=${PUBLIC_IMAGE_REDIRECT_CACHE_SECONDS}`,
      location: url,
      'x-robots-tag': 'index, follow',
    },
    status: 302,
  });
