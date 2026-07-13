import { describe, expect, it } from 'vitest';

import {
  buildFreeAccessIpClaimBlock,
  FreeAccessIpBlockedError,
} from '@/server/licenses/free-access-ip-block';

import { buildMobileJobErrorResponse } from './http';

describe('mobile job HTTP errors', () => {
  it('returns the subscription prompt for a repeated free-trial identity', async () => {
    const response = buildMobileJobErrorResponse(
      new FreeAccessIpBlockedError(
        buildFreeAccessIpClaimBlock({
          ipAddress: '203.0.113.77',
          now: new Date('2026-07-13T20:00:00.000Z'),
          reason: 'free_trial_claim_already_used',
        })
      ),
      'request-1'
    );

    expect(response.status).toBe(402);
    expect(response.headers.get('X-Request-ID')).toBe('request-1');
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'free_access_unavailable',
        details: {
          message:
            'The free trial is no longer available. To continue, buy a subscription.',
          pricingUrl: '/pricing',
        },
      },
      ok: false,
    });
  });
});
