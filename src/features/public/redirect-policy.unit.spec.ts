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
    expect(
      publicSeoRedirectRouteRules['/guides/mihon-tachiyomiat-setup']
    ).toEqual({
      redirect: { status: 301, to: '/guides/mihon-nayovi-setup' },
    });
    expect(publicSeoRedirectRouteRules['/tachiyomi']).toEqual({
      redirect: { status: 301, to: '/guides/mihon-nayovi-setup' },
    });
    expect(publicSeoRedirectRouteRules['/tachiyomi-at']).toEqual({
      redirect: { status: 301, to: '/guides/mihon-nayovi-setup' },
    });
    expect(publicSeoRedirectRouteRules['/tachiyomiat']).toEqual({
      redirect: { status: 301, to: '/guides/mihon-nayovi-setup' },
    });
  });

  it('uses a temporary redirect while the original manhwa chapter is rebuilt', () => {
    expect(
      publicSeoRedirectRouteRules['/manhwa/the-eclipse-crown/chapter/1']
    ).toEqual({
      redirect: { status: 302, to: '/manhwa/the-eclipse-crown' },
    });
  });

  it('redirects every public alias to the canonical host while preserving the request target', () => {
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

    for (const alias of [
      'nayovi.com',
      'www.nayovi.com',
      'translate-manhwa-ai.com',
      'www.translate-manhwa-ai.com',
    ]) {
      expect(
        getCanonicalHostRedirectLocation(
          new Request('http://internal.test/translate-manhwa-ai', {
            headers: { 'x-forwarded-host': alias },
          })
        )
      ).toBe('https://tachiyomiat.com/translate-manhwa-ai');
    }
  });

  it('does not redirect the canonical domain, local development, or API traffic', () => {
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
    expect(
      getCanonicalHostRedirectLocation(
        new Request('https://internal.test/api/mobile/heartbeat', {
          headers: { 'x-forwarded-host': 'nayovi.com' },
        })
      )
    ).toBeNull();
  });
});
