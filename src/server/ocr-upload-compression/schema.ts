import { z } from 'zod';

export const OCR_UPLOAD_COMPRESSION_CONFIG_KEY =
  'ocr_upload_compression_runtime_config';
export const OCR_UPLOAD_COMPRESSION_POLICY_VERSION = 1 as const;

export const SAFE_MAX_WIDTH_PX = 2_000;
export const SAFE_WEBP_QUALITY = 75;
export const SAFE_MEASURED_REDUCTION_PERCENT = 44.7;

export const EXPERIMENTAL_BALANCED_MAX_WIDTH_PX = 1_600;
export const EXPERIMENTAL_BALANCED_WEBP_QUALITY = 70;
export const EXPERIMENTAL_BALANCED_MEASURED_REDUCTION_PERCENT = 57.8;
export const EXPERIMENTAL_STRONG_MAX_WIDTH_PX = 1_400;
export const EXPERIMENTAL_STRONG_WEBP_QUALITY = 50;
export const EXPERIMENTAL_STRONG_MEASURED_REDUCTION_PERCENT = 69.7;
export const MAX_OCR_UPLOAD_COMPRESSION_TEST_INSTALLATIONS = 20;

const createOcrUploadCompressionProfileSchema = () =>
  z.enum(['original', 'safe', 'balanced', 'strong', 'custom']);

export const zOcrUploadCompressionProfile =
  createOcrUploadCompressionProfileSchema();

const createOcrUploadCompressionModeSchema = () => z.enum(['original', 'webp']);

export const zOcrUploadCompressionMode = createOcrUploadCompressionModeSchema();

const createOcrUploadCompressionCustomSettingsSchema = () =>
  z
    .object({
      maxWidthPx: z.number().int().min(800).max(2_400),
      webpQuality: z.number().int().min(40).max(90),
    })
    .strict();

export const zOcrUploadCompressionCustomSettings =
  createOcrUploadCompressionCustomSettingsSchema();

const createOcrUploadCompressionRolloutSchema = () =>
  z.discriminatedUnion('mode', [
    z
      .object({
        installationIds: z
          .array(z.string().trim().min(1).max(191))
          .max(MAX_OCR_UPLOAD_COMPRESSION_TEST_INSTALLATIONS),
        mode: z.literal('test_devices'),
      })
      .strict(),
    z
      .object({
        mode: z.literal('percentage'),
        percentage: z.number().int().min(0).max(100),
      })
      .strict(),
    z
      .object({
        mode: z.literal('all'),
      })
      .strict(),
  ]);

export const zOcrUploadCompressionRollout =
  createOcrUploadCompressionRolloutSchema();

const createOcrUploadCompressionRuntimeConfigSchema = () =>
  z
    .object({
      custom: zOcrUploadCompressionCustomSettings,
      policyVersion: z.literal(OCR_UPLOAD_COMPRESSION_POLICY_VERSION),
      profile: zOcrUploadCompressionProfile,
      rollout: zOcrUploadCompressionRollout,
    })
    .strict();

export const zOcrUploadCompressionRuntimeConfig =
  createOcrUploadCompressionRuntimeConfigSchema();

const createOcrUploadCompressionProfileCatalogItemSchema = () =>
  z
    .object({
      experimental: z.boolean(),
      maxWidthPx: z.number().int().nullable(),
      measuredReductionPercent: z.number().min(0).max(100).nullable(),
      mode: zOcrUploadCompressionMode,
      profile: zOcrUploadCompressionProfile,
      webpQuality: z.number().int().nullable(),
    })
    .strict();

export const zOcrUploadCompressionProfileCatalogItem =
  createOcrUploadCompressionProfileCatalogItemSchema();

const createOcrUploadCompressionProfileCatalogSchema = () =>
  z.array(zOcrUploadCompressionProfileCatalogItem).length(5);

export const zOcrUploadCompressionProfileCatalog =
  createOcrUploadCompressionProfileCatalogSchema();

const createOcrUploadCompressionRuntimeStateSchema = () =>
  z
    .object({
      catalog: zOcrUploadCompressionProfileCatalog,
      current: zOcrUploadCompressionRuntimeConfig,
      policyRevision: z.string().min(1),
      updatedAt: z.date().nullable(),
    })
    .strict();

