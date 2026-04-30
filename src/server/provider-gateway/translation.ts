import { envServer } from '@/env/server';
import { ProviderType } from '@/server/db/generated/client';
import {
  createInvalidProviderResponseError,
  createProviderConfigError,
  createRetryableInvalidProviderResponseError,
  ProviderGatewayError,
} from '@/server/provider-gateway/errors';
import { getProviderGatewayManifest } from '@/server/provider-gateway/manifest';
import {
  buildBlockSourceHash,
  buildBlockTranslationKey,
  buildTranslationPrompt,
} from '@/server/provider-gateway/prompts';
import {
  getEffectiveTranslationModel,
  getProviderGatewayRuntimeConfig,
  ProviderGatewayRuntimeConfig,
} from '@/server/provider-gateway/runtime-config';
import {
  NormalizedTranslationBatch,
  TranslationGatewayInput,
  zNormalizedTranslationBatch,
  zTranslationGatewayInput,
} from '@/server/provider-gateway/schema';
import {
  fetchTextWithTimeout,
  parseJsonObjectText,
  parseJsonResponse,
} from '@/server/provider-gateway/utils';

type TranslationProvider = 'anthropic' | 'gemini' | 'openai';

export async function performTranslationWithProvider(
  rawInput: unknown,
  deps: {
    fetchFn?: typeof fetch;
    preferredProvider?: TranslationProvider;
    runtimeConfig?: ProviderGatewayRuntimeConfig;
    timeoutMs?: number;
  } = {}
): Promise<NormalizedTranslationBatch> {
  const input = zTranslationGatewayInput.parse(rawInput);
  const runtimeConfig =
    deps.runtimeConfig ?? (await getProviderGatewayRuntimeConfig()).current;
  const provider = resolveTranslationProvider(
    deps.preferredProvider ??
      (input.preferredProvider as TranslationProvider | undefined),
    runtimeConfig
  );

  switch (provider) {
    case ProviderType.gemini:
      return await translateWithGemini(input, deps, runtimeConfig);
    case ProviderType.openai:
      return await translateWithOpenAI(input, deps, runtimeConfig);
    case ProviderType.anthropic:
      return await translateWithAnthropic(input, deps);
  }

  throw createProviderConfigError(
    ProviderType.internal,
    'No hosted translation provider is configured.'
  );
}

function resolveTranslationProvider(
  preferredProvider: TranslationProvider | undefined,
  runtimeConfig: ProviderGatewayRuntimeConfig
): TranslationProvider {
  const manifest = getProviderGatewayManifest();

  if (preferredProvider) {
    const match = manifest.translation.providers.find(
      (provider) =>
        provider.provider === preferredProvider &&
        provider.enabled &&
        provider.supportedByGateway
    );

    if (match) {
      return preferredProvider;
    }
  }

  const fallback =
    manifest.translation.providers.find(
      (provider) =>
        provider.provider === runtimeConfig.translationProviderPrimary &&
        provider.enabled &&
        provider.supportedByGateway
    ) ??
    manifest.translation.providers.find(
      (provider) => provider.enabled && provider.supportedByGateway
    );

  if (
    fallback?.provider === ProviderType.gemini ||
    fallback?.provider === ProviderType.openai ||
    fallback?.provider === ProviderType.anthropic
  ) {
    return fallback.provider;
  }

  throw createProviderConfigError(
    ProviderType.internal,
    'No hosted translation provider is configured.'
  );
}

async function translateWithGemini(
  input: TranslationGatewayInput,
  deps: {
    fetchFn?: typeof fetch;
    timeoutMs?: number;
  },
  runtimeConfig: ProviderGatewayRuntimeConfig
) {
  const apiKey = envServer.GEMINI_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.gemini,
      'GEMINI_API_KEY is not configured.'
    );
  }

  const prompt = buildTranslationPrompt(input);
  const modelName = getEffectiveTranslationModel({
    config: runtimeConfig,
    provider: 'gemini',
  });
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt.userPrompt }],
          role: 'user',
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
      systemInstruction: {
        parts: [{ text: prompt.systemPrompt }],
      },
    }),
    fetchFn: deps.fetchFn,
    headers: {
      'Content-Type': 'application/json',
    },
    provider: ProviderType.gemini,
    timeoutMs: deps.timeoutMs ?? envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
  });

  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.gemini,
    response.text,
    'Gemini returned malformed JSON'
  );
  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const candidate = candidates[0];

  if (!candidate || typeof candidate !== 'object') {
    throw createInvalidProviderResponseError(
      ProviderType.gemini,
      'Gemini did not return a usable candidate.'
    );
  }

  const parts =
    candidate.content &&
    typeof candidate.content === 'object' &&
    Array.isArray(candidate.content.parts)
      ? candidate.content.parts
      : [];
  const text = parts
    .map((part: unknown) => {
      const partRecord =
        part && typeof part === 'object' ? (part as { text?: unknown }) : null;

      return partRecord && typeof partRecord.text === 'string'
        ? partRecord.text
        : '';
    })
    .join('')
    .trim();

  return buildNormalizedTranslationResult({
    finishReason:
      typeof candidate.finishReason === 'string'
        ? candidate.finishReason
        : null,
    modelName,
    pages: input.pages,
    prompt,
    provider: ProviderType.gemini,
    providerRequestId:
      (typeof json.responseId === 'string' ? json.responseId : null) ??
      response.headers.get('x-request-id'),
    rawText: text,
    sourceLanguage: input.sourceLanguage,
    stopReason: null,
    targetLanguage: input.targetLanguage,
    usage: json.usageMetadata,
    usageDefaults: {
      latencyMs: response.latencyMs,
      pageCount: input.pages.length,
      requestCount: 1,
    },
  });
}

