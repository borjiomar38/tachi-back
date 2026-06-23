import { headObject, putObject } from '@better-upload/server/helpers';
import sharp from 'sharp';

import { envServer } from '@/env/server';
import { runGeneratedHeroImageAssetReviewAgent } from '@/server/blog/review-agents';
import { BlogGenerationTopic } from '@/server/blog/topics';
import { ProviderType } from '@/server/db/generated/client';
import { createProviderConfigError } from '@/server/provider-gateway/errors';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

export interface GeneratedBlogHeroImage {
  heroImageObjectKey: string;
  heroImageUrl: string;
}

export interface BlogHeroImageAsset extends GeneratedBlogHeroImage {
  slug: string;
}

export async function uploadGeneratedBlogHeroImage(input: {
  image: Buffer;
  metadata?: Record<string, string>;
  slug: string;
}): Promise<GeneratedBlogHeroImage> {
  assertBlogImageGenerationEnabled();
  const publicBaseUrl = resolvePublicAssetBaseUrl();
  const image = await normalizeGeneratedImage(input.image);
  const assetReview = await runGeneratedHeroImageAssetReviewAgent({
    image,
  });

  if (!assetReview.passed) {
    throw createProviderConfigError(
      ProviderType.internal,
      `Codex CLI hero image failed asset review: ${assetReview.notes.join(' ')}`
    );
  }

  const objectKey = buildBlogHeroImageObjectKey(input.slug);

  await putObject(uploadClient, {
    body: bufferToBlob(image, 'image/png'),
    bucket: objectStorageBuckets.legacyPublic,
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: 'image/png',
    key: objectKey,
    metadata: normalizeBlogHeroObjectMetadata(input.metadata),
  });

  return {
    heroImageObjectKey: objectKey,
    heroImageUrl: buildPublicObjectUrl(publicBaseUrl, objectKey),
  };
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

export async function uploadPrebuiltBlogHeroImage(input: {
  force?: boolean;
  image: Buffer;
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

  const image = await normalizeGeneratedImage(input.image);
  const assetReview = await runGeneratedHeroImageAssetReviewAgent({
    image,
  });

  if (!assetReview.passed) {
    throw createProviderConfigError(
      ProviderType.internal,
      `Codex CLI prebuilt image failed hero asset review: ${assetReview.notes.join(' ')}`
    );
  }

  await putObject(uploadClient, {
    body: bufferToBlob(image, 'image/png'),
    bucket: objectStorageBuckets.legacyPublic,
    cacheControl: 'public, max-age=31536000, immutable',
    contentType: 'image/png',
    key: objectKey,
    metadata: normalizeBlogHeroObjectMetadata({
      'blog-image-alt': buildBlogTopicHeroImageAlt(input.topic),
      'blog-image-generated-by': 'codex-cli',
      'blog-search-intent': input.topic.searchIntent,
      'blog-topic': input.topic.manhwaTitle,
      'blog-type': input.topic.manhwaType,
    }),
  });

  return {
    heroImageObjectKey: objectKey,
    heroImageUrl: buildPublicObjectUrl(resolvePublicAssetBaseUrl(), objectKey),
    slug,
  };
}

export function buildBlogTopicHeroImageAlt(topic: BlogGenerationTopic) {
  return `AI-generated ${topic.manhwaTitle} ${topic.manhwaType} translate AI hero image for Nayovi OCR translation.`;
}

export function buildBlogTopicHeroImagePrompt(topic: BlogGenerationTopic) {
  const visualHint = getTopicVisualHint(topic.manhwaTitle);

  return [
    `Original AI-generated dark cinematic ${topic.manhwaType}-style hero illustration for a Nayovi article about ${topic.manhwaTitle}.`,
    visualHint,
    `SEO target: ${topic.manhwaTitle} ${topic.manhwaType} translate AI, OCR manga translation, Nayovi Android reader.`,
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
  const createPipeline = () =>
    sharp(image, {
      failOn: 'none',
    }).rotate();
  const metadata = await createPipeline().metadata();

  if (!metadata.width || !metadata.height) {
    throw createProviderConfigError(
      ProviderType.internal,
      'Codex CLI hero image has unreadable dimensions.'
    );
  }

  if (metadata.width >= 1400 && metadata.width / metadata.height >= 1.4) {
    return await createPipeline().png().toBuffer();
  }

  return await createPipeline()
    .resize({
      fit: 'cover',
      height: 1024,
      position: 'right',
      width: 1536,
    })
    .png()
    .toBuffer();
}

function assertBlogImageGenerationEnabled() {
  if (!envServer.BLOG_IMAGE_GENERATION_ENABLED) {
    throw createProviderConfigError(
      ProviderType.internal,
      'BLOG_IMAGE_GENERATION_ENABLED is false.'
    );
  }
}

export function normalizeBlogHeroObjectMetadata(
  metadata: Record<string, string> | undefined
) {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1_024),
    ])
  );
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
    'Teenage Mercenary':
      'Use urban action manhwa energy: night city streets, school corridor tension, tactical motion, disciplined fighter silhouettes, protective family stakes, and sharp survival-thriller lighting.',
    'The Beginning After the End':
      'Use reincarnation fantasy energy: academy halls, magic circles, dragon-scale textures, royal banners without symbols, and warm-to-dark spell lighting.',
    'Tower of God':
      'Use vertical tower fantasy energy: impossible stairways, floating test arenas, luminous water-like shinsu, layered floors, and vast mysterious scale.',
    'Who Made Me a Princess':
      'Use romance-fantasy palace energy: moonlit ballroom, jeweled tiara shapes without copying designs, ornate curtains, soft dramatic magic, and elegant emotional lighting.',
  };

  return (
    hints[title] ??
    'Use genre-specific manga/manhwa/manhua energy from the topic: urban action, fantasy, romance, martial arts, school, thriller, or adventure setting cues; symbolic props; and reading workflow details tied to the article subject.'
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
