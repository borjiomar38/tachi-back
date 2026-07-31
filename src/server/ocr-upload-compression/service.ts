import { createHash } from 'node:crypto';

import { db } from '@/server/db';
import {
  EffectiveOcrUploadCompressionPolicy,
  getDefaultOcrUploadCompressionRuntimeConfig,
  OCR_UPLOAD_COMPRESSION_CONFIG_KEY,
  OCR_UPLOAD_COMPRESSION_POLICY_VERSION,
  OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG,
  OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG_BY_ID,
  OcrUploadCompressionProfile,
  OcrUploadCompressionRuntimeConfig,
  zEffectiveOcrUploadCompressionPolicy,
  zOcrUploadCompressionRuntimeConfig,
} from '@/server/ocr-upload-compression/schema';

const zStoredOcrUploadCompressionRuntimeConfig =
  zOcrUploadCompressionRuntimeConfig.partial();

type OcrUploadCompressionDbClient = Pick<typeof db, 'appConfig'>;

interface OcrUploadCompressionServiceDependencies {
  dbClient?: OcrUploadCompressionDbClient;
}

interface ResolveEffectiveOcrUploadCompressionPolicyInput {
  config: OcrUploadCompressionRuntimeConfig;
  installationId: string;
}

interface GetEffectiveOcrUploadCompressionPolicyInput {
  installationId: string;
}

export const buildOcrUploadCompressionPolicyRevision = (
  config: OcrUploadCompressionRuntimeConfig
): string => {
  const parsedConfig = zOcrUploadCompressionRuntimeConfig.parse(config);
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        catalog: OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG,
        config: parsedConfig,
      })
    )
    .digest('hex')
    .slice(0, 16);

  return `ocr-upload-v${OCR_UPLOAD_COMPRESSION_POLICY_VERSION}-${digest}`;
};

export const getOcrUploadCompressionRolloutBucket = (
  installationId: string
): number => {
  const digest = createHash('sha256').update(installationId).digest();

  return digest.readUInt32BE(0) % 100;
};

export const getOcrUploadCompressionRuntimeConfig = async (
  dependencies: OcrUploadCompressionServiceDependencies = {}
) => {
  const dbClient = dependencies.dbClient ?? db;
  const entry = await dbClient.appConfig.findUnique({
    select: {
      updatedAt: true,
      value: true,
    },
    where: {
      key: OCR_UPLOAD_COMPRESSION_CONFIG_KEY,
    },
  });
  const parsedValue = zStoredOcrUploadCompressionRuntimeConfig.safeParse(
    entry?.value
  );
  const current = zOcrUploadCompressionRuntimeConfig.parse({
    ...getDefaultOcrUploadCompressionRuntimeConfig(),
    ...(parsedValue.success ? parsedValue.data : {}),
  });

  return {
    catalog: [...OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG],
    current,
    policyRevision: buildOcrUploadCompressionPolicyRevision(current),
    updatedAt: entry?.updatedAt ?? null,
  };
};

export const updateOcrUploadCompressionRuntimeConfig = async (
  input: OcrUploadCompressionRuntimeConfig,
  dependencies: OcrUploadCompressionServiceDependencies = {}
) => {
  const dbClient = dependencies.dbClient ?? db;
  const current = zOcrUploadCompressionRuntimeConfig.parse(input);
  const entry = await dbClient.appConfig.upsert({
    create: {
      key: OCR_UPLOAD_COMPRESSION_CONFIG_KEY,
      value: current,
    },
    select: {
      updatedAt: true,
      value: true,
    },
    update: {
      value: current,
    },
    where: {
      key: OCR_UPLOAD_COMPRESSION_CONFIG_KEY,
    },
  });
  const persistedCurrent = zOcrUploadCompressionRuntimeConfig.parse(
    entry.value
  );

  return {
    catalog: [...OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG],
    current: persistedCurrent,
    policyRevision: buildOcrUploadCompressionPolicyRevision(persistedCurrent),
    updatedAt: entry.updatedAt,
  };
};

export const resolveEffectiveOcrUploadCompressionPolicy = (
  input: ResolveEffectiveOcrUploadCompressionPolicyInput
): EffectiveOcrUploadCompressionPolicy => {
  const parsedConfig = zOcrUploadCompressionRuntimeConfig.safeParse(
    input.config
  );
  const config = parsedConfig.success
    ? parsedConfig.data
    : getDefaultOcrUploadCompressionRuntimeConfig();
  const policyRevision = buildOcrUploadCompressionPolicyRevision(config);

  if (
    config.profile === 'original' ||
    !isOcrUploadCompressionRolloutEligible({
      config,
      installationId: input.installationId,
    })
  ) {
    return buildOriginalPolicy(policyRevision);
  }

  if (config.profile === 'custom') {
    return zEffectiveOcrUploadCompressionPolicy.parse({
      maxWidthPx: config.custom.maxWidthPx,
      measuredReductionPercent: null,
      mode: 'webp',
      policyRevision,
      policyVersion: OCR_UPLOAD_COMPRESSION_POLICY_VERSION,
      profile: config.profile,
      webpQuality: config.custom.webpQuality,
    });
  }

  return buildCatalogWebpPolicy(config.profile, policyRevision);
};

export const getEffectiveOcrUploadCompressionPolicy = async (
  input: GetEffectiveOcrUploadCompressionPolicyInput,
  dependencies: OcrUploadCompressionServiceDependencies = {}
): Promise<EffectiveOcrUploadCompressionPolicy> => {
  const state = await getOcrUploadCompressionRuntimeConfig(dependencies);

  return resolveEffectiveOcrUploadCompressionPolicy({
    config: state.current,
    installationId: input.installationId,
  });
};

const isOcrUploadCompressionRolloutEligible = (input: {
  config: OcrUploadCompressionRuntimeConfig;
  installationId: string;
}): boolean => {
  const { rollout } = input.config;

  if (rollout.mode === 'all') {
    return true;
  }

  if (rollout.mode === 'test_devices') {
    return rollout.installationIds.includes(input.installationId);
  }

  return (
    getOcrUploadCompressionRolloutBucket(input.installationId) <
    rollout.percentage
  );
};

const buildOriginalPolicy = (
  policyRevision: string
): EffectiveOcrUploadCompressionPolicy =>
  zEffectiveOcrUploadCompressionPolicy.parse({
    measuredReductionPercent: 0,
    mode: 'original',
    policyRevision,
    policyVersion: OCR_UPLOAD_COMPRESSION_POLICY_VERSION,
    profile: 'original',
  });

const buildCatalogWebpPolicy = (
  profile: Exclude<OcrUploadCompressionProfile, 'custom' | 'original'>,
  policyRevision: string
): EffectiveOcrUploadCompressionPolicy => {
  const catalogEntry = OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG_BY_ID[profile];

  if (
    catalogEntry.mode !== 'webp' ||
    catalogEntry.maxWidthPx === null ||
    catalogEntry.webpQuality === null
  ) {
    return buildOriginalPolicy(policyRevision);
  }

  return zEffectiveOcrUploadCompressionPolicy.parse({
    maxWidthPx: catalogEntry.maxWidthPx,
    measuredReductionPercent: catalogEntry.measuredReductionPercent,
    mode: catalogEntry.mode,
    policyRevision,
    policyVersion: OCR_UPLOAD_COMPRESSION_POLICY_VERSION,
    profile,
    webpQuality: catalogEntry.webpQuality,
  });
};
