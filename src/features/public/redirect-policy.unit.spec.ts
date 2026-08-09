import { describe, expect, it } from 'vitest';

import {
  createCanonicalHostRedirectResponse,
  getCanonicalHostRedirectLocation,
  publicSeoRedirectRouteRules,
} from '@/features/public/redirect-policy';

describe('public SEO redirect policy', () => {
  it('permanently redirects retired SEO URLs to their closest live pages', () => {
    expect(
      publicSeoRedirectRouteRules[
        '/blog/download-tachiyomiat-for-manhwa-translation'
      ]
    ).toEqual({
      redirect: {
        status: 301,
        to: '/blog/download-nayovi-for-manhwa-translation',
      },
    });
    expect(
      publicSeoRedirectRouteRules['/og/tachiyomiat-social-preview.jpg']
    ).toEqual({
      redirect: { status: 301, to: '/og/nayovi-social-preview.jpg' },
    });
  });

  it('uses a temporary redirect while the original manhwa chapter is rebuilt', () => {
    expect(
      publicSeoRedirectRouteRules['/manhwa/the-eclipse-crown/chapter/1']
    ).toEqual({
      redirect: { status: 302, to: '/manhwa/the-eclipse-crown' },
    });
  });

  it('redirects www to HTTPS apex while preserving the full request target', () => {
    const request = new Request(
      'http://internal.test/guides/mihon-nayovi-setup?source=google',
      {
        headers: {
          host: 'internal.test',
          'x-forwarded-host': 'www.tachiyomiat.com, proxy.internal',
        },
        method: 'POST',
      }
    );
    const response = createCanonicalHostRedirectResponse(request);

    expect(getCanonicalHostRedirectLocation(request)).toBe(
      'https://tachiyomiat.com/guides/mihon-nayovi-setup?source=google'
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe(
      'https://tachiyomiat.com/guides/mihon-nayovi-setup?source=google'
    );
  });

  it('does not redirect the canonical domain or local development', () => {
    expect(
      createCanonicalHostRedirectResponse(
        new Request('https://tachiyomiat.com/download')
      )
    ).toBeNull();
    expect(
      createCanonicalHostRedirectResponse(
        new Request('http://localhost:3009/download')
      )
    ).toBeNull();
  });
});
