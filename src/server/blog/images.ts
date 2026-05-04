import { headObject, putObject } from '@better-upload/server/helpers';
import sharp from 'sharp';
import { z } from 'zod';

import { envServer } from '@/env/server';
import { runGeneratedHeroImageAssetReviewAgent } from '@/server/blog/review-agents';
import { BlogGenerationTopic } from '@/server/blog/topics';
import { ProviderType } from '@/server/db/generated/client';
import { createProviderConfigError } from '@/server/provider-gateway/errors';
import {
  fetchTextWithTimeout,
  parseJsonResponse,
  retryProviderCall,
} from '@/server/provider-gateway/utils';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

const zOpenAIImageResponse = z.object({
  data: z
    .array(
      z.object({
        b64_json: z.string().optional(),
        url: z.url().optional(),
      })
    )
    .min(1),
});

export interface GeneratedBlogHeroImage {
  heroImageObjectKey: string;
  heroImageUrl: string;
}

export interface BlogHeroImageAsset extends GeneratedBlogHeroImage {
  slug: string;
}

export async function generateBlogHeroImage(input: {
  fetchFn?: typeof fetch;
  imagePrompt: string;
  slug: string;
}): Promise<GeneratedBlogHeroImage> {
  if (!envServer.BLOG_IMAGE_GENERATION_ENABLED) {
    throw createProviderConfigError(
      ProviderType.internal,
      'BLOG_IMAGE_GENERATION_ENABLED is false.'
    );
  }

  if (!envServer.OPENAI_API_KEY) {
    throw createProviderConfigError(
      ProviderType.openai,
      'OPENAI_API_KEY is required for blog hero image generation.'
    );
  }

  const publicBaseUrl = resolvePublicAssetBaseUrl();

  return await retryProviderCall(
    async () => {
      const image = await requestOpenAIImage({
        fetchFn: input.fetchFn,
        imagePrompt: input.imagePrompt,
      });
      const objectKey = buildBlogHeroImageObjectKey(input.slug);

      await putObject(uploadClient, {
        body: bufferToBlob(image.body, image.contentType),
        bucket: objectStorageBuckets.legacyPublic,
        contentType: image.contentType,
        key: objectKey,
      });

      return {
        heroImageObjectKey: objectKey,
        heroImageUrl: buildPublicObjectUrl(publicBaseUrl, objectKey),
      };
    },
    {
      maxAttempts: envServer.PROVIDER_RETRY_MAX_ATTEMPTS,
    }
  );
}

export async function findPrebuiltBlogHeroImage(input: {
  topic: BlogGenerationTopic;
}): Promise<BlogHeroImageAsset | null> {
  const slug = buildBlogTopicHeroImageSlug(input.topic);
  const objectKey = buildBlogHeroImageObjectKey(slug);

  try {
    await headObject(uploadClient, {
      bucket: objectStorageBuckets.legacyPublic,
      key: objectKey,
    });
  } catch {
    return null;
  }

  return {
    heroImageObjectKey: objectKey,
    heroImageUrl: buildPublicObjectUrl(resolvePublicAssetBaseUrl(), objectKey),
    slug,
  };
}

export async function generatePrebuiltBlogHeroImage(input: {
  fetchFn?: typeof fetch;
  force?: boolean;
  topic: BlogGenerationTopic;
}): Promise<BlogHeroImageAsset> {
  const slug = buildBlogTopicHeroImageSlug(input.topic);
  const objectKey = buildBlogHeroImageObjectKey(slug);

  if (!input.force) {
    const existing = await findPrebuiltBlogHeroImage({
      topic: input.topic,
    });

    if (existing) {
      return existing;
    }
  }

  const image = await requestOpenAIImage({
    fetchFn: input.fetchFn,
    imagePrompt: buildBlogTopicHeroImagePrompt(input.topic),
  });
  const assetReview = await runGeneratedHeroImageAssetReviewAgent({
    image: image.body,
  });

  if (!assetReview.passed) {
    throw createProviderConfigError(
      ProviderType.openai,
      `Generated image failed hero asset review: ${assetReview.notes.join(' ')}`
    );
  }

  await putObject(uploadClient, {
    body: bufferToBlob(image.body, image.contentType),
    bucket: objectStorageBuckets.legacyPublic,
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: image.contentType,
    key: objectKey,
    metadata: {
      'blog-image-alt': buildBlogTopicHeroImageAlt(input.topic),
      'blog-search-intent': input.topic.searchIntent,
      'blog-topic': input.topic.manhwaTitle,
      'blog-type': input.topic.manhwaType,
    },
  });

  return {
    heroImageObjectKey: objectKey,
    heroImageUrl: buildPublicObjectUrl(resolvePublicAssetBaseUrl(), objectKey),
    slug,
  };
}

