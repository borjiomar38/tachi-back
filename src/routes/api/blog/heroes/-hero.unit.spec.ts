import { describe, expect, it, vi } from 'vitest';

import {
  BLOG_HERO_PRESIGNED_URL_TTL_SECONDS,
  PUBLIC_IMAGE_REDIRECT_CACHE_SECONDS,
} from '@/features/public/cache-policy';

const { mockPresignGetObject, mockUploadClient } = vi.hoisted(() => ({
  mockPresignGetObject: vi.fn(),
  mockUploadClient: { name: 'test-upload-client' },
}));

vi.mock('@better-upload/server/helpers', () => ({
  presignGetObject: mockPresignGetObject,
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

vi.mock('@/server/s3', () => ({
  objectStorageBuckets: { legacyPublic: 'legacy-public-test' },
  uploadClient: mockUploadClient,
}));

import { Route } from './$slug';

describe('GET /api/blog/heroes/:slug', () => {
  it('returns a crawlable, short-lived redirect inside the signed URL lifetime', async () => {
    const signedUrl =
      'https://objects.example.test/blog/heroes/demo.png?signature=test';
    mockPresignGetObject.mockResolvedValue(signedUrl);
    const handler = (
      Route as never as {
        options: {
          server: {
            handlers: {
              GET: (input: { params: { slug: string } }) => Promise<Response>;
            };
          };
        };
      }
    ).options.server.handlers.GET;

    const response = await handler({ params: { slug: 'demo' } });

    expect(mockPresignGetObject).toHaveBeenCalledWith(mockUploadClient, {
      bucket: 'legacy-public-test',
      expiresIn: BLOG_HERO_PRESIGNED_URL_TTL_SECONDS,
      key: 'blog/heroes/demo.png',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(signedUrl);
    expect(response.headers.get('cache-control')).toBe(
      `public, max-age=${PUBLIC_IMAGE_REDIRECT_CACHE_SECONDS}`
    );
    expect(response.headers.get('x-robots-tag')).toBe('index, follow');
  });
});
