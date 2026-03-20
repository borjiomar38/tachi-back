import { randomUUID } from 'node:crypto';

import { getClientIp } from '@/server/licenses/utils';

const REQUEST_ID_HEADER = 'X-Request-ID';
const INCOMING_REQUEST_ID_HEADERS = [
  'x-request-id',
  'x-correlation-id',
] as const;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:/-]{1,128}$/;

export type HttpRequestContext = {
  clientIp: string;
  requestId: string;
  userAgent: string | null;
};

export function buildHttpRequestContext(request: Request): HttpRequestContext {
  return {
    clientIp: getClientIp(request) ?? 'unknown',
    requestId: getOrCreateRequestId(request),
    userAgent: request.headers.get('user-agent'),
  };
}

export function buildApiOkResponse<T>(
  data: T,
  input: {
    headers?: HeadersInit;
    requestId: string;
    status?: number;
  }
) {
  return buildJsonResponse(
    {
      data,
      ok: true,
    },
    input
  );
}

export function buildApiErrorResponse(input: {
  code: string;
  details?: unknown;
  headers?: HeadersInit;
  requestId: string;
  status: number;
}) {
  return buildJsonResponse(
    {
      error: {
        code: input.code,
        ...(input.details === undefined ? {} : { details: input.details }),
      },
      ok: false,
    },
    input
  );
}

export function buildInvalidRequestResponse(
  requestId: string,
  details?: unknown
) {
  return buildApiErrorResponse({
    code: 'invalid_request',
    details,
    requestId,
    status: 400,
  });
}

export function buildRateLimitedResponse(
  requestId: string,
  retryAfterMs: number
) {
  return buildApiErrorResponse({
    code: 'rate_limited',
    headers: {
      'Retry-After': Math.max(Math.ceil(retryAfterMs / 1000), 1).toString(),
    },
    requestId,
    status: 429,
  });
}

export function buildTextResponse(
  body: BodyInit | null,
  input: {
    headers?: HeadersInit;
    requestId: string;
    status: number;
    statusText?: string;
  }
) {
  const headers = new Headers(input.headers);
  headers.set(REQUEST_ID_HEADER, input.requestId);

  return new Response(body, {
    headers,
    status: input.status,
    statusText: input.statusText,
  });
}

export function redirectWithRequestId(
  location: string,
  input: {
    headers?: HeadersInit;
    requestId: string;
    status?: 301 | 302 | 303 | 307 | 308;
  }
) {
  const headers = new Headers(input.headers);
  headers.set('Location', location);
  headers.set(REQUEST_ID_HEADER, input.requestId);

  return new Response(null, {
    headers,
    status: input.status ?? 303,
  });
}

function buildJsonResponse(
  body: unknown,
  input: {
    headers?: HeadersInit;
    requestId: string;
    status?: number;
  }
) {
  const response = Response.json(body, {
    headers: input.headers,
    status: input.status,
  });

  response.headers.set(REQUEST_ID_HEADER, input.requestId);

  return response;
}

function getOrCreateRequestId(request: Request) {
  for (const headerName of INCOMING_REQUEST_ID_HEADERS) {
    const value = request.headers.get(headerName)?.trim();

    if (value && REQUEST_ID_PATTERN.test(value)) {
      return value;
    }
  }

  return randomUUID();
}
