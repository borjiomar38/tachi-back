import { z } from 'zod';

import { envServer } from '@/env/server';
import { zBlogArticleBody } from '@/features/blog/schema';
import { BlogGenerationTopic } from '@/server/blog/topics';
import { ProviderType } from '@/server/db/generated/client';
import { createProviderConfigError } from '@/server/provider-gateway/errors';
import {
  fetchTextWithTimeout,
  parseJsonObjectText,
  parseJsonResponse,
  retryProviderCall,
} from '@/server/provider-gateway/utils';

const BLOG_PROMPT_VERSION = '2026-05-01.manhwa-seo.v1';

const zGeneratedBlogArticle = z.object({
  body: zBlogArticleBody,
  excerpt: z.string().min(80).max(260),
  imageAlt: z.string().min(24).max(180),
  imagePrompt: z.string().min(120).max(1_200),
  keywords: z.array(z.string().min(3).max(48)).min(6).max(12),
  metaDescription: z.string().min(120).max(165),
  slugBase: z.string().min(8).max(86),
  title: z.string().min(18).max(86),
});

type BlogGenerationProvider = 'anthropic' | 'gemini' | 'openai';

export interface GeneratedBlogArticleDraft {
  body: z.infer<typeof zBlogArticleBody>;
  excerpt: string;
  generationModel: string;
  generationPromptVersion: string;
  generationProvider: ProviderType;
  imageAlt: string;
  imagePrompt: string;
  keywords: string[];
  metaDescription: string;
  slugBase: string;
  title: string;
}

export async function generateBlogArticleDraft(input: {
  date: string;
  fetchFn?: typeof fetch;
  topic: BlogGenerationTopic;
}): Promise<GeneratedBlogArticleDraft> {
  if (!envServer.BLOG_GENERATION_ENABLED) {
    throw createProviderConfigError(
      ProviderType.internal,
      'BLOG_GENERATION_ENABLED is false.'
    );
  }

  const provider = resolveBlogGenerationProvider();
  const prompt = buildArticlePrompt(input);

  return await retryProviderCall(
    async () => {
      const generated = await generateJsonWithProvider({
        fetchFn: input.fetchFn,
        prompt,
        provider,
      });
      const parsed = zGeneratedBlogArticle.parse(generated.json);

      return {
        ...parsed,
        generationModel: generated.modelName,
        generationPromptVersion: BLOG_PROMPT_VERSION,
        generationProvider: mapGenerationProvider(provider),
      };
    },
    {
      maxAttempts: envServer.PROVIDER_RETRY_MAX_ATTEMPTS,
    }
  );
}

function resolveBlogGenerationProvider(): BlogGenerationProvider {
  const preferred =
    envServer.BLOG_GENERATION_PROVIDER ??
    envServer.TRANSLATION_PROVIDER_PRIMARY;
  const candidates: BlogGenerationProvider[] = [
    preferred,
    'gemini',
    'openai',
    'anthropic',
  ];

  const provider = candidates.find((candidate) => {
    const hasKeyByProvider: Record<BlogGenerationProvider, boolean> = {
      anthropic: Boolean(envServer.ANTHROPIC_API_KEY),
      gemini: Boolean(envServer.GEMINI_API_KEY),
      openai: Boolean(envServer.OPENAI_API_KEY),
    };

    return hasKeyByProvider[candidate];
  });

  if (!provider) {
    throw createProviderConfigError(
      ProviderType.internal,
      'No blog generation provider API key is configured.'
    );
  }

  return provider;
}

function buildArticlePrompt(input: {
  date: string;
  topic: BlogGenerationTopic;
}) {
  return [
    `Prompt version: ${BLOG_PROMPT_VERSION}`,
    `Publication date: ${input.date}`,
    `Topic title: ${input.topic.manhwaTitle}`,
    `Type: ${input.topic.manhwaType}`,
    `Search intent: ${input.topic.searchIntent}`,
    `Editorial angle: ${input.topic.angle}`,
    '',
    'Create one original SEO article for TachiyomiAT.',
    'Return only a JSON object matching this TypeScript shape:',
    '{ title, slugBase, excerpt, metaDescription, keywords, imagePrompt, imageAlt, body: { introduction, sections, readingProfile, downloadCallout, faqs, disclaimer } }',
    '',
    'Rules:',
    '- Target searches around manhwa, manhua, manga reader, translation app, TachiyomiAT, and Tachiyomi download intent.',
    '- Mention TachiyomiAT naturally and include the idea that the download link is always available through the article CTA.',
    '- Do not claim TachiyomiAT hosts chapters, bypasses paywalls, or provides pirated content.',
    '- Keep the article useful for readers who already know the title but need a cleaner reading and translation workflow.',
    '- Do not include external chapter links, scanlation links, or download links other than TachiyomiAT.',
    '- The imagePrompt must describe an original dark cinematic manhwa-style illustration inspired by the login page mood, with no copyrighted characters, logos, or readable text.',
    '- Use 3 to 5 sections, 3 to 5 FAQs, and concise speech-bubble-aware translation advice.',
    '- The downloadCallout buttonLabel must be "Download TachiyomiAT".',
    '- The disclaimer must say the site does not host manga/manhwa/manhua chapters and users should respect official releases and rights holders.',
  ].join('\n');
}

