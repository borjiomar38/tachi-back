import { getObject, putObject } from '@better-upload/server/helpers';

import {
  type TranslationJobResultManifest,
  zTranslationJobResultManifest,
} from '@/server/jobs/schema';
import {
  objectStorageBuckets,
  shouldUseInlineObjectStorage,
  uploadClient,
} from '@/server/s3';

const INLINE_STORAGE_BUCKET = '__inline__';
const INLINE_STORAGE_PREFIX = 'inline:';

export function buildJobUploadObjectKey(input: {
  fileName: string;
  jobId: string;
  pageNumber: number;
}) {
  return `jobs/${input.jobId}/uploads/${String(input.pageNumber).padStart(4, '0')}-${sanitizeFileName(input.fileName)}`;
}

export function buildJobResultObjectKey(jobId: string) {
  return `jobs/${jobId}/results/translation-manifest.json`;
}

export async function putTranslationJobPageUpload(input: {
  body: Uint8Array;
  contentType: string;
  fileName: string;
  jobId: string;
  pageNumber: number;
}) {
  const objectKey = buildJobUploadObjectKey(input);

  if (shouldUseInlineObjectStorage) {
    return {
      bucketName: INLINE_STORAGE_BUCKET,
      objectKey: buildInlineObjectKey({
        body: input.body,
        contentType: input.contentType,
      }),
    };
  }

  await putObject(uploadClient, {
    body: Buffer.from(input.body),
    bucket: objectStorageBuckets.uploads,
    contentType: input.contentType,
    key: objectKey,
  });

  return {
    bucketName: objectStorageBuckets.uploads,
    objectKey,
  };
}

export async function getTranslationJobPageUpload(input: {
  bucketName: string;
  objectKey: string;
}) {
  if (input.bucketName === INLINE_STORAGE_BUCKET) {
    const inline = parseInlineObjectKey(input.objectKey);

    return {
      blob: new Blob([inline.body], {
        type: inline.contentType,
      }),
    };
  }

  return await getObject(uploadClient, {
    bucket: input.bucketName,
    key: input.objectKey,
  });
}

export async function putTranslationJobResultManifest(
  manifest: TranslationJobResultManifest
) {
  const objectKey = buildJobResultObjectKey(manifest.jobId);

  if (shouldUseInlineObjectStorage) {
    return {
      bucketName: INLINE_STORAGE_BUCKET,
      objectKey: buildInlineObjectKey({
        body: Buffer.from(JSON.stringify(manifest)),
        contentType: 'application/json',
      }),
    };
  }

  await putObject(uploadClient, {
    body: JSON.stringify(manifest),
    bucket: objectStorageBuckets.results,
    contentType: 'application/json',
    key: objectKey,
  });

  return {
    bucketName: objectStorageBuckets.results,
    objectKey,
  };
}

export async function getTranslationJobResultManifest(input: {
  bucketName: string;
  objectKey: string;
}) {
  if (input.bucketName === INLINE_STORAGE_BUCKET) {
    const inline = parseInlineObjectKey(input.objectKey);

    return parseStoredTranslationJobResultManifest(
      JSON.parse(Buffer.from(inline.body).toString('utf8')) as unknown
    );
  }

  const object = await getObject(uploadClient, {
    bucket: input.bucketName,
    key: input.objectKey,
  });

  return parseStoredTranslationJobResultManifest(
    JSON.parse(await object.blob.text()) as unknown
  );
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .trim()
    .replaceAll('\\', '-')
    .replaceAll('/', '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '');

  return normalized.length > 0 ? normalized : 'page';
}

function buildInlineObjectKey(input: {
  body: Uint8Array;
  contentType: string;
}) {
  const payload = Buffer.from(
    JSON.stringify({
      bodyBase64: Buffer.from(input.body).toString('base64'),
      contentType: input.contentType,
    })
  ).toString('base64url');

  return `${INLINE_STORAGE_PREFIX}${payload}`;
}

function parseInlineObjectKey(objectKey: string) {
  if (!objectKey.startsWith(INLINE_STORAGE_PREFIX)) {
    throw new Error('Invalid inline storage object key.');
  }

  const encodedPayload = objectKey.slice(INLINE_STORAGE_PREFIX.length);
  const payload = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8')
  ) as {
    bodyBase64?: unknown;
    contentType?: unknown;
  };

  if (
    typeof payload.bodyBase64 !== 'string' ||
    typeof payload.contentType !== 'string'
  ) {
    throw new Error('Invalid inline storage payload.');
  }

  return {
    body: Buffer.from(payload.bodyBase64, 'base64'),
    contentType: payload.contentType,
  };
}

function parseStoredTranslationJobResultManifest(rawManifest: unknown) {
  const record =
    rawManifest &&
    typeof rawManifest === 'object' &&
    !Array.isArray(rawManifest)
      ? (rawManifest as Record<string, unknown>)
      : null;

  return zTranslationJobResultManifest.parse({
    ...record,
    completedAt:
      typeof record?.completedAt === 'string'
        ? new Date(record.completedAt)
        : record?.completedAt,
  });
}