async function translateWithOpenAI(
  input: TranslationGatewayInput,
  deps: {
    fetchFn?: typeof fetch;
    timeoutMs?: number;
  },
  runtimeConfig: ProviderGatewayRuntimeConfig
) {
  const apiKey = envServer.OPENAI_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.openai,
      'OPENAI_API_KEY is not configured.'
    );
  }

  const prompt = buildTranslationPrompt(input);
  const modelName = getEffectiveTranslationModel({
    config: runtimeConfig,
    provider: 'openai',
  });
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      max_completion_tokens: 8192,
      messages: [
        {
          content: prompt.systemPrompt,
          role: 'system',
        },
        {
          content: prompt.userPrompt,
          role: 'user',
        },
      ],
      model: modelName,
      response_format: {
        type: 'json_object',
      },
    }),
    fetchFn: deps.fetchFn,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    provider: ProviderType.openai,
    timeoutMs: deps.timeoutMs ?? envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: 'https://api.openai.com/v1/chat/completions',
  });

  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.openai,
    response.text,
    'OpenAI returned malformed JSON'
  );
  const choices = Array.isArray(json.choices) ? json.choices : [];
  const choice = choices[0];
  const message =
    choice &&
    typeof choice === 'object' &&
    choice.message &&
    typeof choice.message === 'object'
      ? choice.message
      : null;
  const content =
    message && typeof message.content === 'string' ? message.content : '';

  return buildNormalizedTranslationResult({
    finishReason:
      choice &&
      typeof choice === 'object' &&
      typeof choice.finish_reason === 'string'
        ? choice.finish_reason
        : null,
    modelName,
    pages: input.pages,
    prompt,
    provider: ProviderType.openai,
    providerRequestId: response.headers.get('x-request-id'),
    rawText: content,
    sourceLanguage: input.sourceLanguage,
    stopReason: null,
    targetLanguage: input.targetLanguage,
    usage: json.usage,
    usageDefaults: {
      latencyMs: response.latencyMs,
      pageCount: input.pages.length,
      requestCount: 1,
    },
  });
}

async function translateWithAnthropic(
  input: TranslationGatewayInput,
  deps: {
    fetchFn?: typeof fetch;
    timeoutMs?: number;
  }
) {
  const apiKey = envServer.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.anthropic,
      'ANTHROPIC_API_KEY is not configured.'
    );
  }

  const prompt = buildTranslationPrompt(input);
  const modelName = envServer.ANTHROPIC_TRANSLATION_MODEL;
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      max_tokens: 4096,
      messages: [
        {
          content: prompt.userPrompt,
          role: 'user',
        },
      ],
      model: modelName,
      system: prompt.systemPrompt,
    }),
    fetchFn: deps.fetchFn,
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    provider: ProviderType.anthropic,
    timeoutMs: deps.timeoutMs ?? envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: 'https://api.anthropic.com/v1/messages',
  });

  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.anthropic,
    response.text,
    'Anthropic returned malformed JSON'
  );
  const contentBlocks = Array.isArray(json.content) ? json.content : [];
  const content = contentBlocks
    .map((block) =>
      block &&
      typeof block === 'object' &&
      block.type === 'text' &&
      typeof block.text === 'string'
        ? block.text
        : ''
    )
    .join('')
    .trim();

  return buildNormalizedTranslationResult({
    finishReason: null,
    modelName,
    pages: input.pages,
    prompt,
    provider: ProviderType.anthropic,
    providerRequestId: typeof json.id === 'string' ? json.id : null,
    rawText: content,
    sourceLanguage: input.sourceLanguage,
    stopReason: typeof json.stop_reason === 'string' ? json.stop_reason : null,
    targetLanguage: input.targetLanguage,
    usage: json.usage,
    usageDefaults: {
      latencyMs: response.latencyMs,
      pageCount: input.pages.length,
      requestCount: 1,
    },
  });
}

