import { describe, expect, it } from 'vitest';

import { createGoogleTag } from '@/features/analytics/google-analytics';

describe('Google tag command queue', () => {
  it('queues the native Arguments object required by gtag.js', () => {
    const dataLayer: unknown[] = [];
    const gtag = createGoogleTag(dataLayer);

    gtag('config', 'G-TEST123');

    expect(dataLayer).toHaveLength(1);
    expect(Array.isArray(dataLayer[0])).toBe(false);
    expect(Array.from(dataLayer[0] as ArrayLike<unknown>)).toEqual([
      'config',
      'G-TEST123',
    ]);
  });
});