async function requestOpenAIImage(input: {
  fetchFn?: typeof fetch;
  imagePrompt: string;
}) {
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      model: envServer.BLOG_IMAGE_GENERATION_MODEL,
      n: 1,
      prompt: input.imagePrompt,
      quality: envServer.BLOG_IMAGE_GENERATION_QUALITY,
      size: envServer.BLOG_IMAGE_GENERATION_SIZE,
    }),
    fetchFn: input.fetchFn,
    headers: {
      Authorization: `Bearer ${envServer.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    provider: ProviderType.openai,
    timeoutMs: envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: 'https://api.openai.com/v1/images/generations',
  });
  const parsed = zOpenAIImageResponse.parse(
    parseJsonResponse<Record<string, unknown>>(
      ProviderType.openai,
      response.text,
      'OpenAI returned malformed image JSON'
    )
  );
  const generatedImage = parsed.data[0];

  if (!generatedImage) {
    throw createProviderConfigError(
      ProviderType.openai,
      'OpenAI image generation returned an empty image list.'
    );
  }

  if (generatedImage.b64_json) {
    return {
      body: await normalizeGeneratedImage(
        Buffer.from(generatedImage.b64_json, 'base64')
      ),
      contentType: 'image/png',
    };
  }

  if (generatedImage.url) {
    return await fetchGeneratedImageUrl({
      fetchFn: input.fetchFn,
      url: generatedImage.url,
    });
  }

  throw createProviderConfigError(
    ProviderType.openai,
    'OpenAI image generation did not return an image payload.'
  );
}

async function fetchGeneratedImageUrl(input: {
  fetchFn?: typeof fetch;
  url: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    envServer.PROVIDER_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await (input.fetchFn ?? fetch)(input.url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw createProviderConfigError(
        ProviderType.openai,
        `Failed to download generated image: ${response.status}.`
      );
    }

    return {
      body: await normalizeGeneratedImage(
        Buffer.from(await response.arrayBuffer())
      ),
      contentType: response.headers.get('content-type') ?? 'image/png',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildBlogTopicHeroImageAlt(topic: BlogGenerationTopic) {
  return `AI-generated ${topic.manhwaTitle} ${topic.manhwaType} translate IA hero image for TachiyomiAT OCR translation.`;
}

export function buildBlogTopicHeroImagePrompt(topic: BlogGenerationTopic) {
  const visualHint = getTopicVisualHint(topic.manhwaTitle);

  return [
    `Original AI-generated dark cinematic ${topic.manhwaType}-style hero illustration for a TachiyomiAT article about ${topic.manhwaTitle}.`,
    visualHint,
    `SEO target: ${topic.manhwaTitle} ${topic.manhwaType} translate IA, OCR manga translation, TachiyomiAT Android reader.`,
    `Show the feeling of reading and translating ${topic.manhwaType}: an Android manga reader, OCR scan lines over speech bubbles, clean translated captions, glowing page panels, and a premium app-download mood.`,
    'Make it highly relevant to the title genre and setting without copying copyrighted characters, logos, symbols, panel art, costumes, or readable text.',
    'No official artwork, no known character likenesses, no watermarks, no fake UI text, no readable typography.',
    'Composition: 16:9 blog hero crop, strong focal area on the right, dark readable space on the left for article headline overlay, vivid but not cluttered, sharp details, energetic, polished commercial key art.',
  ].join(' ');
}

export function buildBlogTopicHeroImageSlug(topic: BlogGenerationTopic) {
  return `topic-${slugify(`${topic.manhwaType}-${topic.manhwaTitle}`)}`;
}

export function buildBlogHeroImageRouteUrl(slug: string) {
  return `/api/blog/heroes/${encodeURIComponent(slug)}`;
}

export function buildBlogHeroImageObjectKey(slug: string) {
  return `blog/heroes/${slug}.png`;
}

function buildPublicObjectUrl(baseUrl: string | undefined, objectKey: string) {
  const slug = objectKey
    .split('/')
    .at(-1)
    ?.replace(/\.png$/i, '');

  if (!slug) {
    throw createProviderConfigError(
      ProviderType.internal,
      'Unable to build blog hero image URL.'
    );
  }

  const path = `/api/blog/heroes/${encodeURIComponent(slug)}`;

  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}${path}` : path;
}

