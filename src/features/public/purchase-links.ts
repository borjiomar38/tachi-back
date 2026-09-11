const TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ANDROID_APP_ID_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;

const assertAndroidAppId = (applicationId: string) => {
  if (!ANDROID_APP_ID_PATTERN.test(applicationId))
    throw new Error('invalid_android_application_id');
};

export const buildAndroidAssetLinks = (
  applicationId: string,
  rawFingerprints: string
) => {
  assertAndroidAppId(applicationId);
  const fingerprints = [...new Set(rawFingerprints
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value)))];
  return fingerprints.length ? [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: applicationId,
      sha256_cert_fingerprints: fingerprints,
    },
  }] : [];
};

export const parsePurchaseTicket = (fragment: string): string | null => {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  if (params.getAll('ticket').length !== 1) return null;
  const ticket = params.get('ticket');
  return ticket && TICKET_PATTERN.test(ticket) ? ticket : null;
};

export const buildNayoviIntentLink = (
  baseUrl: string,
  ticket: string | null,
  applicationId = 'app.tachiback.tachiyomi.at'
) => {
  assertAndroidAppId(applicationId);
  const origin = new URL(baseUrl).host;
  const fallback = new URL('/app/payment', baseUrl);
  if (ticket) {
    if (!TICKET_PATTERN.test(ticket))
      throw new Error('invalid_purchase_ticket');
    fallback.hash = new URLSearchParams({ ticket }).toString();
  }
  const ticketExtra = ticket ? `S.paymentTicket=${ticket};` : '';
  return `intent://${origin}/app/payment#Intent;scheme=https;package=${applicationId};${ticketExtra}S.browser_fallback_url=${encodeURIComponent(fallback.toString())};end`;
};