function buildNormalizedTranslationResult(input: {
  finishReason: string | null;
  modelName: string;
  pages: TranslationGatewayInput['pages'];
  prompt: ReturnType<typeof buildTranslationPrompt>;
  provider: TranslationProvider;
  providerRequestId: string | null;
  rawText: string;
  sourceLanguage: string;
  stopReason: string | null;
  targetLanguage: string;
  usage: unknown;
  usageDefaults: {
    latencyMs: number;
    pageCount: number;
    requestCount: number;
  };
}) {
  const translations = normalizeTranslationPayload(
    input.provider,
    input.pages,
    input.rawText
  );

  return zNormalizedTranslationBatch.parse({
    pages: translations,
    promptProfile: input.prompt.promptProfile,
    promptVersion: input.prompt.promptVersion,
    provider: input.provider,
    providerModel: input.modelName,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    usage: {
      finishReason: input.finishReason,
      inputTokens: getUsageValue(
        input.usage,
        'promptTokenCount',
        'input_tokens'
      ),
      latencyMs: input.usageDefaults.latencyMs,
      outputTokens: getUsageValue(
        input.usage,
        'candidatesTokenCount',
        'completion_tokens',
        'output_tokens'
      ),
      pageCount: input.usageDefaults.pageCount,
      providerRequestId: input.providerRequestId,
      requestCount: input.usageDefaults.requestCount,
      stopReason: input.stopReason,
    },
  });
}

function normalizeTranslationPayload(
  provider: TranslationProvider,
  pages: TranslationGatewayInput['pages'],
  rawText: string
) {
  const json = (() => {
    try {
      return parseJsonObjectText(
        provider,
        rawText,
        'Provider translation response was not valid JSON'
      );
    } catch (error) {
      if (
        error instanceof ProviderGatewayError &&
        error.code === 'invalid_response'
      ) {
        throw createRetryableInvalidProviderResponseError(
          provider,
          error.message
        );
      }

      throw error;
    }
  })();

  return pages.map((page) => {
    const translationMap = json[page.pageKey];

    if (
      !translationMap ||
      typeof translationMap !== 'object' ||
      Array.isArray(translationMap)
    ) {
      throw createRetryableInvalidProviderResponseError(
        provider,
        `Provider response is missing the page key "${page.pageKey}".`
      );
    }

    const translationRecord = translationMap as Record<string, unknown>;

    return {
      blocks: page.blocks.map((block, index) => {
        const blockKey = buildBlockTranslationKey(index);

        if (!(blockKey in translationRecord)) {
          throw createRetryableInvalidProviderResponseError(
            provider,
            `Provider response is missing "${page.pageKey}" block key "${blockKey}".`
          );
        }

        const translation = translationRecord[blockKey];

        if (translation === undefined || translation === null) {
          throw createRetryableInvalidProviderResponseError(
            provider,
            `Provider response for "${page.pageKey}" block key "${blockKey}" is empty.`
          );
        }

        if (typeof translation === 'string') {
          return {
            index,
            sourceText: block.text,
            translation: translation.trim(),
          };
        }

        if (typeof translation === 'object' && !Array.isArray(translation)) {
          const translationObject = translation as Record<string, unknown>;
          const returnedSourceHash = translationObject.sourceHash;
          const returnedSourceText = translationObject.sourceText;
          const returnedTranslation = translationObject.translation;

          if (
            typeof returnedSourceHash === 'string' &&
            returnedSourceHash !== buildBlockSourceHash(block.text)
          ) {
            throw createRetryableInvalidProviderResponseError(
              provider,
              `Provider response for "${page.pageKey}" block key "${blockKey}" echoed sourceHash for a different OCR block.`
            );
          }

          if (
            typeof returnedSourceText === 'string' &&
            normalizeSourceText(returnedSourceText) !==
              normalizeSourceText(block.text)
          ) {
            throw createRetryableInvalidProviderResponseError(
              provider,
              `Provider response for "${page.pageKey}" block key "${blockKey}" echoed sourceText for a different OCR block.`
            );
          }

          if (
            returnedTranslation === undefined ||
            returnedTranslation === null
          ) {
            throw createRetryableInvalidProviderResponseError(
              provider,
              `Provider response for "${page.pageKey}" block key "${blockKey}" translation is empty.`
            );
          }

          if (typeof returnedTranslation !== 'string') {
            throw createRetryableInvalidProviderResponseError(
              provider,
              `Provider response for "${page.pageKey}" block key "${blockKey}" translation is not a string.`
            );
          }

          return {
            index,
            sourceText: block.text,
            translation: returnedTranslation.trim(),
          };
        }

        if (typeof translation !== 'string') {
          throw createRetryableInvalidProviderResponseError(
            provider,
            `Provider response for "${page.pageKey}" block key "${blockKey}" is not a string or translation object.`
          );
        }
      }),
      pageKey: page.pageKey,
    };
  });
}

function normalizeSourceText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function getUsageValue(usage: unknown, ...keys: string[]) {
  if (!usage || typeof usage !== 'object') {
    return null;
  }

  for (const key of keys) {
    if (key in usage && typeof usage[key as keyof typeof usage] === 'number') {
      return usage[key as keyof typeof usage] as number;
    }
  }

  return null;
}
