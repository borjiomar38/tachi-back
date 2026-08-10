import { BlockList, isIP } from 'node:net';

export type OpenAIPornographyModerationErrorCode =
  | 'configuration_error'
  | 'http_error'
  | 'malformed_response'
  | 'request_failed'
  | 'timeout';

export class OpenAIPornographyModerationError extends Error {
  constructor(
    readonly code: OpenAIPornographyModerationErrorCode,
    readonly retryable: boolean,
    readonly statusCode?: number
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'OpenAIPornographyModerationError';
  }
}

export interface OpenAIPornographyModerationInput {
  imageUrl?: string | null;
  title: string;
}

export interface OpenAIPornographyModerationDependencies {
  apiKey: string;
  baseUrl: string;
  fetchFn?: typeof fetch;
  model: string;
  timeoutMs: number;
}

export interface OpenAIPornographyModerationResult {
  id: string;
  imageIncluded: boolean;
  model: string;
  sexual: boolean;
  sexualAppliedInputTypes: Array<'image' | 'text'>;
  sexualScore: number;
}

const ERROR_MESSAGES: Record<OpenAIPornographyModerationErrorCode, string> = {
  configuration_error: 'OpenAI moderation configuration is invalid.',
  http_error: 'OpenAI moderation request was rejected.',
  malformed_response: 'OpenAI moderation returned an invalid response.',
  request_failed: 'OpenAI moderation request failed.',
  timeout: 'OpenAI moderation request timed out.',
};

const BLOCKED_IPV4_SUBNETS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const;

const BLOCKED_IPV6_SUBNETS = [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001:2::', 48],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const;

const BLOCKED_HOST_SUFFIXES = [
  '.home',
  '.home.arpa',
  '.internal',
  '.lan',
  '.local',
  '.localhost',
  '.localdomain',
];

const blockedAddressList = new BlockList();

for (const [address, prefix] of BLOCKED_IPV4_SUBNETS) {
  blockedAddressList.addSubnet(address, prefix, 'ipv4');
  blockedAddressList.addSubnet(`::ffff:${address}`, 96 + prefix, 'ipv6');
}

for (const [address, prefix] of BLOCKED_IPV6_SUBNETS) {
  blockedAddressList.addSubnet(address, prefix, 'ipv6');
}

export async function moderateMangaPornography(
  input: OpenAIPornographyModerationInput,
  deps: OpenAIPornographyModerationDependencies
): Promise<OpenAIPornographyModerationResult> {
  const config = validateDependencies(deps);
  const safeImageUrl = getSafePublicImageUrl(input.imageUrl);
  const textInput = {
    text: `Manga title: ${input.title}`,
    type: 'text' as const,
  };
  const moderationInput: Array<
    | { text: string; type: 'text' }
    | { image_url: { url: string }; type: 'image_url' }
  > = [textInput];

  if (safeImageUrl) {
    moderationInput.push({
      image_url: { url: safeImageUrl },
      type: 'image_url',
    });
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(createModerationError('timeout'));
    }, config.timeoutMs);
  });

  const requestPromise = (async () => {
    try {
      return await requestModeration({
        apiKey: config.apiKey,
        body: {
          input: moderationInput,
          model: config.model,
        },
        fetchFn: deps.fetchFn ?? fetch,
        imageIncluded: safeImageUrl !== null,
        signal: controller.signal,
        url: `${config.baseUrl}/moderations`,
      });
    } catch (error) {
      // Remote extension covers often require cookies, referer headers, or have
      // expired signed URLs. If OpenAI rejects that image input, retain the
      // useful title signal while explicitly reporting that no image was used.
      // The policy layer maps this text-only result to review unless the sexual
      // signal is strong enough to block.
      if (
        safeImageUrl &&
        error instanceof OpenAIPornographyModerationError &&
        error.code === 'http_error' &&
        error.statusCode === 400
      ) {
        return await requestModeration({
          apiKey: config.apiKey,
          body: {
            input: [textInput],
            model: config.model,
          },
          fetchFn: deps.fetchFn ?? fetch,
          imageIncluded: false,
          signal: controller.signal,
          url: `${config.baseUrl}/moderations`,
        });
      }

      throw error;
    }
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
}

async function requestModeration(input: {
  apiKey: string;
  body: {
    input: Array<
      | { text: string; type: 'text' }
      | { image_url: { url: string }; type: 'image_url' }
    >;
    model: string;
  };
  fetchFn: typeof fetch;
  imageIncluded: boolean;
  signal: AbortSignal;
  url: string;
}) {
  let response: Response;

  try {
    response = await input.fetchFn(input.url, {
      body: JSON.stringify(input.body),
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: input.signal,
    });
  } catch {
    if (input.signal.aborted) {
      throw createModerationError('timeout');
    }

    throw createModerationError('request_failed');
  }

  if (!response.ok) {
    throw createModerationError('http_error', response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (input.signal.aborted) {
      throw createModerationError('timeout');
    }

    throw createModerationError('malformed_response');
  }

  return parseModerationResponse(payload, input.imageIncluded);
}

function parseModerationResponse(
  payload: unknown,
  imageIncluded: boolean
): OpenAIPornographyModerationResult {
  if (!isRecord(payload)) {
    throw createModerationError('malformed_response');
  }

  const id = payload.id;
  const model = payload.model;
  const results = payload.results;
  const firstResult = Array.isArray(results) ? results[0] : undefined;

  if (
    typeof id !== 'string' ||
    !id.trim() ||
    typeof model !== 'string' ||
    !model.trim() ||
    !isRecord(firstResult)
  ) {
    throw createModerationError('malformed_response');
  }

  const categories = firstResult.categories;
  const categoryScores = firstResult.category_scores;
  const categoryAppliedInputTypes = firstResult.category_applied_input_types;

  if (
    !isRecord(categories) ||
    typeof categories.sexual !== 'boolean' ||
    !isRecord(categoryScores) ||
    typeof categoryScores.sexual !== 'number' ||
    !Number.isFinite(categoryScores.sexual) ||
    categoryScores.sexual < 0 ||
    categoryScores.sexual > 1 ||
    !isRecord(categoryAppliedInputTypes) ||
    !isSexualAppliedInputTypes(categoryAppliedInputTypes.sexual)
  ) {
    throw createModerationError('malformed_response');
  }

  return {
    id,
    imageIncluded,
    model,
    sexual: categories.sexual,
    sexualAppliedInputTypes: categoryAppliedInputTypes.sexual,
    sexualScore: categoryScores.sexual,
  };
}

function isSexualAppliedInputTypes(
  value: unknown
): value is Array<'image' | 'text'> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item === 'image' || item === 'text')
  );
}

