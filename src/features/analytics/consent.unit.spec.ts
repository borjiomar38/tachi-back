import { describe, expect, it } from 'vitest';

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_VERSION,
  canLoadGoogleAnalytics,
  readAnalyticsConsent,
  resolveAnalyticsConsent,
  saveAnalyticsConsent,
} from '@/features/analytics/consent';

describe('Google Analytics consent policy', () => {
  it('requires an explicit grant before Analytics can load', () => {
    expect(canLoadGoogleAnalytics(null)).toBe(false);
    expect(canLoadGoogleAnalytics('denied')).toBe(false);
    expect(canLoadGoogleAnalytics('granted')).toBe(true);
  });

  it('ignores malformed and obsolete saved decisions', () => {
    expect(resolveAnalyticsConsent('not-json')).toBeNull();
    expect(
      resolveAnalyticsConsent(
        JSON.stringify({ consent: 'granted', version: '2026-01-01' })
      )
    ).toBeNull();
  });

  it('saves and reads the current consent version', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    saveAnalyticsConsent(storage, 'granted');

    expect(readAnalyticsConsent(storage)).toBe('granted');
    expect(
      JSON.parse(values.get(ANALYTICS_CONSENT_STORAGE_KEY) ?? '{}')
    ).toEqual({
      consent: 'granted',
      version: ANALYTICS_CONSENT_VERSION,
    });
  });
});
