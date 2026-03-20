import { describe, expect, it } from 'vitest';

import {
  buildApiErrorResponse,
  buildApiOkResponse,
  buildHttpRequestContext,
  buildRateLimitedResponse,
  buildTextResponse,
  redirectWithRequestId,
} from '@/server/http/route-utils';

describe('route utils', () => {
  it('reuses a valid incoming request id and forwarded client IP', () => {
    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 198.51.100.2',
        'x-request-id': 'req-123',
      },
    });

    const context = buildHttpRequestContext(request);

    expect(context.clientIp).toBe('203.0.113.1');
    expect(context.requestId).toBe('req-123');
  });

  it('adds the request id header to success and error responses', async () => {
    const okResponse = buildApiOkResponse(
      { hello: 'world' },
      { requestId: 'req-ok' }
    );
    const errorResponse = buildApiErrorResponse({
      code: 'invalid_request',
      requestId: 'req-error',
      status: 400,
    });

    expect(okResponse.headers.get('X-Request-ID')).toBe('req-ok');
    expect(errorResponse.headers.get('X-Request-ID')).toBe('req-error');
    await expect(okResponse.json()).resolves.toEqual({
      data: { hello: 'world' },
      ok: true,
    });
    await expect(errorResponse.json()).resolves.toEqual({
      error: { code: 'invalid_request' },
      ok: false,
    });
  });

  it('builds rate-limited responses with retry headers', () => {
    const response = buildRateLimitedResponse('req-rate', 1_500);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('2');
    expect(response.headers.get('X-Request-ID')).toBe('req-rate');
  });

  it('adds request ids to text and redirect responses', () => {
    const textResponse = buildTextResponse('Demo Mode', {
      requestId: 'req-text',
      status: 405,
    });
    const redirectResponse = redirectWithRequestId('https://example.com/next', {
      requestId: 'req-redirect',
    });

    expect(textResponse.headers.get('X-Request-ID')).toBe('req-text');
    expect(redirectResponse.headers.get('Location')).toBe(
      'https://example.com/next'
    );
    expect(redirectResponse.headers.get('X-Request-ID')).toBe('req-redirect');
  });
});
