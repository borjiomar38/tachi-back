import { performance } from 'node:perf_hooks';

import { ProviderType } from '@/server/db/generated/client';
import {
  createInvalidProviderResponseError,
  normalizeProviderHttpError,
  ProviderGatewayError,
} from '@/server/provider-gateway/errors';

export async function fetchTextWithTimeout(input: {
  body?: BodyInit;
  fetchFn?: typeof fetch;
  headers?: HeadersInit;
  method?: 'GET' | 'POST';
  provider: ProviderType;
  timeoutMs: number;
  url: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const start = performance.now();

  try {
    const response = await (input.fetchFn ?? fetch)(input.url, {
      body: input.body,
      headers: input.headers,
      method: input.method ?? 'POST',
      signal: controller.signal,
    });
    const text = await response.text();
    const latencyMs = Math.round(performance.now() - start);

    if (!response.ok) {
      throw normalizeProviderHttpError({
        provider: input.provider,
        responseText: extractErrorMessage(text),
        status: response.status,
      });
    }

    return {
      headers: response.headers,
      latencyMs,
      text,
    };
  } catch (error) {
    if (error instanceof ProviderGatewayError) {
      throw error;
    }

    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      throw normalizeProviderHttpError({
        provider: input.provider,
        responseText: 'Request timed out.',
        status: 504,
      });
    }

    throw normalizeProviderHttpError({
      provider: input.provider,
      responseText:
        error instanceof Error ? error.message : 'Unexpected provider failure.',
      status: 502,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJsonResponse<T>(
  provider: ProviderType,
  rawText: string,
  invalidMessage: string
) {
  try {
    return JSON.parse(rawText) as T;
  } catch (error) {
    throw createInvalidProviderResponseError(
      provider,
      `${invalidMessage}: ${
        error instanceof Error ? error.message : 'Unable to parse JSON.'
      }`
    );
  }
}

export function parseJsonObjectText(
  provider: ProviderType,
  rawText: string,
  invalidMessage = 'Provider did not return valid JSON output'
) {
  const cleanedText = stripMarkdownCodeBlock(rawText).trim();
  const parsed = parseJsonResponse<unknown>(
    provider,
    cleanedText,
    invalidMessage
  );

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw createInvalidProviderResponseError(provider, invalidMessage);
  }

  return parsed as Record<string, unknown>;
}

export async function retryProviderCall<T>(
  task: () => Promise<T>,
  options: {
    maxAttempts: number;
    sleepMs?: number;
  }
) {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < options.maxAttempts) {
    attempt += 1;
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (
        !(error instanceof ProviderGatewayError) ||
        !error.retryable ||
        attempt >= options.maxAttempts
      ) {
        throw error;
      }

      await sleep((options.sleepMs ?? 200) * attempt);
    }
  }

  throw lastError;
}

export function stripMarkdownCodeBlock(content: string) {
  const trimmed = content.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractErrorMessage(rawText: string) {
  if (!rawText.trim()) {
    return 'Empty error response from provider.';
  }

  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const errorValue =
      ('error' in parsed ? parsed.error : undefined) ??
      ('message' in parsed ? parsed.message : undefined);

    if (typeof errorValue === 'string' && errorValue.trim()) {
      return errorValue.trim();
    }

    if (
      errorValue &&
      typeof errorValue === 'object' &&
      'message' in errorValue &&
      typeof errorValue.message === 'string'
    ) {
      return errorValue.message.trim();
    }
  } catch {
    return rawText.trim();
  }

  return rawText.trim();
}
