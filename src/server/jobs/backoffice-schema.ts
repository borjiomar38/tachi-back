import { z } from 'zod';

import { ProviderType, ProviderUsageStage } from '@/server/db/generated/client';
import { zTranslationProviderPrimary } from '@/server/provider-gateway/runtime-config';
import { zProviderGatewayManifest } from '@/server/provider-gateway/schema';

export const zBackofficeJobStatus = z.enum([
  'created',
  'awaiting_upload',
  'queued',
  'processing',
  'completed',
  'failed',
  'canceled',
  'expired',
]);

export const zBackofficeJobListInput = z.object({
  limit: z.coerce.number().int().positive().max(100).default(25),
  searchTerm: z.string().trim().max(128).optional().default(''),
  status: z
    .enum([
      'all',
      'created',
      'awaiting_upload',
      'queued',
      'processing',
      'completed',
      'failed',
      'canceled',
      'expired',
    ])
    .default('all'),
});

export const zBackofficeJobListItem = z.object({
  completedAt: z.date().nullish(),
  createdAt: z.date(),
  durationMs: z.number().int().nonnegative().nullish(),
  errorCode: z.string().nullish(),
  errorMessage: z.string().nullish(),
  failedAt: z.date().nullish(),
  id: z.string(),
  installationId: z.string(),
  licenseKey: z.string(),
  pageCount: z.number().int().positive(),
  providerUsageCount: z.number().int().nonnegative(),
  queuedAt: z.date().nullish(),
  requestedOcrProvider: z.nativeEnum(ProviderType).nullish(),
  requestedTranslationProvider: z.nativeEnum(ProviderType).nullish(),
  resolvedOcrProvider: z.nativeEnum(ProviderType).nullish(),
  resolvedTranslationProvider: z.nativeEnum(ProviderType).nullish(),
  reservedTokens: z.number().int().nonnegative(),
  sourceLanguage: z.string(),
  spentTokens: z.number().int().nonnegative(),
  startedAt: z.date().nullish(),
  status: zBackofficeJobStatus,
  targetLanguage: z.string(),
  uploadedPageCount: z.number().int().nonnegative(),
});

export const zBackofficeJobListResponse = z.object({
  items: z.array(zBackofficeJobListItem),
  total: z.number().int().nonnegative(),
});

export const zBackofficeTranslationQaStatus = z.enum([
  'all',
  'ok',
  'issues_found',
  'blocked',
  'unavailable',
]);

export const zBackofficeTranslationQaListInput = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: zBackofficeTranslationQaStatus.default('all'),
});

export const zBackofficeTranslationQaIssueSeverity = z.enum([
  'critical',
  'warning',
  'info',
]);

export const zBackofficeTranslationQaIssuePreview = z.object({
  blockIndex: z.number().int().nonnegative().nullish(),
  evidence: z.string().nullish(),
  kind: z.string(),
  message: z.string(),
  pageKey: z.string(),
  severity: zBackofficeTranslationQaIssueSeverity,
});

export const zBackofficeTranslationQaReportStatus =
  zBackofficeTranslationQaStatus.exclude(['all']);

export const zBackofficeTranslationQaInspectionMode = z.enum([
  'visual_and_manifest',
  'manifest_only',
  'unknown',
]);

export const zBackofficeTranslationQaListItem = z.object({
  assetId: z.string(),
  chapterIdentity: z
    .object({
      chapterName: z.string().nullish(),
      chapterUrl: z.string(),
      mangaTitle: z.string().nullish(),
      mangaUrl: z.string().nullish(),
      sourceId: z.string().nullish(),
      sourceName: z.string().nullish(),
    })
    .nullish(),
  chapterNumber: z.string().nullish(),
  cleanupAnalysisCompleted: z.boolean().nullish(),
  cleanupCanDeleteOriginalUploads: z.boolean().nullish(),
  criticalIssueCount: z.number().int().nonnegative(),
  infoIssueCount: z.number().int().nonnegative(),
  inspectionMode: zBackofficeTranslationQaInspectionMode,
  issueCount: z.number().int().nonnegative(),
  jobCompletedAt: z.date().nullish(),
  jobCreatedAt: z.date(),
  jobId: z.string(),
  pageCount: z.number().int().nonnegative(),
  reportCreatedAt: z.date(),
  sourceLanguage: z.string(),
  status: zBackofficeTranslationQaReportStatus,
  summary: z.string(),
  targetLanguage: z.string(),
  topIssues: z.array(zBackofficeTranslationQaIssuePreview),
  trainingSignals: z.array(z.string()),
  warningIssueCount: z.number().int().nonnegative(),
});

