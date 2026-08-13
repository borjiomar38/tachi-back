import { getObject, putObject } from '@better-upload/server/helpers';
import { z } from 'zod';

import { objectStorageBuckets, uploadClient } from '@/server/s3';

export const MOBILE_ABI_APP_UPDATE_POLICY_OBJECT_KEY =
  'android/latest/app-update-policy-abi.json';

export const mobileUpdateAbis = [
  'arm64-v8a',
  'armeabi-v7a',
  'x86',
  'x86_64',
] as const;

export type MobileUpdateAbi = (typeof mobileUpdateAbis)[number];

const MAX_ROUTED_APK_SIZE_BYTES = 75_000_000;
const zSha256 = z.string().regex(/^[a-f0-9]{64}$/);
const zHttpsUrl = z
  .url()
  .refine(
    (value) => new URL(value).protocol === 'https:',
    'Expected an HTTPS URL'
  );
const zMobileAbiApk = z
  .object({
    filename: z.string().trim().min(1).max(255),
    sha256: zSha256,
    sizeBytes: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_ROUTED_APK_SIZE_BYTES),
    url: zHttpsUrl,
  })
  .strict();

export const zMobileAbiAppUpdatePolicy = z
  .object({
    apkByAbi: z
      .object({
        'arm64-v8a': zMobileAbiApk,
        'armeabi-v7a': zMobileAbiApk,
        x86: zMobileAbiApk,
        x86_64: zMobileAbiApk,
      })
      .strict(),
    apkVariant: z.literal('per-abi'),
    channel: z.string().trim().min(1).default('standard-release'),
    checkedAt: z.string().trim().min(1),
    currentVersionCode: z.coerce.number().int().min(0).default(0),
    currentVersionName: z.string().trim().min(1).optional(),
    forceUpdate: z.boolean().default(false),
    latestVersionCode: z.coerce.number().int().min(0).default(0),
    latestVersionName: z.string().trim().min(1),
    message: z.string().trim().min(1),
    minimumSupportedVersionCode: z.coerce.number().int().min(0).default(0),
    platform: z.string().trim().min(1).default('android'),
    releaseUrl: zHttpsUrl,
    requiresUpdate: z.boolean().default(false),
    updateUrl: zHttpsUrl,
  })
  .strict()
  .superRefine((policy, context) => {
    if (
      policy.forceUpdate &&
      (policy.minimumSupportedVersionCode <= 0 ||
        policy.minimumSupportedVersionCode > policy.latestVersionCode)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'A forced policy requires a positive minimum version no newer than the latest release',
        path: ['minimumSupportedVersionCode'],
      });
    }

    for (const abi of mobileUpdateAbis) {
      const expectedFilename = getMobileAbiApkFilename(
        abi,
        policy.latestVersionName
      );
      if (policy.apkByAbi[abi].filename !== expectedFilename) {
        context.addIssue({
          code: 'custom',
          message: `Expected filename ${expectedFilename}`,
          path: ['apkByAbi', abi, 'filename'],
        });
      }
    }

    const urls = mobileUpdateAbis.map((abi) => policy.apkByAbi[abi].url);
    if (new Set(urls).size !== mobileUpdateAbis.length) {
      context.addIssue({
        code: 'custom',
        message: 'Each ABI must use a distinct APK URL',
        path: ['apkByAbi'],
      });
    }

    const checksums = mobileUpdateAbis.map(
      (abi) => policy.apkByAbi[abi].sha256
    );
    if (new Set(checksums).size !== mobileUpdateAbis.length) {
      context.addIssue({
        code: 'custom',
        message: 'Each ABI must resolve to a distinct APK artifact',
        path: ['apkByAbi'],
      });
    }
  });

export type MobileAbiAppUpdatePolicy = z.infer<
  typeof zMobileAbiAppUpdatePolicy
>;

export interface MobileAbiAppUpdatePolicyRequestContext {
  channel: string;
  currentVersionCode: number;
  currentVersionName?: string;
  platform: string;
}

export async function getEffectiveMobileAbiAppUpdatePolicy(
  input: MobileAbiAppUpdatePolicyRequestContext
): Promise<MobileAbiAppUpdatePolicy | null> {
  const policy = await getStoredMobileAbiAppUpdatePolicy();

  return policy ? withMobileAbiAppUpdateRequestContext(policy, input) : null;
}

export async function getPublicMobileAbiAppUpdatePolicy(): Promise<MobileAbiAppUpdatePolicy | null> {
  return getStoredMobileAbiAppUpdatePolicy();
}

export async function putMobileAbiAppUpdatePolicy(
  rawPolicy: unknown
): Promise<MobileAbiAppUpdatePolicy> {
  const policy = zMobileAbiAppUpdatePolicy.parse(rawPolicy);

  await putObject(uploadClient, {
    body: JSON.stringify(policy, null, 2),
    bucket: objectStorageBuckets.legacyPublic,
    cacheControl: 'no-store',
    contentType: 'application/json',
    key: MOBILE_ABI_APP_UPDATE_POLICY_OBJECT_KEY,
  });

  return policy;
}

export function withMobileAbiAppUpdateRequestContext(
  policy: MobileAbiAppUpdatePolicy,
  input: MobileAbiAppUpdatePolicyRequestContext
): MobileAbiAppUpdatePolicy {
  return {
    ...policy,
    channel: input.channel,
    checkedAt: new Date().toISOString(),
    currentVersionCode: input.currentVersionCode,
    currentVersionName: input.currentVersionName,
    platform: input.platform,
    requiresUpdate:
      policy.forceUpdate &&
      policy.minimumSupportedVersionCode > 0 &&
      input.currentVersionCode < policy.minimumSupportedVersionCode,
  };
}

function getMobileAbiApkFilename(
  abi: MobileUpdateAbi,
  versionName: string
): string {
  return `TachiyomiAT-${abi}-v${versionName}.apk`;
}

async function getStoredMobileAbiAppUpdatePolicy(): Promise<MobileAbiAppUpdatePolicy | null> {
  try {
    const object = await getObject(uploadClient, {
      bucket: objectStorageBuckets.legacyPublic,
      key: MOBILE_ABI_APP_UPDATE_POLICY_OBJECT_KEY,
    });

    return zMobileAbiAppUpdatePolicy.parse(
      JSON.parse(await object.blob.text())
    );
  } catch {
    return null;
  }
}
