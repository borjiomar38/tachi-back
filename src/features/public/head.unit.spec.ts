import { describe, expect, it } from 'vitest';

import {
  buildPublicNotFoundHead,
  buildPublicPageHead,
} from '@/features/public/head';

describe('public page head policy', () => {
  it('keeps normal public pages indexable with a canonical URL', () => {
    const head = buildPublicPageHead(
      'Download Nayovi',
      'Download Nayovi for Android.',
      '/download'
    );

    const canonicalLink = head.links.find((link) => link.rel === 'canonical');

    expect(canonicalLink).toBeDefined();
    expect(new URL(canonicalLink?.href ?? '').pathname).toBe('/download');
    expect(head.meta).toContainEqual({
      content: 'index, follow, max-image-preview:large',
      name: 'robots',
    });
  });

  it('keeps true 404 pages out of search without a misleading URL', () => {
    const head = buildPublicNotFoundHead(
      'Article not found',
      'This Nayovi blog article is not available.'
    );

    expect(head.links).toEqual([]);
    expect(head.meta).toContainEqual({
      content: 'noindex, nofollow',
      name: 'robots',
    });
    expect(head.meta).not.toContainEqual(
      expect.objectContaining({ property: 'og:url' })
    );
    expect(head.meta).not.toContainEqual(
      expect.objectContaining({ 'script:ld+json': expect.anything() })
    );
  });
});
