import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConsumeInMemoryRateLimit, mockRecordMobileFunnelEvent } =
  vi.hoisted(() => ({
    mockConsumeInMemoryRateLimit: vi.fn(),
    mockRecordMobileFunnelEvent: vi.fn(),
  }));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

vi.mock('@/env/client', () => ({
  envClient: {
    VITE_IS_DEMO: false,
  },
}));

vi.mock('@/env/server', () => ({
  envServer: {
    MOBILE_API_ENABLED: true,
  },
}));

vi.mock('@/server/licenses/rate-limit', () => ({
  consumeInMemoryRateLimit: mockConsumeInMemoryRateLimit,
}));

vi.mock('@/server/product-analytics/service', () => ({
  recordMobileFunnelEvent: mockRecordMobileFunnelEvent,
}));

import { Route } from './funnel-events';

const validPayload = {
  consent: {
    analytics: true,
    version: '2026-07',
  },
  eventKey: '12345678-1234-4234-9234-123456789abc',
  installationId: 'android-12345678-1234-1234-1234-123456789abc',
  name: 'paywall_subscribe_clicked',
  occurredAt: '2026-07-31T12:00:00.000Z',
  properties: {
    action: 'translate_chapters',
    mode: 'out_of_tokens',
    reasonCode: 'insufficient_tokens',
    surface: 'manga',
  },
};

describe('POST /api/mobile/funnel-events', () => {
  beforeEach(() => {
    mockConsumeInMemoryRateLimit.mockReset();
    mockRecordMobileFunnelEvent.mockReset();
    mockConsumeInMemoryRateLimit.mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
    });
    mockRecordMobileFunnelEvent.mockResolvedValue({
      accepted: true,
      duplicate: false,
    });
  });

  it('validates and records a consented allowlisted event', async () => {
    const response = await handler()({
      request: new Request('https://example.test/api/mobile/funnel-events', {
        body: JSON.stringify(validPayload),
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'request-1',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        accepted: true,
        duplicate: false,
      },
      ok: true,
    });
    expect(mockRecordMobileFunnelEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: validPayload.eventKey,
        name: 'paywall_subscribe_clicked',
        occurredAt: new Date(validPayload.occurredAt),
      })
    );
    expect(mockConsumeInMemoryRateLimit).toHaveBeenCalledTimes(2);
  });

  it('rejects analytics without affirmative consent or with extra content data', async () => {
    const response = await handler()({
      request: new Request('https://example.test/api/mobile/funnel-events', {
        body: JSON.stringify({
          ...validPayload,
          consent: {
            analytics: false,
            version: '2026-07',
          },
          properties: {
            ...validPayload.properties,
            chapterTitle: 'Private chapter',
          },
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(400);
    expect(mockRecordMobileFunnelEvent).not.toHaveBeenCalled();
  });

  it('rate limits before persisting the event', async () => {
    mockConsumeInMemoryRateLimit.mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 12_000,
    });

    const response = await handler()({
      request: new Request('https://example.test/api/mobile/funnel-events', {
        body: JSON.stringify(validPayload),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('12');
    expect(mockRecordMobileFunnelEvent).not.toHaveBeenCalled();
  });
});

const handler = () =>
  (
    Route as never as {
      options: {
        server: {
          handlers: {
            POST: (input: { request: Request }) => Promise<Response>;
          };
        };
      };
    }
  ).options.server.handlers.POST;