export const zBackofficeTranslationQaDimensionStat = z.object({
  count: z.number().int().nonnegative(),
  value: z.string(),
});

export const zBackofficeTranslationQaStats = z.object({
  blockedReportCount: z.number().int().nonnegative(),
  cleanupBlockedCount: z.number().int().nonnegative(),
  criticalIssueCount: z.number().int().nonnegative(),
  infoIssueCount: z.number().int().nonnegative(),
  issueReportCount: z.number().int().nonnegative(),
  manifestOnlyReportCount: z.number().int().nonnegative(),
  okReportCount: z.number().int().nonnegative(),
  sourceLanguages: z.array(zBackofficeTranslationQaDimensionStat),
  targetLanguages: z.array(zBackofficeTranslationQaDimensionStat),
  topIssueKinds: z.array(zBackofficeTranslationQaDimensionStat),
  totalIssues: z.number().int().nonnegative(),
  totalReports: z.number().int().nonnegative(),
  unavailableReportCount: z.number().int().nonnegative(),
  visualReportCount: z.number().int().nonnegative(),
  warningIssueCount: z.number().int().nonnegative(),
});

export const zBackofficeTranslationQaListResponse = z.object({
  items: z.array(zBackofficeTranslationQaListItem),
  stats: zBackofficeTranslationQaStats,
  total: z.number().int().nonnegative(),
});

