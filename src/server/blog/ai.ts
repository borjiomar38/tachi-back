import { z } from 'zod';

import { envServer } from '@/env/server';
import { zBlogArticleBody } from '@/features/blog/schema';
import {
  buildBlogSeoKeywords,
  buildRequiredBlogSeoKeyword,
  highIntentBlogSeoKeywords,
} from '@/features/blog/seo';
import { BlogGenerationTopic } from '@/server/blog/topics';
import { ProviderType } from '@/server/db/generated/client';
import { createProviderConfigError } from '@/server/provider-gateway/errors';
import {
  fetchTextWithTimeout,
  parseJsonObjectText,
  parseJsonResponse,
  retryProviderCall,
} from '@/server/provider-gateway/utils';

const BLOG_PROMPT_VERSION = '2026-05-04.translate-ia-seo.v3';

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
      const parsed = zGeneratedBlogArticle.parse(
        normalizeGeneratedBlogArticle(generated.json, input.topic)
      );

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
  const requiredKeyword = buildRequiredBlogSeoKeyword(input.topic.manhwaType);
  const supportingKeywords = highIntentBlogSeoKeywords.filter(
    (keyword) => keyword !== requiredKeyword
  );

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
    '- Target searches around manga translate ia, manhwa translate ia, manhua translate ia, AI translation, OCR translation, translation app, TachiyomiAT, and Tachiyomi download intent.',
    `- The primary SEO phrase for this article is "${requiredKeyword}" because the type is ${input.topic.manhwaType}. Include that exact phrase in the title or meta description if it reads naturally, always include it in keywords, and use it at least once in the body copy.`,
    `- Support the broader keyword cluster without stuffing: ${supportingKeywords.join(', ')}.`,
    '- Prefer useful setup, reading workflow, OCR, AI translation, Android APK, and legal-use wording over keyword stuffing.',
    '- Mention TachiyomiAT naturally and make the reader excited to download the Android app through the article CTA.',
    '- Do not claim TachiyomiAT hosts chapters, bypasses paywalls, or provides pirated content.',
    '- Keep the article useful for readers who already know the title but need a cleaner reading and translation workflow.',
    '- Do not include external chapter links, scanlation links, or download links other than TachiyomiAT.',
    '- The imagePrompt must describe an original fun, exciting, dark cinematic manga/manhwa/manhua-style hero illustration that makes the reader want to open the article and download TachiyomiAT, inspired by the login page mood, with no copyrighted characters, logos, or readable text.',
    '- Use 3 to 5 sections, 3 to 5 FAQs, and concise speech-bubble-aware translation advice.',
    '- The downloadCallout buttonLabel must be "Download TachiyomiAT".',
    '- The disclaimer must say the site does not host manga/manhwa/manhua chapters and users should respect official releases and rights holders.',
  ].join('\n');
}

function normalizeGeneratedBlogArticle(
  rawArticle: Record<string, unknown>,
  topic: BlogGenerationTopic
) {
  const body = readRecord(rawArticle.body);
  const sections = readArray(body.sections).map((section, index) =>
    normalizeSection(section, topic, index)
  );
  const faqs = readArray(body.faqs)
    .map(normalizeFaq)
    .filter((faq): faq is NonNullable<ReturnType<typeof normalizeFaq>> =>
      Boolean(faq)
    );

  return {
    body: {
      disclaimer: normalizeLongText(
        readString(body.disclaimer) ??
          'TachiyomiAT does not host manga, manhwa, or manhua chapters. Use the workflow only with content you own, public-domain material, official samples, or content you have permission to process, and respect official releases and rights holders.',
        40,
        520
      ),
      downloadCallout: normalizeDownloadCallout(body.downloadCallout, topic),
      faqs: fillFaqs(faqs, topic),
      introduction: normalizeLongText(
        readString(body.introduction, body.intro, rawArticle.introduction) ??
          `${topic.manhwaTitle} readers often search for cleaner ${topic.manhwaType} translation workflows when busy panels, speech bubbles, and recurring terms make a chapter harder to follow. TachiyomiAT keeps that workflow focused on hosted OCR, translation support, and the official Android download path.`,
        120,
        1_200
      ),
      readingProfile: normalizeReadingProfile(body.readingProfile, topic),
      sections: fillSections(sections, topic),
    },
    excerpt: normalizeLongText(
      readString(
        rawArticle.excerpt,
        rawArticle.summary,
        rawArticle.description
      ) ??
        `A practical TachiyomiAT guide for ${topic.manhwaTitle} readers searching for ${topic.searchIntent}, hosted OCR, translation support, and a consistent Android APK download path.`,
      80,
      260
    ),
    imageAlt: normalizeLongText(
      readString(rawArticle.imageAlt, rawArticle.image_alt) ??
        `Dark cinematic ${topic.manhwaType} translation workflow scene for ${topic.manhwaTitle} readers.`,
      24,
      180
    ),
    imagePrompt: normalizeImagePrompt(
      readString(rawArticle.imagePrompt, rawArticle.image_prompt),
      topic
    ),
    keywords: normalizeKeywords(rawArticle.keywords, topic),
    metaDescription: normalizeLongText(
      readString(rawArticle.metaDescription, rawArticle.meta_description) ??
        `Read a TachiyomiAT guide for ${topic.manhwaTitle}, ${topic.manhwaType} translation, hosted OCR, and the official Android APK download path.`,
      120,
      165
    ),
    slugBase: normalizeSlugBase(
      readString(rawArticle.slugBase, rawArticle.slug_base, rawArticle.slug) ??
        `${topic.manhwaTitle} TachiyomiAT translation guide`
    ),
    title: normalizeTitle(
      readString(rawArticle.title, rawArticle.headline),
      topic
    ),
  };
}

