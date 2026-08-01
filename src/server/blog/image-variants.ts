import {
  getObject,
  headObject,
  putObject,
} from '@better-upload/server/helpers';
import sharp from 'sharp';

import {
  type BlogHeroImageVariant,
  blogHeroImageVariantDefinitions,
  buildBlogHeroImageVariantObjectKey,
} from '@/features/blog/image-variants';
import { logger } from '@/server/logger';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

export interface BlogHeroImageVariantAsset {
  body: Blob | Uint8Array<ArrayBuffer>;
}

export async function getOrCreateBlogHeroImageVariant(input: {
  slug: string;
  variant: BlogHeroImageVariant;
}): Promise<BlogHeroImageVariantAsset> {
  const objectKey = buildBlogHeroImageVariantObjectKey(input);

  try {
    const object = await getObject(uploadClient, {
      bucket: objectStorageBuckets.legacyPublic,
      key: objectKey,
    });
    return {
      body: object.blob,
    };
  } catch {
    const original = await getObject(uploadClient, {
      bucket: objectStorageBuckets.legacyPublic,
      key: buildOriginalBlogHeroImageObjectKey(input.slug),
    });
    const image = await renderBlogHeroImageVariant({
      image: Buffer.from(await original.blob.arrayBuffer()),
      variant: input.variant,
    });

    try {
      await putBlogHeroImageVariant({
        image,
        slug: input.slug,
        variant: input.variant,
      });
    } catch (error) {
      logger.warn({
        errorMessage:
          error instanceof Error ? error.message : 'Unknown storage error',
        scope: 'blog-hero-variant-cache',
        slug: input.slug,
        variant: input.variant,
      });
    }

    return {
      body: new Uint8Array(image),
    };
  }
}

export async function hasBlogHeroImageSource(input: { slug: string }) {
  try {
    await headObject(uploadClient, {
      bucket: objectStorageBuckets.legacyPublic,
      key: buildOriginalBlogHeroImageObjectKey(input.slug),
    });

    return true;
  } catch {
    return false;
  }
}

export async function putAllBlogHeroImageVariants(input: {
  image: Buffer;
  slug: string;
}) {
  const results = await Promise.allSettled(
    Object.keys(blogHeroImageVariantDefinitions).map(async (variant) => {
      const typedVariant = variant as BlogHeroImageVariant;
      const image = await renderBlogHeroImageVariant({
        image: input.image,
        variant: typedVariant,
      });

      await putBlogHeroImageVariant({
        image,
        slug: input.slug,
        variant: typedVariant,
      });
    })
  );
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length > 0) {
    logger.warn({
      errorMessage: `Unable to pre-generate ${failures.length} blog hero image variant(s).`,
      failedVariantCount: failures.length,
      scope: 'blog-hero-variant-cache',
      slug: input.slug,
    });
  }
}

export async function renderBlogHeroImageVariant(input: {
  image: Buffer;
  variant: BlogHeroImageVariant;
}) {
  const definition = blogHeroImageVariantDefinitions[input.variant];

  return await sharp(input.image, { failOn: 'none' })
    .rotate()
    .resize({
      fit: 'cover',
      height: definition.height,
      position: 'attention',
      width: definition.width,
    })
    .webp({
      effort: 4,
      quality: definition.quality,
    })
    .toBuffer();
}

function buildOriginalBlogHeroImageObjectKey(slug: string) {
  return `blog/heroes/${slug}.png`;
}

async function putBlogHeroImageVariant(input: {
  image: Buffer;
  slug: string;
  variant: BlogHeroImageVariant;
}) {
  await putObject(uploadClient, {
    body: new Blob([new Uint8Array(input.image)], { type: 'image/webp' }),
    bucket: objectStorageBuckets.legacyPublic,
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: 'image/webp',
    key: buildBlogHeroImageVariantObjectKey(input),
  });
}
