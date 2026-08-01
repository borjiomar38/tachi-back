export interface BlogHeroImageVariantDefinition {
  height: number;
  quality: number;
  width: number;
}

export const blogHeroImageVariantDefinitions = {
  'article-lg': {
    height: 810,
    quality: 80,
    width: 1_440,
  },
  'article-md': {
    height: 540,
    quality: 78,
    width: 960,
  },
  'card-lg': {
    height: 432,
    quality: 76,
    width: 768,
  },
  'card-sm': {
    height: 270,
    quality: 74,
    width: 480,
  },
} as const satisfies Record<string, BlogHeroImageVariantDefinition>;

export type BlogHeroImageVariant = keyof typeof blogHeroImageVariantDefinitions;

export const blogHeroImageVariantVersion = 'v3';

const safeBlogHeroSlugPattern = /^[a-z0-9-]+$/;
const blogHeroImagePathPatterns = [
  /^\/api\/blog\/heroes\/([^/]+)\/?$/,
  /^\/blog\/heroes\/([^/]+)\.png$/,
] as const;

export function buildBlogHeroImageVariantUrl(input: {
  sourceUrl: string;
  variant: BlogHeroImageVariant;
}): string | null {
  const slug = extractBlogHeroImageSlug(input.sourceUrl);

  return slug
    ? `/media/blog/heroes/${blogHeroImageVariantVersion}/${encodeURIComponent(slug)}/${input.variant}.webp`
    : null;
}

export function buildBlogHeroImageVariantObjectKey(input: {
  slug: string;
  variant: BlogHeroImageVariant;
}) {
  return `blog/heroes/variants/${blogHeroImageVariantVersion}/${input.slug}-${input.variant}.webp`;
}

export function extractBlogHeroImageSlug(sourceUrl: string): string | null {
  const pathname = getUrlPathname(sourceUrl);
  const encodedSlug = blogHeroImagePathPatterns
    .map((pattern) => pattern.exec(pathname)?.[1])
    .find(Boolean);

  if (!encodedSlug) {
    return null;
  }

  try {
    const slug = decodeURIComponent(encodedSlug);

    return safeBlogHeroSlugPattern.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

export function isBlogHeroImageVariant(
  value: string
): value is BlogHeroImageVariant {
  return Object.hasOwn(blogHeroImageVariantDefinitions, value);
}

export function isSafeBlogHeroImageSlug(value: string) {
  return safeBlogHeroSlugPattern.test(value);
}

function getUrlPathname(value: string) {
  try {
    return new URL(value, 'https://nayovi.invalid').pathname;
  } catch {
    return '';
  }
}
