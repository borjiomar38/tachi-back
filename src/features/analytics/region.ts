const ANALYTICS_CONSENT_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
]);

const UNKNOWN_COUNTRY_CODES = new Set(['T1', 'XX']);

export const normalizeVisitorCountryCode = (
  countryCode: string | null | undefined
) => {
  const normalized = countryCode?.trim().toUpperCase();

  if (
    !normalized ||
    !/^[A-Z]{2}$/.test(normalized) ||
    UNKNOWN_COUNTRY_CODES.has(normalized)
  ) {
    return null;
  }

  return normalized;
};

export const shouldRequestCookieConsent = (
  countryCode: string | null | undefined
) => {
  const normalized = normalizeVisitorCountryCode(countryCode);

  // Fail closed when hosting cannot determine the visitor's country.
  return normalized === null || ANALYTICS_CONSENT_COUNTRY_CODES.has(normalized);
};

export const resolveVisitorCountryCode = (headers: Pick<Headers, 'get'>) =>
  normalizeVisitorCountryCode(
    headers.get('x-vercel-ip-country') ?? headers.get('cf-ipcountry')
  );
