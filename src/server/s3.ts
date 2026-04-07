import { custom } from '@better-upload/server/clients';

import { envServer } from '@/env/server';

const isProductionRuntime = import.meta.env.PROD;

export const uploadClient = custom({
  host: envServer.S3_HOST,
  accessKeyId: envServer.S3_ACCESS_KEY_ID,
  secretAccessKey: envServer.S3_SECRET_ACCESS_KEY,
  region: envServer.S3_REGION,
  forcePathStyle: envServer.S3_FORCE_PATH_STYLE,
  secure: envServer.S3_SECURE,
});

export const objectStorageBuckets = {
  legacyPublic: envServer.S3_BUCKET_NAME,
  uploads: envServer.S3_UPLOADS_BUCKET_NAME,
  results: envServer.S3_RESULTS_BUCKET_NAME,
  logs: envServer.S3_LOGS_BUCKET_NAME,
} as const;

export const shouldUseInlineObjectStorage =
  isProductionRuntime && isLoopbackObjectStorageHost(envServer.S3_HOST);

function isLoopbackObjectStorageHost(host: string) {
  const normalizedHost = host.split(':', 1)[0]?.trim().toLowerCase() ?? '';

  return (
    normalizedHost === 'localhost' ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '0.0.0.0'
  );
}
