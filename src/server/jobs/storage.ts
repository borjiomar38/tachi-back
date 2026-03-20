import { getObject, putObject } from '@better-upload/server/helpers';

import type { TranslationJobResultManifest } from '@/server/jobs/schema';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

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
  return await getObject(uploadClient, {
    bucket: input.bucketName,
    key: input.objectKey,
  });
}

export async function putTranslationJobResultManifest(
  manifest: TranslationJobResultManifest
) {
  const objectKey = buildJobResultObjectKey(manifest.jobId);

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
  const object = await getObject(uploadClient, {
    bucket: input.bucketName,
    key: input.objectKey,
  });

  return JSON.parse(await object.blob.text()) as unknown;
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .replaceAll('\\', '-')
    .replaceAll('/', '-')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^A-Za-z0-9._-]/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^\.+/, '')
    .trim();

  return normalized.length > 0 ? normalized : 'page';
}
