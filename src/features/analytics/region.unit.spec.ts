import { describe, expect, it } from 'vitest';

import {
  normalizeVisitorCountryCode,
  resolveVisitorCountryCode,
  shouldRequestCookieConsent,
} from '@/features/analytics/region';

describe('cookie consent region policy', () => {
  it.each(['FR', 'de', 'GB', 'CH', 'NO'])(
    'requests consent for %s',
    (countryCode) => {
      expect(shouldRequestCookieConsent(countryCode)).toBe(true);
    }
  );

  it.each(['SA', 'US', 'JP', 'BR'])(
    'does not interrupt visitors from %s',
    (countryCode) => {
      expect(shouldRequestCookieConsent(countryCode)).toBe(false);
    }
  );

  it('fails closed when geolocation is missing or unknown', () => {
    expect(shouldRequestCookieConsent(null)).toBe(true);
    expect(shouldRequestCookieConsent('XX')).toBe(true);
    expect(shouldRequestCookieConsent('T1')).toBe(true);
    expect(normalizeVisitorCountryCode('invalid')).toBeNull();
  });

  it('prefers the Vercel country header and supports Cloudflare', () => {
    expect(
      resolveVisitorCountryCode(
        new Headers({
          'cf-ipcountry': 'US',
          'x-vercel-ip-country': 'FR',
        })
      )
    ).toBe('FR');
    expect(
      resolveVisitorCountryCode(new Headers({ 'cf-ipcountry': 'sa' }))
    ).toBe('SA');
  });
});
