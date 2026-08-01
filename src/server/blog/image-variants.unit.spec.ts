import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLoggerWarn, mockPutObject } = vi.hoisted(() => ({
  mockLoggerWarn: vi.fn(),
  mockPutObject: vi.fn(),
}));

vi.mock('@better-upload/server/helpers', () => ({
  getObject: vi.fn(),
  headObject: vi.fn(),
  putObject: mockPutObject,
}));

vi.mock('@/server/logger', () => ({
  logger: {
    warn: mockLoggerWarn,
  },
}));

vi.mock('@/server/s3', () => ({
  objectStorageBuckets: {
    legacyPublic: 'test-blog-images',
  },
  uploadClient: {
    name: 'test-upload-client',
  },
}));

import {
  putAllBlogHeroImageVariants,
  renderBlogHeroImageVariant,
} from '@/server/blog/image-variants';

describe('blog hero image rendering', () => {
  beforeEach(() => {
    mockLoggerWarn.mockReset();
    mockPutObject.mockReset();
    mockPutObject.mockResolvedValue(undefined);
  });

  it('creates a compact, correctly sized WebP card image', async () => {
    const source = await sharp({
      create: {
        background: { alpha: 1, b: 80, g: 32, r: 16 },
        channels: 4,
        height: 900,
        width: 1_600,
      },
    })
      .png()
      .toBuffer();

    const result = await renderBlogHeroImageVariant({
      image: source,
      variant: 'card-sm',
    });
    const metadata = await sharp(result).metadata();

    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(480);
    expect(metadata.height).toBe(270);
    expect(result.byteLength).toBeLessThan(source.byteLength);
  });

  it('keeps original publishing reliable when derivative storage fails', async () => {
    const source = await sharp({
      create: {
        background: { alpha: 1, b: 80, g: 32, r: 16 },
        channels: 4,
        height: 900,
        width: 1_600,
      },
    })
      .png()
      .toBuffer();
    mockPutObject.mockRejectedValueOnce(new Error('Storage unavailable'));

    await expect(
      putAllBlogHeroImageVariants({
        image: source,
        slug: 'solo-leveling-guide',
      })
    ).resolves.toBeUndefined();
    expect(mockPutObject).toHaveBeenCalledTimes(4);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        failedVariantCount: 1,
        scope: 'blog-hero-variant-cache',
        slug: 'solo-leveling-guide',
      })
    );
  });
});
