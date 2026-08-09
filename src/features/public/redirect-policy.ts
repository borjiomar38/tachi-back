import type { NitroRouteConfig } from 'nitro/types';

const canonicalPublicHostname = 'tachiyomiat.com';
const legacyPublicHostname = `www.${canonicalPublicHostname}`;

export const publicSeoRedirectRouteRules = {
  '/blog/download-tachiyomiat-for-manhwa-translation': {
    redirect: {
      status: 301,
      to: '/blog/download-nayovi-for-manhwa-translation',
    },
  },
  '/comic-ocr-checklist': {
    redirect: {
      status: 301,
      to: '/guides/comic-ocr-translation-checklist',
    },
  },
  '/download-tachiyomi': {
    redirect: { status: 301, to: '/download' },
  },
  '/download-tachiyomiat': {
    redirect: { status: 301, to: '/download' },
  },
  '/manhwa/the-eclipse-crown/chapter/1': {
    redirect: { status: 302, to: '/manhwa/the-eclipse-crown' },
  },
  '/mihon': {
    redirect: { status: 301, to: '/guides/mihon-nayovi-setup' },
  },
  '/og/tachiyomiat-social-preview.jpg': {
    redirect: { status: 301, to: '/og/nayovi-social-preview.jpg' },
  },
  '/permissions': {
    redirect: {
      status: 301,
      to: '/guides/permission-safe-manga-translation-pilot',
    },
  },
  '/tachiyomi': {
    redirect: { status: 301, to: '/guides/mihon-tachiyomiat-setup' },
  },
  '/tachiyomi-at': {
    redirect: { status: 301, to: '/guides/mihon-tachiyomiat-setup' },
  },
  '/tachiyomi-back-hero.svg': {
    redirect: { status: 301, to: '/nayovi-hero.svg' },
  },
  '/tachiyomi-download': {
    redirect: { status: 301, to: '/download' },
  },
  '/tachiyomiat': {
    redirect: { status: 301, to: '/guides/mihon-tachiyomiat-setup' },
  },
  '/tachiyomiat-download': {
    redirect: { status: 301, to: '/download' },
  },
  '/tachiyomiat-logo.svg': {
    redirect: { status: 301, to: '/nayovi-logo.svg' },
  },
  '/tachiyomiat-mark-dark.png': {
    redirect: { status: 301, to: '/nayovi-mark-dark.png' },
  },
  '/tachiyomiat-mark-light.png': {
    redirect: { status: 301, to: '/nayovi-mark-light.png' },
  },
  '/tachiyomiat-mark.svg': {
    redirect: { status: 301, to: '/nayovi-mark.svg' },
  },
  '/terms': {
    redirect: { status: 301, to: '/legal/terms' },
  },
} satisfies Record<string, NitroRouteConfig>;

export const getCanonicalHostRedirectLocation = (request: Request) => {
  const hostname = resolveRequestHostname(request);

  if (hostname !== legacyPublicHostname) {
    return null;
  }

  const canonicalUrl = new URL(request.url);
  canonicalUrl.protocol = 'https:';
  canonicalUrl.hostname = canonicalPublicHostname;
  canonicalUrl.port = '';

  return canonicalUrl.toString();
};

export const createCanonicalHostRedirectResponse = (request: Request) => {
  const location = getCanonicalHostRedirectLocation(request);

  if (!location) {
    return null;
  }

  return new Response(null, {
    headers: { location },
    status: 308,
  });
};

const resolveRequestHostname = (request: Request) => {
  const forwardedHost = getFirstHeaderValue(
    request.headers.get('x-forwarded-host')
  );
  const host = forwardedHost ?? getFirstHeaderValue(request.headers.get('host'));

  if (!host) {
    return new URL(request.url).hostname.toLowerCase();
  }

  try {
    return new URL(`https://${host}`).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const getFirstHeaderValue = (value: string | null) =>
  value
    ?.split(',')
    .map((part) => part.trim())
    .find(Boolean);
