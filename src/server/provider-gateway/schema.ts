import { z } from 'zod';

import { ProviderType } from '@/server/db/generated/client';

export const zOcrProviderType = z.enum(['gemini', 'google_cloud_vision']);
export const zTranslationProviderType = z.enum([
  'anthropic',
  'gemini',
  'openai',
]);
export const zProviderLaunchStage = z.enum(['compatibility', 'primary']);

export const zProviderUsageSnapshot = z.object({
  inputTokens: z.number().int().nonnegative().nullish(),
  latencyMs: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative().nullish(),
  pageCount: z.number().int().nonnegative(),
  providerRequestId: z.string().nullish(),
  requestCount: z.number().int().positive(),
});

export const OCR_SYMBOL_CATEGORIES = [
  'uppercase',
  'lowercase',
  'digit',
  'uncased',
] as const;

const zOcrSymbolMetric = z.object({
  count: z.number().int().positive(),
  height: z.number().positive(),
});

export const zOcrSymbolMetrics = z.object({
  digit: zOcrSymbolMetric.optional(),
  lowercase: zOcrSymbolMetric.optional(),
  uncased: zOcrSymbolMetric.optional(),
  uppercase: zOcrSymbolMetric.optional(),
});

export const zOcrBlockTypography = z.object({
  angle: z.number(),
  hasLetterOrDigit: z.boolean().optional(),
  symbolMetrics: zOcrSymbolMetrics.optional(),
  symHeight: z.number().positive(),
});

export const zNormalizedOcrBlock = zOcrBlockTypography.extend({
  groupingBounds: z
    .object({
      height: z.number().positive(),
      width: z.number().positive(),
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  height: z.number().positive(),
  orientedHeight: z.number().positive().optional(),
  orientedWidth: z.number().positive().optional(),
  orientedX: z.number().optional(),
  orientedY: z.number().optional(),
  renderMode: z.enum(['translation', 'mask_only']).optional(),
  sourceTypography: z.array(zOcrBlockTypography).min(1).optional(),
  symWidth: z.number().positive(),
  text: z.string().trim().min(1),
  width: z.number().positive(),
  x: z.number(),
  y: z.number(),
});

export const zNormalizedOcrPage = z.object({
  blocks: z.array(zNormalizedOcrBlock),
  imgHeight: z.number().positive(),
  imgWidth: z.number().positive(),
  provider: zOcrProviderType,
  providerModel: z.string(),
  providerRequestId: z.string().nullish(),
  sourceLanguage: z.string().trim().min(1),
  usage: zProviderUsageSnapshot,
});

export const zTranslationGatewayPageInput = z.object({
  blocks: z
    .array(
      z.object({
        angle: z.number().optional(),
        height: z.number().positive().optional(),
        symHeight: z.number().positive().optional(),
        symWidth: z.number().positive().optional(),
        text: z.string().trim().min(1),
        width: z.number().positive().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
      })
    )
    .min(1),
  pageKey: z.string().trim().min(1),
});

export const zTranslationGatewayInput = z.object({
  jobId: z.string().trim().optional(),
  mangaContext: z.string().trim().optional().default(''),
  pages: z.array(zTranslationGatewayPageInput).min(1),
  preferredProvider: zTranslationProviderType.optional(),
  sourceLanguage: z.string().trim().min(1),
  targetLanguage: z.string().trim().min(1),
});

export const zNormalizedTranslationBlock = z.object({
  index: z.number().int().nonnegative(),
  sourceText: z.string().trim().min(1),
  translation: z.string().trim(),
});

export const zNormalizedTranslationPage = z.object({
  blocks: z.array(zNormalizedTranslationBlock),
  pageKey: z.string().trim().min(1),
});

export const zNormalizedTranslationBatch = z.object({
  pages: z.array(zNormalizedTranslationPage).min(1),
  promptProfile: z.string().trim().min(1),
  promptVersion: z.string().trim().min(1),
  provider: zTranslationProviderType,
  providerModel: z.string().trim().min(1),
  sourceLanguage: z.string().trim().min(1),
  targetLanguage: z.string().trim().min(1),
  usage: zProviderUsageSnapshot.extend({
    finishReason: z.string().nullish(),
    stopReason: z.string().nullish(),
  }),
});

export const zHostedPageTranslation = z.object({
  blocks: z.array(
    z.object({
      angle: z.number(),
      height: z.number().positive(),
      orientedHeight: z.number().positive().optional(),
      orientedWidth: z.number().positive().optional(),
      orientedX: z.number().optional(),
      orientedY: z.number().optional(),
      renderMode: z.enum(['translation', 'mask_only']).optional(),
      symHeight: z.number().positive(),
      symWidth: z.number().positive(),
      text: z.string().trim().min(1),
      translation: z.string().trim(),
      width: z.number().positive(),
      x: z.number(),
      y: z.number(),
    })
  ),
  imgHeight: z.number().positive(),
  imgWidth: z.number().positive(),
  sourceLanguage: z.string().trim().min(1),
  targetLanguage: z.string().trim().min(1),
  translatorType: zTranslationProviderType,
});

export const zProviderManifestItem = z.object({
  enabled: z.boolean(),
  isDefault: z.boolean(),
  launchStage: zProviderLaunchStage,
  modelName: z.string().nullish(),
  provider: z.nativeEnum(ProviderType),
  supportedByGateway: z.boolean(),
});

export const zProviderGatewayManifest = z.object({
  ocr: z.object({
    defaultProvider: zOcrProviderType.nullable(),
    providers: z.array(zProviderManifestItem),
  }),
  requestPolicy: z.object({
    retryMaxAttempts: z.number().int().positive(),
    timeoutMs: z.number().int().positive(),
  }),
  translation: z.object({
    defaultProvider: zTranslationProviderType.nullable(),
    promptVersion: z.string().trim().min(1),
    providers: z.array(zProviderManifestItem),
  }),
});

export type HostedPageTranslation = z.infer<typeof zHostedPageTranslation>;
export type OcrSymbolCategory = (typeof OCR_SYMBOL_CATEGORIES)[number];
export type OcrSymbolMetrics = z.infer<typeof zOcrSymbolMetrics>;
export type OcrBlockTypography = z.infer<typeof zOcrBlockTypography>;
export type NormalizedOcrPage = z.infer<typeof zNormalizedOcrPage>;
export type NormalizedTranslationBatch = z.infer<
  typeof zNormalizedTranslationBatch
>;
export type TranslationGatewayInput = z.infer<typeof zTranslationGatewayInput>;