function normalizeTitle(
  rawTitle: string | undefined,
  topic: BlogGenerationTopic
) {
  const fallback = `${topic.manhwaTitle} ${topic.manhwaType} Translation Guide for TachiyomiAT`;
  const normalized = rawTitle?.trim().replace(/\s+/g, ' ');

  if (!normalized || normalized.length > 86) {
    return fallback;
  }

  return normalizeLongText(normalized, 18, 86);
}

function normalizeImagePrompt(
  rawPrompt: string | undefined,
  topic: BlogGenerationTopic
) {
  const requiredPrompt =
    `Original fun and exciting dark cinematic ${topic.manhwaType}-style hero illustration for ` +
    `${topic.manhwaTitle} readers, energetic app-download mood, Android reader and AI translation workflow, no copyrighted characters, no logos, no readable text.`;
  const prompt =
    rawPrompt ??
    'Premium Android reader interface, hosted OCR panels, translation workflow, dramatic motion, bright discovery moment, midnight lighting, clean composition, atmospheric but inspectable.';

  return normalizeLongText(`${requiredPrompt} ${prompt}`, 120, 1_200);
}

function normalizeSection(
  rawSection: unknown,
  topic: BlogGenerationTopic,
  index: number
) {
  const section = readRecord(rawSection);
  const heading =
    readString(
      section.heading,
      section.title,
      section.name,
      section.subtitle
    ) ?? defaultSectionHeading(topic, index);
  const body =
    readString(
      section.body,
      section.content,
      section.text,
      section.description,
      section.summary
    ) ??
    `${topic.manhwaTitle} works best in a translation workflow that keeps OCR order, recurring names, and speech-bubble length consistent. TachiyomiAT keeps the reader focused on the official app download and hosted translation support instead of scattered setup steps.`;

  return {
    body: normalizeLongText(body, 80, 1_200),
    heading: normalizeLongText(heading, 8, 96),
    takeaways: normalizeTakeaways(section.takeaways, section.keyTakeaways, [
      `${topic.manhwaType} panels need clean OCR ordering.`,
      'Recurring names and terms should stay consistent.',
      'Use the official TachiyomiAT download path.',
    ]),
  };
}

function normalizeFaq(rawFaq: unknown) {
  const faq = readRecord(rawFaq);
  const question = readString(faq.question, faq.q, faq.title);
  const answer = readString(faq.answer, faq.a, faq.body, faq.content);

  if (!question || !answer) {
    return null;
  }

  return {
    answer: normalizeLongText(answer, 40, 520),
    question: normalizeLongText(question, 12, 140),
  };
}

function normalizeDownloadCallout(
  rawCallout: unknown,
  topic: BlogGenerationTopic
) {
  const callout = readRecord(rawCallout);

  return {
    body: normalizeLongText(
      readString(callout.body, callout.description, callout.text) ??
        `Use the official TachiyomiAT Android download link for a consistent ${topic.manhwaType} OCR and translation workflow. Avoid random APK mirrors and keep setup guidance in one trusted path.`,
      40,
      420
    ),
    buttonLabel: 'Download TachiyomiAT',
    title: normalizeLongText(
      readString(callout.title, callout.heading) ??
        'Download TachiyomiAT for Android',
      8,
      96
    ),
  };
}

