import { putObject } from '@better-upload/server/helpers';
import { z } from 'zod';

import { envServer } from '@/env/server';
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

  if (!publicBaseUrl) {
    throw createProviderConfigError(
      ProviderType.internal,
      'BLOG_IMAGE_PUBLIC_BASE_URL or VITE_S3_BUCKET_PUBLIC_URL is required for blog hero image generation.'
    );
  }

  return await retryProviderCall(
    async () => {
      const image = await requestOpenAIImage({
        fetchFn: input.fetchFn,
        imagePrompt: input.imagePrompt,
      });
      const objectKey = buildBlogHeroImageObjectKey(input.slug);

      await putObject(uploadClient, {
        body: image.body,
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

async function requestOpenAIImage(input: {
  fetchFn?: typeof fetch;
  imagePrompt: string;
}) {
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      model: envServer.BLOG_IMAGE_GENERATION_MODEL,
      n: 1,
      prompt: input.imagePrompt,
      size: '1024x1024',
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
      body: Buffer.from(generatedImage.b64_json, 'base64'),
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
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'image/png',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildBlogHeroImageObjectKey(slug: string) {
  return `blog/heroes/${slug}.png`;
}

function buildPublicObjectUrl(baseUrl: string, objectKey: string) {
  const encodedKey = objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${baseUrl.replace(/\/+$/, '')}/${encodedKey}`;
}

function resolvePublicAssetBaseUrl() {
  return (
    envServer.BLOG_IMAGE_PUBLIC_BASE_URL ?? envServer.VITE_S3_BUCKET_PUBLIC_URL
  );
}
