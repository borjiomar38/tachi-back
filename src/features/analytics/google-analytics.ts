import type { AnalyticsConsent } from '@/features/analytics/consent';

type GoogleTag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
  }
}

const GOOGLE_TAG_SCRIPT_ID = 'nayovi-google-analytics';

let initializedMeasurementId: string | null = null;
let loadingGoogleAnalytics: Promise<void> | null = null;

export const createGoogleTag = (dataLayer: unknown[]): GoogleTag => {
  // gtag.js expects the native Arguments object from Google's official snippet.
  // A rest-parameter array is left in the queue and the commands are ignored.
  return function googleTag() {
    dataLayer.push(arguments);
  };
};

const getGoogleTag = (): GoogleTag => {
  window.dataLayer ??= [];
  window.gtag ??= createGoogleTag(window.dataLayer);

  return window.gtag;
};

const queueGrantedConsent = (gtag: GoogleTag) => {
  gtag('consent', 'default', {
    ad_personalization: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    analytics_storage: 'denied',
  });
  gtag('consent', 'update', {
    analytics_storage: 'granted',
  });
};

export const updateGoogleAnalyticsConsent = (consent: AnalyticsConsent) => {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'update', {
    ad_personalization: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    analytics_storage: consent,
  });
};

export const loadGoogleAnalytics = (measurementId: string): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();

  if (initializedMeasurementId === measurementId && loadingGoogleAnalytics) {
    return loadingGoogleAnalytics;
  }

  initializedMeasurementId = measurementId;
  const gtag = getGoogleTag();
  queueGrantedConsent(gtag);
  gtag('js', new Date());
  gtag('config', measurementId);

  loadingGoogleAnalytics = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_TAG_SCRIPT_ID);

    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Google Analytics failed to load')),
      { once: true }
    );
    document.head.append(script);
  });

  return loadingGoogleAnalytics;
};