function normalizeReadingProfile(
  rawProfile: unknown,
  topic: BlogGenerationTopic
) {
  const profile = readRecord(rawProfile);
  const profileText = readString(rawProfile);

  return {
    bestFor: normalizeLongText(
      readString(profile.bestFor, profile.best_for) ??
        profileText ??
        `${topic.manhwaTitle} readers who already have legal access to pages and want a cleaner hosted translation workflow.`,
      20,
      260
    ),
    pacing: normalizeLongText(
      readString(profile.pacing) ??
        'Best for vertical chapters with quick dialogue, action beats, and recurring terms that need stable wording.',
      20,
      180
    ),
    tone: normalizeLongText(
      readString(profile.tone) ??
        'Dark, cinematic, practical, and reader-focused rather than noisy or promotional.',
      20,
      180
    ),
  };
}

function fillSections(
  sections: ReturnType<typeof normalizeSection>[],
  topic: BlogGenerationTopic
) {
  const filled = sections.slice(0, 6);

  while (filled.length < 3) {
    filled.push(normalizeSection(null, topic, filled.length));
  }

  return filled;
}

function fillFaqs(
  faqs: NonNullable<ReturnType<typeof normalizeFaq>>[],
  topic: BlogGenerationTopic
) {
  const filled = faqs.slice(0, 5);
  const defaults = [
    {
      answer: `No. TachiyomiAT focuses on hosted OCR, translation support, app setup, and Android download guidance. It does not publish or distribute ${topic.manhwaType} chapters.`,
      question: `Does TachiyomiAT host ${topic.manhwaType} chapters?`,
    },
    {
      answer: `Readers use it when a ${topic.manhwaType} page needs cleaner text detection, recurring term consistency, and a workflow that stays separate from unauthorized chapter hosting.`,
      question: `Why use TachiyomiAT for ${topic.manhwaType} translation?`,
    },
    {
      answer:
        'Use the official TachiyomiAT download CTA in the article or the download page. That path keeps readers away from random APK mirrors.',
      question: 'Where is the TachiyomiAT download link?',
    },
  ];

  while (filled.length < 3) {
    const fallback = defaults[filled.length] ?? defaults[0]!;
    filled.push(fallback);
  }

  return filled;
}

function normalizeKeywords(rawKeywords: unknown, topic: BlogGenerationTopic) {
  const keywords = readArray(rawKeywords)
    .map((keyword) => readString(keyword))
    .filter((keyword): keyword is string => Boolean(keyword))
    .map((keyword) => normalizeLongText(keyword, 3, 48));
  const defaults = [
    'tachiyomiat',
    'tachiyomi download',
    buildRequiredBlogSeoKeyword(topic.manhwaType),
    `${topic.manhwaType} translation`,
    `${topic.manhwaTitle} reader`,
    'manga OCR',
    'android APK',
  ];

  for (const keyword of defaults) {
    if (keywords.length >= 12) {
      break;
    }

    if (!keywords.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return buildBlogSeoKeywords(keywords, {
    limit: 12,
    type: topic.manhwaType,
  });
}

function normalizeTakeaways(...sources: unknown[]) {
  const fallback = sources.pop();
  const values = sources
    .flatMap((source) => readArray(source))
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));
  const fallbackValues = Array.isArray(fallback)
    ? fallback.filter((item): item is string => typeof item === 'string')
    : [];
  const takeaways = [...values, ...fallbackValues]
    .map((item) => normalizeLongText(item, 8, 160))
    .slice(0, 4);

  return takeaways.length >= 2 ? takeaways : fallbackValues.slice(0, 3);
}

function normalizeSlugBase(value: string) {
  return normalizeLongText(value, 8, 86)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLongText(
  value: string,
  minLength: number,
  maxLength: number
) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const clipped =
    normalized.length > maxLength
      ? clipAtWord(normalized, maxLength)
      : normalized;

  if (clipped.length >= minLength) {
    return clipped;
  }

  return `${clipped} ${'TachiyomiAT keeps the workflow consistent for readers.'.repeat(
    4
  )}`
    .trim()
    .slice(0, maxLength);
}

function clipAtWord(value: string, maxLength: number) {
  const clipped = value.slice(0, maxLength).trim();
  const lastSpace = clipped.lastIndexOf(' ');

  return (lastSpace > 24 ? clipped.slice(0, lastSpace) : clipped).replace(
    /[.,;:!?-]+$/,
    ''
  );
}

function defaultSectionHeading(topic: BlogGenerationTopic, index: number) {
  const headings = [
    `Why ${topic.manhwaTitle} needs a stable workflow`,
    'Keep OCR and terminology consistent',
    'Use the official TachiyomiAT download path',
  ];

  return headings[index] ?? `TachiyomiAT ${topic.manhwaType} workflow`;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (Array.isArray(value)) {
      const text = value
        .map((item) => readString(item))
        .filter(Boolean)
        .join(' ');

      if (text.trim()) {
        return text;
      }
    }
  }

  return undefined;
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
