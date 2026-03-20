import { ProviderType } from '@/server/db/generated/client';

export type ProviderGatewayErrorCode =
  | 'auth_error'
  | 'config_error'
  | 'invalid_response'
  | 'policy_blocked'
  | 'quota_exhausted'
  | 'rate_limited'
  | 'timeout'
  | 'unsupported_provider'
  | 'upstream_error';

export class ProviderGatewayError extends Error {
  constructor(
    readonly code: ProviderGatewayErrorCode,
    readonly provider: ProviderType,
    readonly retryable: boolean,
    readonly statusCode: number,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'ProviderGatewayError';
  }
}

export function createProviderConfigError(
  provider: ProviderType,
  message: string
) {
  return new ProviderGatewayError(
    'config_error',
    provider,
    false,
    500,
    message
  );
}

export function createUnsupportedProviderError(provider: ProviderType) {
  return new ProviderGatewayError(
    'unsupported_provider',
    provider,
    false,
    400,
    `Provider ${provider} is not supported by the hosted gateway.`
  );
}

export function createInvalidProviderResponseError(
  provider: ProviderType,
  message: string
) {
  return new ProviderGatewayError(
    'invalid_response',
    provider,
    false,
    502,
    message
  );
}

export function normalizeProviderHttpError(input: {
  provider: ProviderType;
  responseText: string;
  status: number;
}) {
  const responseText = input.responseText.trim();
  const lower = responseText.toLowerCase();

  if (input.status === 401 || input.status === 403) {
    if (
      lower.includes('quota') ||
      lower.includes('billing') ||
      lower.includes('credits') ||
      lower.includes('insufficient')
    ) {
      return new ProviderGatewayError(
        'quota_exhausted',
        input.provider,
        false,
        input.status,
        responseText || 'Provider quota or billing is exhausted.'
      );
    }

    return new ProviderGatewayError(
      'auth_error',
      input.provider,
      false,
      input.status,
      responseText || 'Provider authentication failed.'
    );
  }

  if (input.status === 408 || input.status === 504) {
    return new ProviderGatewayError(
      'timeout',
      input.provider,
      true,
      input.status,
      responseText || 'Provider request timed out.'
    );
  }

  if (input.status === 429) {
    return new ProviderGatewayError(
      'rate_limited',
      input.provider,
      true,
      input.status,
      responseText || 'Provider rate limit reached.'
    );
  }

  if (
    lower.includes('safety') ||
    lower.includes('policy') ||
    lower.includes('content blocked') ||
    lower.includes('blocked by')
  ) {
    return new ProviderGatewayError(
      'policy_blocked',
      input.provider,
      false,
      input.status || 400,
      responseText || 'Provider blocked the request for policy reasons.'
    );
  }

  if (
    lower.includes('quota') ||
    lower.includes('billing') ||
    lower.includes('credits') ||
    lower.includes('resource exhausted')
  ) {
    return new ProviderGatewayError(
      'quota_exhausted',
      input.provider,
      false,
      input.status || 429,
      responseText || 'Provider quota is exhausted.'
    );
  }

  return new ProviderGatewayError(
    'upstream_error',
    input.provider,
    input.status >= 500,
    input.status || 502,
    responseText || 'Unexpected provider error.'
  );
}