export const zOcrUploadCompressionRuntimeState =
  createOcrUploadCompressionRuntimeStateSchema();

const createEffectiveOcrUploadCompressionPolicySchema = () =>
  z.discriminatedUnion('mode', [
    z
      .object({
        measuredReductionPercent: z.number().min(0).max(100).nullable(),
        mode: z.literal('original'),
        policyRevision: z.string().min(1),
        policyVersion: z.literal(OCR_UPLOAD_COMPRESSION_POLICY_VERSION),
        profile: z.literal('original'),
      })
      .strict(),
    z
      .object({
        maxWidthPx: z.number().int().min(800).max(2_400),
        measuredReductionPercent: z.number().min(0).max(100).nullable(),
        mode: z.literal('webp'),
        policyRevision: z.string().min(1),
        policyVersion: z.literal(OCR_UPLOAD_COMPRESSION_POLICY_VERSION),
        profile: z.enum(['safe', 'balanced', 'strong', 'custom']),
        webpQuality: z.number().int().min(40).max(90),
      })
      .strict(),
  ]);

export const zEffectiveOcrUploadCompressionPolicy =
  createEffectiveOcrUploadCompressionPolicySchema();

export type OcrUploadCompressionProfile = z.infer<
  typeof zOcrUploadCompressionProfile
>;
export type OcrUploadCompressionRuntimeConfig = z.infer<
  typeof zOcrUploadCompressionRuntimeConfig
>;
export type OcrUploadCompressionProfileCatalogItem = z.infer<
  typeof zOcrUploadCompressionProfileCatalogItem
>;
export type EffectiveOcrUploadCompressionPolicy = z.infer<
  typeof zEffectiveOcrUploadCompressionPolicy
>;

export const OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG =
  zOcrUploadCompressionProfileCatalog.parse([
    {
      experimental: false,
      maxWidthPx: null,
      measuredReductionPercent: 0,
      mode: 'original',
      profile: 'original',
      webpQuality: null,
    },
    {
      experimental: false,
      maxWidthPx: SAFE_MAX_WIDTH_PX,
      measuredReductionPercent: SAFE_MEASURED_REDUCTION_PERCENT,
      mode: 'webp',
      profile: 'safe',
      webpQuality: SAFE_WEBP_QUALITY,
    },
    {
      experimental: true,
      maxWidthPx: EXPERIMENTAL_BALANCED_MAX_WIDTH_PX,
      measuredReductionPercent:
        EXPERIMENTAL_BALANCED_MEASURED_REDUCTION_PERCENT,
      mode: 'webp',
      profile: 'balanced',
      webpQuality: EXPERIMENTAL_BALANCED_WEBP_QUALITY,
    },
    {
      experimental: true,
      maxWidthPx: EXPERIMENTAL_STRONG_MAX_WIDTH_PX,
      measuredReductionPercent: EXPERIMENTAL_STRONG_MEASURED_REDUCTION_PERCENT,
      mode: 'webp',
      profile: 'strong',
      webpQuality: EXPERIMENTAL_STRONG_WEBP_QUALITY,
    },
    {
      experimental: true,
      maxWidthPx: null,
      measuredReductionPercent: null,
      mode: 'webp',
      profile: 'custom',
      webpQuality: null,
    },
  ]);

export const OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG_BY_ID = Object.fromEntries(
  OCR_UPLOAD_COMPRESSION_PROFILE_CATALOG.map((entry) => [entry.profile, entry])
) as Record<
  OcrUploadCompressionProfile,
  OcrUploadCompressionProfileCatalogItem
>;

export const getDefaultOcrUploadCompressionRuntimeConfig =
  (): OcrUploadCompressionRuntimeConfig => ({
    custom: {
      maxWidthPx: SAFE_MAX_WIDTH_PX,
      webpQuality: SAFE_WEBP_QUALITY,
    },
    policyVersion: OCR_UPLOAD_COMPRESSION_POLICY_VERSION,
    profile: 'original',
    rollout: {
      mode: 'all',
    },
  });
