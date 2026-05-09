import { getObject, putObject } from '@better-upload/server/helpers';
import { z } from 'zod';

import { envServer } from '@/env/server';
import { objectStorageBuckets, uploadClient } from '@/server/s3';

const APP_UPDATE_POLICY_OBJECT_KEY = 'android/latest/app-update-policy.json';

export const zMobileAppUpdatePolicy = z.object({
  channel: z.string().trim().min(1).default('standard-release'),
  checkedAt: z.string().trim().min(1),
  currentVersionCode: z.coerce.number().int().min(0).default(0),
  currentVersionName: z.string().trim().min(1).optional(),
  forceUpdate: z.boolean().default(false),
  latestVersionCode: z.coerce.number().int().min(0).default(0),
  latestVersionName: z.string().trim().min(1).nullable().default(null),
  message: z.string().trim().min(1),
  minimumSupportedVersionCode: z.coerce.number().int().min(0).default(0),
  platform: z.string().trim().min(1).default('android'),
  releaseUrl: z.url(),
  requiresUpdate: z.boolean().default(false),
  updateUrl: z.url(),
});

export type MobileAppUpdatePolicy = z.infer<typeof zMobileAppUpdatePolicy>;

export function assertPolicySyncAuthorized(request: Request) {
  const authorization = request.headers.get('authorization');

  return (
    !!envServer.CRON_SECRET &&
    authorization === `Bearer ${envServer.CRON_SECRET}`
  );
}

export async function getEffectiveMobileAppUpdatePolicy(input: {
  channel: string;
  currentVersionCode: number;
  platform: string;
}) {
  const storedPolicy = await getStoredMobileAppUpdatePolicy();
  const policy = storedPolicy ?? buildEnvironmentMobileAppUpdatePolicy();

  return withRequestContext(policy, input);
}

export async function getPublicMobileAppUpdatePolicy() {
  return (
    (await getStoredMobileAppUpdatePolicy()) ??
    withRequestContext(buildEnvironmentMobileAppUpdatePolicy(), {
      channel: 'standard-release',
      currentVersionCode: 0,
      platform: 'android',
    })
  );
}

export async function putMobileAppUpdatePolicy(rawPolicy: unknown) {
  const policy = zMobileAppUpdatePolicy.parse(rawPolicy);

  await putObject(uploadClient, {
    body: JSON.stringify(policy, null, 2),
    bucket: objectStorageBuckets.legacyPublic,
    cacheControl: 'no-store',
    contentType: 'application/json',
    key: APP_UPDATE_POLICY_OBJECT_KEY,
  });

  return policy;
}

async function getStoredMobileAppUpdatePolicy() {
  try {
    const object = await getObject(uploadClient, {
      bucket: objectStorageBuckets.legacyPublic,
      key: APP_UPDATE_POLICY_OBJECT_KEY,
    });

    return zMobileAppUpdatePolicy.parse(JSON.parse(await object.blob.text()));
  } catch {
    return null;
  }
}

function buildEnvironmentMobileAppUpdatePolicy(): MobileAppUpdatePolicy {
  const updateUrl =
    envServer.MOBILE_ANDROID_UPDATE_URL ??
    envServer.MOBILE_ANDROID_RELEASE_URL ??
    'https://github.com/mannu691/TachiyomiAT/releases';
  const releaseUrl =
    envServer.MOBILE_ANDROID_RELEASE_URL ??
    'https://github.com/mannu691/TachiyomiAT/releases';

  return {
    channel: 'standard-release',
    checkedAt: new Date().toISOString(),
    currentVersionCode: 0,
    forceUpdate: envServer.MOBILE_ANDROID_MIN_VERSION_CODE > 0,
    latestVersionCode: envServer.MOBILE_ANDROID_LATEST_VERSION_CODE,
    latestVersionName: envServer.MOBILE_ANDROID_LATEST_VERSION_NAME ?? null,
    message:
      envServer.MOBILE_ANDROID_UPDATE_MESSAGE ??
      'This version is no longer supported. Update to continue.',
    minimumSupportedVersionCode: envServer.MOBILE_ANDROID_MIN_VERSION_CODE,
    platform: 'android',
    releaseUrl,
    requiresUpdate: false,
    updateUrl,
  };
}

function withRequestContext(
  policy: MobileAppUpdatePolicy,
  input: {
    channel: string;
    currentVersionCode: number;
    platform: string;
  }
): MobileAppUpdatePolicy {
  return {
    ...policy,
    channel: input.channel,
    checkedAt: new Date().toISOString(),
    currentVersionCode: input.currentVersionCode,
    platform: input.platform,
    requiresUpdate:
      policy.forceUpdate &&
      policy.minimumSupportedVersionCode > 0 &&
      input.currentVersionCode < policy.minimumSupportedVersionCode,
  };
}
