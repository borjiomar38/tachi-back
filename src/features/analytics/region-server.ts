import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import {
  resolveVisitorCountryCode,
  shouldRequestCookieConsent,
} from '@/features/analytics/region';

export const getAnalyticsConsentRequirement = createServerFn({
  method: 'GET',
}).handler(() => {
  const countryCode = resolveVisitorCountryCode(getRequestHeaders());

  return {
    consentRequired: shouldRequestCookieConsent(countryCode),
  };
});