function resolvePublicAssetBaseUrl() {
  return envServer.BLOG_IMAGE_PUBLIC_BASE_URL;
}

async function normalizeGeneratedImage(image: Buffer) {
  const metadata = await sharp(image).metadata();

  if (!metadata.width || !metadata.height) {
    return image;
  }

  if (metadata.width >= 1400 && metadata.width / metadata.height >= 1.4) {
    return image;
  }

  return await sharp(image)
    .resize({
      fit: 'cover',
      height: 1024,
      position: 'right',
      width: 1536,
    })
    .png()
    .toBuffer();
}

function getTopicVisualHint(title: string) {
  const hints: Record<string, string> = {
    'Battle Through the Heavens':
      'Use cultivation-fantasy energy: mountain sect silhouettes, flame-like aura, ancient scrolls, floating realm diagrams, and dramatic martial technique motion.',
    'Jujutsu Kaisen':
      'Use modern occult action energy: urban night alleys, supernatural ink shadows, talisman-like abstract shapes, fast combat motion, and intense cursed-energy atmosphere.',
    'Omniscient Reader':
      'Use apocalyptic novel-reader energy: subway platform lighting, floating scenario windows without text, fractured city skyline, constellations, and layered narration panels.',
    'One Piece':
      'Use ocean-adventure manga energy: stormy sea, treasure-map shapes, ship silhouettes, dramatic clouds, rope and compass details, and bright adventurous motion.',
    'Return of the Mount Hua Sect':
      'Use murim martial-arts energy: plum blossom petals, mountain temple rooftops, sword trails, ink-wash cliffs, and disciplined sect atmosphere.',
    'Second Life Ranker':
      'Use dungeon-ranker energy: tower floors, dark gates, glowing inventory shards, masked silhouettes without recognizable costumes, and sharp progression-game lighting.',
    'Solo Leveling':
      'Use dungeon-action energy: shadow gates, blue-black portals, monster-scale silhouettes, rank interface shapes without text, and fast vertical-chapter momentum.',
    'The Beginning After the End':
      'Use reincarnation fantasy energy: academy halls, magic circles, dragon-scale textures, royal banners without symbols, and warm-to-dark spell lighting.',
    'Tower of God':
      'Use vertical tower fantasy energy: impossible stairways, floating test arenas, luminous water-like shinsu, layered floors, and vast mysterious scale.',
    'Who Made Me a Princess':
      'Use romance-fantasy palace energy: moonlit ballroom, jeweled tiara shapes without copying designs, ornate curtains, soft dramatic magic, and elegant emotional lighting.',
  };

  return (
    hints[title] ??
    'Use genre-specific manga/manhwa/manhua energy from the topic: setting cues, action mood, symbolic props, and reading workflow details tied to the article subject.'
  );
}

function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'blog-topic';
}

function bufferToBlob(buffer: Buffer, contentType: string) {
  return new Blob([new Uint8Array(buffer)], {
    type: contentType,
  });
}
