import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

import { envClient } from '@/env/client';
import {
  ANALYTICS_PREFERENCES_EVENT,
  AnalyticsConsent,
  canLoadGoogleAnalytics,
  readAnalyticsConsent,
  saveAnalyticsConsent,
} from '@/features/analytics/consent';
import {
  loadGoogleAnalytics,
  updateGoogleAnalyticsConsent,
} from '@/features/analytics/google-analytics';
import { getAnalyticsConsentRequirement } from '@/features/analytics/region-server';

export const AnalyticsConsentManager = () => {
  const measurementId = envClient.VITE_GOOGLE_ANALYTICS_ID;
  const [storedConsent, setStoredConsent] = useState<
    AnalyticsConsent | null | undefined
  >(undefined);
  const [consentRequired, setConsentRequired] = useState<boolean>();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!measurementId) return;

    setStoredConsent(readAnalyticsConsent(window.localStorage));
    void getAnalyticsConsentRequirement()
      .then(({ consentRequired: required }) => setConsentRequired(required))
      .catch(() => setConsentRequired(true));

    const openPreferences = () => setPreferencesOpen(true);
    window.addEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);

    return () => {
      window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);
    };
  }, [measurementId]);

  const consent = preferencesOpen
    ? null
    : (storedConsent ??
      (consentRequired === false
        ? 'granted'
        : consentRequired === true
          ? null
          : undefined));

  useEffect(() => {
    if (!measurementId || consent === undefined || consent === null) return;

    if (!canLoadGoogleAnalytics(consent)) {
      updateGoogleAnalyticsConsent('denied');
      return;
    }

    void loadGoogleAnalytics(measurementId).catch((error: unknown) => {
      console.warn('Google Analytics could not load', error);
    });
  }, [consent, measurementId]);

  if (!measurementId || consent !== null) return null;

  const chooseConsent = (nextConsent: AnalyticsConsent) => {
    saveAnalyticsConsent(window.localStorage, nextConsent);
    setStoredConsent(nextConsent);
    setPreferencesOpen(false);
  };

  return (
    <aside
      aria-describedby="analytics-consent-description"
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl rounded-2xl border border-white/15 bg-neutral-950/95 p-4 text-neutral-50 shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-4 md:bottom-4 md:mx-0 md:w-[min(36rem,calc(100vw-2rem))]"
      data-testid="analytics-consent"
      role="dialog"
    >
      <div className="space-y-1">
        <h2 id="analytics-consent-title" className="text-base font-semibold">
          Cookies
        </h2>
        <p
          id="analytics-consent-description"
          className="text-sm leading-5 text-neutral-300"
        >
          We use cookies to improve your experience and understand how Nayovi is
          used.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 items-center gap-2 sm:grid-cols-[auto_auto_1fr]">
        <Button
          type="button"
          variant="secondary"
          className="w-full border-white/20 bg-white/5 text-neutral-50 hover:bg-white/10"
          onClick={() => chooseConsent('denied')}
        >
          Only necessary
        </Button>
        <Button
          type="button"
          className="w-full bg-brand-300 text-brand-950 hover:bg-brand-200"
          onClick={() => chooseConsent('granted')}
        >
          Accept all
        </Button>
        <a
          href="/legal/privacy"
          className="col-span-2 justify-self-center px-2 py-1 text-sm font-medium text-brand-200 underline-offset-4 hover:underline sm:col-span-1 sm:justify-self-end"
        >
          Learn more
        </a>
      </div>
    </aside>
  );
};