export const zBackofficeDeviceListInput = z.object({
  country: z.string().trim().max(64).default('all'),
  limit: z.coerce.number().int().positive().max(100).default(50),
  linked: z.enum(['all', 'linked', 'unlinked']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  searchTerm: z.string().trim().max(128).optional().default(''),
  status: z
    .enum(['all', 'pending', 'active', 'revoked', 'blocked'])
    .default('all'),
});

export const zBackofficeDeviceListItem = z.object({
  activeLicense: z
    .object({
      boundAt: z.date(),
      id: z.string(),
      key: z.string(),
      ownerEmail: z.string().nullish(),
      status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
    })
    .nullish(),
  appBuild: z.string().nullish(),
  appVersion: z.string().nullish(),
  country: z.string().nullish(),
  freeAccessIpBlocked: z.boolean(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  ownerAvatarUrl: z.string().nullish(),
  createdAt: z.date(),
  id: z.string(),
  installationId: z.string(),
  lastIpAddress: z.string().nullish(),
  lastSeenAt: z.date().nullish(),
  locale: z.string().nullish(),
  platform: z.literal('android'),
  redeemedCode: z
    .object({
      code: z.string(),
      redeemedAt: z.date().nullish(),
      status: z.enum(['available', 'redeemed', 'expired', 'canceled']),
    })
    .nullish(),
  sameIpOwnerEmails: z.array(z.string()),
  sameIpInstallCount: z.number().int().nonnegative(),
  status: z.enum(['pending', 'active', 'revoked', 'blocked']),
});

export const zBackofficeDeviceListResponse = z.object({
  items: z.array(zBackofficeDeviceListItem),
  linkedCount: z.number().int().nonnegative(),
  unlinkedCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const zBackofficeVersionSupportStatus = z.enum([
  'ahead',
  'latest',
  'outdated',
  'supported',
  'unknown',
  'unsupported',
]);

export const zBackofficeInstalledVersionStats = z.object({
  activeInstallCount: z.number().int().nonnegative(),
  appBuild: z.string().nullable(),
  appVersion: z.string().nullable(),
  firstSeenAt: z.date().nullable(),
  installCount: z.number().int().nonnegative(),
  lastSeenAt: z.date().nullable(),
  linkedInstallCount: z.number().int().nonnegative(),
  status: zBackofficeVersionSupportStatus,
  versionCode: z.number().int().nonnegative().nullable(),
});

export const zBackofficeVersionSummary = z.object({
  activeSince: z.date(),
  generatedAt: z.date(),
  policy: z.object({
    checkedAt: z.string(),
    forceUpdate: z.boolean(),
    latestVersionCode: z.number().int().nonnegative(),
    latestVersionName: z.string().nullable(),
    message: z.string(),
    minimumSupportedVersionCode: z.number().int().nonnegative(),
    releaseUrl: z.string(),
    updateUrl: z.string(),
  }),
  stats: z.object({
    activeInstallCount: z.number().int().nonnegative(),
    latestInstallCount: z.number().int().nonnegative(),
    linkedInstallCount: z.number().int().nonnegative(),
    outdatedInstallCount: z.number().int().nonnegative(),
    totalInstallCount: z.number().int().nonnegative(),
    unknownVersionInstallCount: z.number().int().nonnegative(),
    unsupportedInstallCount: z.number().int().nonnegative(),
    versionCount: z.number().int().nonnegative(),
  }),
  versions: z.array(zBackofficeInstalledVersionStats),
});

export const zBackofficeJobAsset = z.object({
  bucketName: z.string().nullish(),
  createdAt: z.date(),
  id: z.string(),
  kind: z.enum([
    'page_upload',
    'result_manifest',
    'debug_artifact',
    'log_export',
  ]),
  metadata: z.unknown().nullish(),
  mimeType: z.string().nullish(),
  objectKey: z.string().nullish(),
  originalFileName: z.string().nullish(),
  pageNumber: z.number().int().positive().nullish(),
  sizeBytes: z.number().int().positive().nullish(),
});

export const zBackofficeJobProviderUsage = z.object({
  costMicros: z.string().nullish(),
  createdAt: z.date(),
  errorCode: z.string().nullish(),
  id: z.string(),
  inputTokens: z.number().int().nonnegative().nullish(),
  latencyMs: z.number().int().nonnegative().nullish(),
  metadata: z.unknown().nullish(),
  modelName: z.string().nullish(),
  outputTokens: z.number().int().nonnegative().nullish(),
  pageCount: z.number().int().nonnegative(),
  provider: z.nativeEnum(ProviderType),
  requestCount: z.number().int().positive(),
  stage: z.nativeEnum(ProviderUsageStage),
  success: z.boolean(),
});

export const zBackofficeJobLedgerEntry = z.object({
  createdAt: z.date(),
  deltaTokens: z.number().int(),
  description: z.string().nullish(),
  id: z.string(),
  status: z.enum(['pending', 'posted', 'voided']),
  type: z.enum([
    'purchase_credit',
    'manual_credit',
    'redeem_credit',
    'job_reserve',
    'job_release',
    'job_spend',
    'refund_credit',
    'expiration_debit',
    'admin_adjustment',
  ]),
});

export const zBackofficeJobLifecycleEvent = z.object({
  at: z.date(),
  detail: z.string(),
  level: z.enum(['info', 'success', 'warning', 'error']),
  title: z.string(),
  type: z.string(),
});

export const zBackofficeJobDetail = z.object({
  assets: z.array(zBackofficeJobAsset),
  completedAt: z.date().nullish(),
  createdAt: z.date(),
  device: z.object({
    appBuild: z.string().nullish(),
    appVersion: z.string().nullish(),
    id: z.string(),
    installationId: z.string(),
    lastSeenAt: z.date().nullish(),
    platform: z.enum(['android']),
    status: z.enum(['pending', 'active', 'revoked', 'blocked']),
  }),
  durationMs: z.number().int().nonnegative().nullish(),
  errorCode: z.string().nullish(),
  errorMessage: z.string().nullish(),
  failedAt: z.date().nullish(),
  id: z.string(),
  ledgerEntries: z.array(zBackofficeJobLedgerEntry),
  license: z.object({
    id: z.string(),
    key: z.string(),
    ownerEmail: z.string().nullish(),
    status: z.enum(['pending', 'active', 'suspended', 'revoked', 'expired']),
  }),
  lifecycleEvents: z.array(zBackofficeJobLifecycleEvent),
  pageCount: z.number().int().positive(),
  providerUsages: z.array(zBackofficeJobProviderUsage),
  queuedAt: z.date().nullish(),
  requestedOcrProvider: z.nativeEnum(ProviderType).nullish(),
  requestedTranslationProvider: z.nativeEnum(ProviderType).nullish(),
  reservedTokens: z.number().int().nonnegative(),
  resolvedOcrProvider: z.nativeEnum(ProviderType).nullish(),
  resolvedTranslationProvider: z.nativeEnum(ProviderType).nullish(),
  resultPayloadVersion: z.string().nullish(),
  resultSummary: z.unknown().nullish(),
  sourceLanguage: z.string(),
  spentTokens: z.number().int().nonnegative(),
  startedAt: z.date().nullish(),
  status: zBackofficeJobStatus,
  targetLanguage: z.string(),
  uploadCompletedAt: z.date().nullish(),
  uploadedPageCount: z.number().int().nonnegative(),
});

export const zBackofficeChapterIdentity = z.object({
  chapterName: z.string().nullish(),
  chapterUrl: z.string(),
  mangaTitle: z.string().nullish(),
  mangaUrl: z.string().nullish(),
  sourceId: z.string().nullish(),
  sourceName: z.string().nullish(),
});

export const zBackofficeTranslatedChapterListInput = z.object({
  limit: z.coerce.number().int().positive().max(100).default(25),
  searchTerm: z.string().trim().max(128).optional().default(''),
});

export const zBackofficeTranslatedChapterListItem = z.object({
  cacheHitCount: z.number().int().nonnegative(),
  cachedTranslationCount: z.number().int().nonnegative(),
  chapterCacheKey: z.string(),
  completedJobCount: z.number().int().nonnegative(),
  firstCachedAt: z.date(),
  identity: zBackofficeChapterIdentity.nullish(),
  lastCachedAt: z.date(),
  latestJobAt: z.date().nullish(),
  pageCount: z.number().int().nonnegative(),
  sourceLanguages: z.array(z.string()),
  targetLanguages: z.array(z.string()),
  totalJobCount: z.number().int().nonnegative(),
});

export const zBackofficeTranslatedChapterListResponse = z.object({
  items: z.array(zBackofficeTranslatedChapterListItem),
  scannedCacheRows: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const zBackofficeTranslatedChapterCacheEntry = z.object({
  cacheHitCount: z.number().int().nonnegative(),
  cacheKey: z.string(),
  createdAt: z.date(),
  pageCount: z.number().int().nonnegative(),
  resultManifest: z.unknown().nullish(),
  resultPayloadVersion: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  updatedAt: z.date(),
});

export const zBackofficeTranslatedChapterJob = z.object({
  completedAt: z.date().nullish(),
  createdAt: z.date(),
  id: z.string(),
  installationId: z.string(),
  licenseKey: z.string(),
  pageCount: z.number().int().nonnegative(),
  sourceLanguage: z.string(),
  status: zBackofficeJobStatus,
  targetLanguage: z.string(),
});

export const zBackofficeTranslatedChapterPagePreview = z.object({
  blockCount: z.number().int().nonnegative(),
  imageHeight: z.number().int().positive().nullish(),
  imageWidth: z.number().int().positive().nullish(),
  pageKey: z.string(),
  sourcePreview: z.string(),
  translationPreview: z.string(),
});

export const zBackofficeTranslatedChapterDetail = z.object({
  cacheEntries: z.array(zBackofficeTranslatedChapterCacheEntry),
  chapterCacheKey: z.string(),
  identity: zBackofficeChapterIdentity.nullish(),
  jobs: z.array(zBackofficeTranslatedChapterJob),
  latestManifest: z.unknown().nullish(),
  pagePreviews: z.array(zBackofficeTranslatedChapterPagePreview),
  stats: z.object({
    cacheHitCount: z.number().int().nonnegative(),
    cachedTranslationCount: z.number().int().nonnegative(),
    completedJobCount: z.number().int().nonnegative(),
    pageCount: z.number().int().nonnegative(),
    sourceLanguages: z.array(z.string()),
    targetLanguages: z.array(z.string()),
    totalJobCount: z.number().int().nonnegative(),
  }),
});

export const zProviderOpsInput = z.object({
  windowHours: z.coerce
    .number()
    .int()
    .positive()
    .max(24 * 30)
    .default(24),
});

export const zProviderRoutingConfig = z.object({
  geminiTranslationModel: z.string().trim().min(1),
  openaiTranslationModel: z.string().trim().min(1),
  translationProviderPrimary: zTranslationProviderPrimary,
});

export const zProviderRoutingConfigInput = zProviderRoutingConfig;

export const zProviderRoutingProviderOption = z.object({
  enabled: z.boolean(),
  modelName: z.string(),
  modelOptions: z.array(z.string()),
  provider: z.enum(['gemini', 'openai']),
  reason: z.string().nullish(),
});

export const zProviderRoutingConfigResponse = z.object({
  current: zProviderRoutingConfig,
  ocr: z.object({
    enabled: z.boolean(),
    modelName: z.string(),
    provider: z.literal('google_cloud_vision'),
    reason: z.string().nullish(),
  }),
  translationProviders: z.array(zProviderRoutingProviderOption),
  updatedAt: z.date().nullish(),
});

export const zProviderOpsHealth = z.enum([
  'healthy',
  'degraded',
  'down',
  'inactive',
]);

export const zProviderOpsStageSummary = z.object({
  avgLatencyMs: z.number().int().nonnegative().nullish(),
  failureCount: z.number().int().nonnegative(),
  health: zProviderOpsHealth,
  lastUsedAt: z.date().nullish(),
  stage: z.nativeEnum(ProviderUsageStage),
  successCount: z.number().int().nonnegative(),
  successRatePercent: z.number().int().min(0).max(100),
  topErrorCodes: z.array(
    z.object({
      count: z.number().int().positive(),
      errorCode: z.string(),
    })
  ),
  totalCostMicros: z.string(),
  totalPageCount: z.number().int().nonnegative(),
  totalRequestCount: z.number().int().nonnegative(),
  totalUsageCount: z.number().int().nonnegative(),
});

export const zProviderOpsProviderSummary = z.object({
  enabled: z.boolean(),
  health: zProviderOpsHealth,
  isDefault: z.boolean(),
  lastUsedAt: z.date().nullish(),
  launchStage: z.enum(['compatibility', 'primary']),
  modelName: z.string().nullish(),
  provider: z.nativeEnum(ProviderType),
  stages: z.array(zProviderOpsStageSummary),
  successRatePercent: z.number().int().min(0).max(100),
  supportedByGateway: z.boolean(),
  totalCostMicros: z.string(),
  totalFailureCount: z.number().int().nonnegative(),
  totalPageCount: z.number().int().nonnegative(),
  totalRequestCount: z.number().int().nonnegative(),
  totalUsageCount: z.number().int().nonnegative(),
});

export const zProviderOpsRecentFailure = z.object({
  createdAt: z.date(),
  errorCode: z.string().nullish(),
  installationId: z.string(),
  jobId: z.string(),
  jobStatus: zBackofficeJobStatus,
  licenseKey: z.string(),
  modelName: z.string().nullish(),
  provider: z.nativeEnum(ProviderType),
  stage: z.nativeEnum(ProviderUsageStage),
});

export const zProviderOpsSummary = z.object({
  generatedAt: z.date(),
  jobStatusCounts: z.array(
    z.object({
      count: z.number().int().nonnegative(),
      status: zBackofficeJobStatus,
    })
  ),
  manifest: zProviderGatewayManifest,
  providers: z.array(zProviderOpsProviderSummary),
  recentFailures: z.array(zProviderOpsRecentFailure),
  windowHours: z.number().int().positive(),
});
