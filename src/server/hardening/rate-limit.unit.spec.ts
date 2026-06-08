import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env/server', () => ({
  envServer: {
    CHECKOUT_RATE_LIMIT_MAX_ATTEMPTS: 2,
    CHECKOUT_RATE_LIMIT_WINDOW_SECONDS: 60,
    MOBILE_JOB_CREATE_RATE_LIMIT_MAX_REQUESTS: 2,
    MOBILE_JOB_PAGE_UPLOAD_RATE_LIMIT_MAX_REQUESTS: 5,
    MOBILE_JOB_READ_RATE_LIMIT_MAX_REQUESTS: 4,
    MOBILE_JOB_RATE_LIMIT_WINDOW_SECONDS: 60,
    MOBILE_JOB_WRITE_RATE_LIMIT_MAX_REQUESTS: 3,
  },
}));

import {
  consumeCheckoutCreateRateLimit,
  consumeMobileJobRouteRateLimit,
} from '@/server/hardening/rate-limit';

describe('hardening rate limits', () => {
  it('limits checkout creation per IP using the dedicated checkout budget', () => {
    const now = Date.UTC(2026, 2, 20, 12, 0, 0);
    const clientIp = 'checkout-test-ip';

    const first = consumeCheckoutCreateRateLimit({ clientIp, now });
    const second = consumeCheckoutCreateRateLimit({
      clientIp,
      now: now + 1_000,
    });
    const third = consumeCheckoutCreateRateLimit({
      clientIp,
      now: now + 2_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it('uses separate mobile job budgets for create, write, page upload, and read buckets', () => {
    const baseInput = {
      clientIp: '203.0.113.10',
      deviceId: 'device-1',
      licenseId: 'license-1',
    };
    const now = Date.UTC(2026, 2, 20, 12, 0, 0);

    consumeMobileJobRouteRateLimit({ ...baseInput, bucket: 'create', now });
    consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'create',
      now: now + 1_000,
    });
    const createThird = consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'create',
      now: now + 2_000,
    });

    consumeMobileJobRouteRateLimit({ ...baseInput, bucket: 'write', now });
    consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'write',
      now: now + 1_000,
    });
    consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'write',
      now: now + 2_000,
    });
    const writeFourth = consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'write',
      now: now + 3_000,
    });

    consumeMobileJobRouteRateLimit({ ...baseInput, bucket: 'read', now });
    consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'read',
      now: now + 1_000,
    });
    consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'read',
      now: now + 2_000,
    });
    consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'read',
      now: now + 3_000,
    });
    const readFifth = consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'read',
      now: now + 4_000,
    });

    for (const offset of [0, 1_000, 2_000, 3_000, 4_000]) {
      consumeMobileJobRouteRateLimit({
        ...baseInput,
        bucket: 'page_upload',
        now: now + offset,
        scopeId: 'job-1',
      });
    }
    const pageUploadSixth = consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'page_upload',
      now: now + 5_000,
      scopeId: 'job-1',
    });

    expect(createThird.allowed).toBe(false);
    expect(writeFourth.allowed).toBe(false);
    expect(pageUploadSixth.allowed).toBe(false);
    expect(readFifth.allowed).toBe(false);
  });

  it('scopes page upload budgets by job without consuming the global write budget', () => {
    const baseInput = {
      clientIp: '203.0.113.11',
      deviceId: 'device-2',
      licenseId: 'license-2',
    };
    const now = Date.UTC(2026, 2, 20, 12, 0, 0);

    for (const offset of [0, 1_000, 2_000, 3_000, 4_000]) {
      consumeMobileJobRouteRateLimit({
        ...baseInput,
        bucket: 'page_upload',
        now: now + offset,
        scopeId: 'job-a',
      });
    }

    const sameJobSixth = consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'page_upload',
      now: now + 5_000,
      scopeId: 'job-a',
    });
    const nextJobFirst = consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'page_upload',
      now: now + 6_000,
      scopeId: 'job-b',
    });
    const writeFirst = consumeMobileJobRouteRateLimit({
      ...baseInput,
      bucket: 'write',
      now: now + 7_000,
    });

    expect(sameJobSixth.allowed).toBe(false);
    expect(nextJobFirst.allowed).toBe(true);
    expect(writeFirst.allowed).toBe(true);
  });
});
