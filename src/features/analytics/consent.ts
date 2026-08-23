export const ANALYTICS_CONSENT_STORAGE_KEY = 'nayovi.google-analytics-consent';
export const ANALYTICS_CONSENT_VERSION = '2026-08-23';
export const ANALYTICS_PREFERENCES_EVENT = 'nayovi:open-analytics-preferences';

export type AnalyticsConsent = 'granted' | 'denied';

type StoredAnalyticsConsent = {
  consent: AnalyticsConsent;
  version: typeof ANALYTICS_CONSENT_VERSION;
};

export const resolveAnalyticsConsent = (
  storedValue: string | null
): AnalyticsConsent | null => {
  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue) as Partial<StoredAnalyticsConsent>;

    if (
      parsed.version !== ANALYTICS_CONSENT_VERSION ||
      (parsed.consent !== 'granted' && parsed.consent !== 'denied')
    ) {
      return null;
    }

    return parsed.consent;
  } catch {
    return null;
  }
};

export const serializeAnalyticsConsent = (consent: AnalyticsConsent) =>
  JSON.stringify({ consent, version: ANALYTICS_CONSENT_VERSION });

export const readAnalyticsConsent = (
  storage: Pick<Storage, 'getItem'>
): AnalyticsConsent | null =>
  resolveAnalyticsConsent(storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));

export const saveAnalyticsConsent = (
  storage: Pick<Storage, 'setItem'>,
  consent: AnalyticsConsent
) =>
  storage.setItem(
    ANALYTICS_CONSENT_STORAGE_KEY,
    serializeAnalyticsConsent(consent)
  );

export const canLoadGoogleAnalytics = (consent: AnalyticsConsent | null) =>
  consent === 'granted';

export const openAnalyticsPreferences = () => {
  window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT));
};