function getSafePublicImageUrl(candidate: string | null | undefined) {
  if (!candidate?.trim()) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate.trim());
  } catch {
    return null;
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username ||
    parsed.password
  ) {
    return null;
  }

  const hostname = parsed.hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
  const addressFamily = isIP(hostname);

  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === 'host.docker.internal' ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix)) ||
    (addressFamily === 0 && !hostname.includes('.')) ||
    (addressFamily === 4 && blockedAddressList.check(hostname, 'ipv4')) ||
    (addressFamily === 6 && blockedAddressList.check(hostname, 'ipv6'))
  ) {
    return null;
  }

  return parsed.href;
}

function validateDependencies(deps: OpenAIPornographyModerationDependencies) {
  const apiKey = deps.apiKey.trim();
  const baseUrl = deps.baseUrl.trim().replace(/\/+$/, '');
  const model = deps.model.trim();

  if (
    !apiKey ||
    !baseUrl ||
    !model ||
    !Number.isFinite(deps.timeoutMs) ||
    deps.timeoutMs <= 0
  ) {
    throw createModerationError('configuration_error');
  }

  return {
    apiKey,
    baseUrl,
    model,
    timeoutMs: deps.timeoutMs,
  };
}

function createModerationError(
  code: OpenAIPornographyModerationErrorCode,
  statusCode?: number
) {
  return new OpenAIPornographyModerationError(
    code,
    code === 'timeout' ||
      code === 'request_failed' ||
      (code === 'http_error' &&
        statusCode !== undefined &&
        (statusCode === 408 || statusCode === 429 || statusCode >= 500)),
    statusCode
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
