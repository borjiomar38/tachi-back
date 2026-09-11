import { describe, expect, it } from 'vitest';

import {
  buildAndroidAssetLinks,
  buildNayoviIntentLink,
  parsePurchaseTicket,
} from '@/features/public/purchase-links';
import {
  buildPurchaseReturnUrl,
  createPurchaseTicket,
  hashPurchaseTicket,
} from '@/server/payments/purchase-policy';

describe('opaque purchase return links', () => {
  it('puts a random ticket only in the fragment and stores only a hash', () => {
    const ticket = createPurchaseTicket();
    expect(ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const url = new URL(
      buildPurchaseReturnUrl('https://tachiyomiat.com', ticket)
    );
    expect(url.search).toBe('');
    expect(url.pathname).toBe('/app/payment');
    expect(parsePurchaseTicket(url.hash)).toBe(ticket);
    expect(hashPurchaseTicket(ticket)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPurchaseTicket(ticket)).not.toBe(ticket);
  });
  it('rejects duplicate and raw redeem values', () => {
    const ticket = createPurchaseTicket();
    expect(parsePurchaseTicket('#ticket=TB-TEST-REDEEM')).toBeNull();
    expect(
      parsePurchaseTicket('#ticket=' + ticket + '&ticket=' + ticket)
    ).toBeNull();
  });
  it('targets the Nayovi Android package and supplies a browser fallback', () => {
    const ticket = createPurchaseTicket();
    const intent = buildNayoviIntentLink('https://tachiyomiat.com', ticket);
    expect(intent).toContain('package=app.tachiback.tachiyomi.at');
    expect(intent).toContain('S.paymentTicket=' + ticket);
    expect(intent).toContain('S.browser_fallback_url=');
    expect(intent).not.toContain('?ticket=');
  });
  it('targets only the isolated staging package on staging', () => {
    const ticket = createPurchaseTicket();
    const intent = buildNayoviIntentLink(
      'https://staging.62.171.171.212.sslip.io', ticket,
      'app.tachiback.tachiyomi.at.tokenstest'
    );
    expect(intent).toContain('package=app.tachiback.tachiyomi.at.tokenstest;');
    expect(intent).not.toContain('package=app.tachiback.tachiyomi.at;');
    expect(intent).toContain('intent://staging.62.171.171.212.sslip.io/app/payment');
  });
  it('rejects intent injection via the configured package', () => {
    expect(() => buildNayoviIntentLink('https://example.test', null, 'app.test;S.extra=bad'))
      .toThrow('invalid_android_application_id');
  });
  it('uses the same configured package for domain verification and filters invalid certificates', () => {
    const fingerprint = Array(32).fill('AB').join(':');
    expect(buildAndroidAssetLinks('app.tachiback.tachiyomi.at.tokenstest', `bad, ${fingerprint.toLowerCase()},${fingerprint}`))
      .toEqual([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'app.tachiback.tachiyomi.at.tokenstest',
          sha256_cert_fingerprints: [fingerprint],
        },
      }]);
    expect(buildAndroidAssetLinks('app.tachiback.tachiyomi.at', 'bad')).toEqual([]);
  });
});