async function generateJsonWithProvider(input: {
  fetchFn?: typeof fetch;
  prompt: string;
  provider: BlogGenerationProvider;
}) {
  const modelName = resolveModelName(input.provider);
  const resultByProvider: Record<
    BlogGenerationProvider,
    () => Promise<Record<string, unknown>>
  > = {
    anthropic: () =>
      generateJsonWithAnthropic(input.prompt, modelName, input.fetchFn),
    gemini: () =>
      generateJsonWithGemini(input.prompt, modelName, input.fetchFn),
    openai: () =>
      generateJsonWithOpenAI(input.prompt, modelName, input.fetchFn),
  };

  return {
    json: await resultByProvider[input.provider](),
    modelName,
  };
}

async function generateJsonWithGemini(
  prompt: string,
  modelName: string,
  fetchFn?: typeof fetch
) {
  const apiKey = envServer.GEMINI_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.gemini,
      'GEMINI_API_KEY is not configured.'
    );
  }

  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
          role: 'user',
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are a precise editorial JSON API for ethical manhwa SEO content. Return only valid JSON.',
          },
        ],
      },
    }),
    fetchFn,
    headers: {
      'Content-Type': 'application/json',
    },
    provider: ProviderType.gemini,
    timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
  });
  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.gemini,
    response.text,
    'Gemini returned malformed JSON'
  );
  const text = extractGeminiText(json);

  return parseJsonObjectText(
    ProviderType.gemini,
    text,
    'Gemini returned invalid blog article JSON'
  );
}

async function generateJsonWithOpenAI(
  prompt: string,
  modelName: string,
  fetchFn?: typeof fetch
) {
  const apiKey = envServer.OPENAI_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.openai,
      'OPENAI_API_KEY is not configured.'
    );
  }

  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      max_completion_tokens: 4096,
      messages: [
        {
          content:
            'You are a precise editorial JSON API for ethical manhwa SEO content. Return only valid JSON.',
          role: 'system',
        },
        {
          content: prompt,
          role: 'user',
        },
      ],
      model: modelName,
      response_format: {
        type: 'json_object',
      },
    }),
    fetchFn,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    provider: ProviderType.openai,
    timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: 'https://api.openai.com/v1/chat/completions',
  });
  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.openai,
    response.text,
    'OpenAI returned malformed JSON'
  );
  const text = extractOpenAIText(json);

  return parseJsonObjectText(
    ProviderType.openai,
    text,
    'OpenAI returned invalid blog article JSON'
  );
}

async function generateJsonWithAnthropic(
  prompt: string,
  modelName: string,
  fetchFn?: typeof fetch
) {
  const apiKey = envServer.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.anthropic,
      'ANTHROPIC_API_KEY is not configured.'
    );
  }

  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      max_tokens: 4096,
      messages: [
        {
          content: prompt,
          role: 'user',
        },
      ],
      model: modelName,
      system:
        'You are a precise editorial JSON API for ethical manhwa SEO content. Return only valid JSON.',
    }),
    fetchFn,
    headers: {
      'Anthropic-Version': '2023-06-01',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    provider: ProviderType.anthropic,
    timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: 'https://api.anthropic.com/v1/messages',
  });
  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.anthropic,
    response.text,
    'Anthropic returned malformed JSON'
  );
  const text = extractAnthropicText(json);

  return parseJsonObjectText(
    ProviderType.anthropic,
    text,
    'Anthropic returned invalid blog article JSON'
  );
}

function extractGeminiText(json: Record<string, unknown>) {
  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const candidate = candidates[0];
  const content =
    candidate && typeof candidate === 'object' && 'content' in candidate
      ? candidate.content
      : null;
  const parts =
    content && typeof content === 'object' && 'parts' in content
      ? content.parts
      : null;

  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) =>
      part && typeof part === 'object' && 'text' in part
        ? String(part.text ?? '')
        : ''
    )
    .join('\n');
}

function extractOpenAIText(json: Record<string, unknown>) {
  const choices = Array.isArray(json.choices) ? json.choices : [];
  const choice = choices[0];
  const message =
    choice && typeof choice === 'object' && 'message' in choice
      ? choice.message
      : null;

  return message && typeof message === 'object' && 'content' in message
    ? String(message.content ?? '')
    : '';
}

function extractAnthropicText(json: Record<string, unknown>) {
  const contentBlocks = Array.isArray(json.content) ? json.content : [];

  return contentBlocks
    .map((block) =>
      block &&
      typeof block === 'object' &&
      'type' in block &&
      block.type === 'text' &&
      'text' in block
        ? String(block.text ?? '')
        : ''
    )
    .join('\n');
}

function resolveModelName(provider: BlogGenerationProvider) {
  if (envServer.BLOG_GENERATION_MODEL) {
    return envServer.BLOG_GENERATION_MODEL;
  }

  const modelByProvider: Record<BlogGenerationProvider, string> = {
    anthropic: envServer.ANTHROPIC_TRANSLATION_MODEL,
    gemini: envServer.GEMINI_TRANSLATION_MODEL,
    openai: envServer.OPENAI_TRANSLATION_MODEL,
  };

  return modelByProvider[provider];
}

function mapGenerationProvider(provider: BlogGenerationProvider) {
  const providerTypeByProvider: Record<BlogGenerationProvider, ProviderType> = {
    anthropic: ProviderType.anthropic,
    gemini: ProviderType.gemini,
    openai: ProviderType.openai,
  };

  return providerTypeByProvider[provider];
}
