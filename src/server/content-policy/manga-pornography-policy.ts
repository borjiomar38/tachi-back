import { createHash } from 'node:crypto';
import type { Logger } from 'pino';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import {
  type MangaPornographyAssessment,
  type MangaPornographyAssessmentStatus,
  type MangaPornographyAssessmentVerdict,
  type MangaPornographyManualDecision,
  Prisma,
} from '@/server/db/generated/client';
import { logger } from '@/server/logger';

import {
  getMangaPornographyAutomationSettings,
  type MangaPornographyAutomationSettings,
  type MangaPornographySettingsDbClient,
} from './manga-pornography-settings';
import {
  moderateMangaPornography,
  OpenAIPornographyModerationError,
  type OpenAIPornographyModerationResult,
} from './openai-pornography-moderation';

const IDENTITY_ALGORITHM = '2026-08-09.manga-pornography-identity.v1';
const FINGERPRINT_ALGORITHM =
  '2026-08-09.manga-pornography-input-fingerprint.v1';
const DEFAULT_LEASE_BUFFER_MS = 15_000;
const DEFAULT_POLL_INTERVAL_MS = 250;
const DEFAULT_RETRY_BASE_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const SAFE_LOG_ERROR_NAMES = new Set([
  'AbortError',
  'AggregateError',
  'Error',
  'OpenAIPornographyModerationError',
  'PrismaClientInitializationError',
  'PrismaClientKnownRequestError',
  'PrismaClientUnknownRequestError',
  'PrismaClientValidationError',
  'RangeError',
  'TypeError',
]);

type AssessmentDelegate = Pick<
  typeof db.mangaPornographyAssessment,
  'findMany' | 'findUnique' | 'update' | 'updateMany' | 'upsert'
>;

export interface MangaPornographyPolicyDbClient extends MangaPornographySettingsDbClient {
  deviceMangaVisit?: Partial<
    Pick<typeof db.deviceMangaVisit, 'findFirst' | 'findMany'>
  >;
  mangaPornographyAssessment?: AssessmentDelegate;
}

export interface MangaPornographyIdentityInput {
  mangaTitle?: string | null;
  sourceId?: string | null;
  sourceName?: string | null;
  title?: string | null;
}

export interface NormalizedMangaPornographyIdentity {
  normalizedSourceId: string | null;
  normalizedSourceName: string | null;
  normalizedTitle: string;
}

export interface MangaPornographyAssessmentRegistrationInput {
  extensionName?: string | null;
  extensionPackageName?: string | null;
  mangaUrl?: string | null;
  sourceId?: string | null;
  sourceName?: string | null;
  thumbnailUrl?: string | null;
  title: string;
}

export interface MangaPornographyPolicyConfig {
  apiKey: string;
  baseUrl: string;
  blockThreshold: number;
  enabled: boolean;
  leaseDurationMs: number;
  maxAttempts: number;
  model: string;
  policyVersion: string;
  retryBaseDelayMs: number;
  reviewThreshold: number;
  timeoutMs: number;
}

export type MangaPornographyPolicyLogger = Pick<
  Logger,
  'error' | 'info' | 'warn'
> &
  Partial<Pick<Logger, 'debug'>>;

interface CommonDependencies {
  automationSettings?: MangaPornographyAutomationSettings;
  config?: Partial<MangaPornographyPolicyConfig>;
  dbClient?: MangaPornographyPolicyDbClient;
  log?: MangaPornographyPolicyLogger;
  monotonicNow?: () => number;
  now?: () => Date;
}

export interface RegisterMangaPornographyAssessmentResult {
  assessmentId: string | null;
  identityKey: string;
  inputFingerprint: string;
  shouldSchedule: boolean;
  status: MangaPornographyAssessmentStatus | 'unavailable';
}

export interface MangaPornographyPolicyDecision {
  assessmentId: string;
  attemptCount: number;
  blocked: boolean;
  effectiveDecision: 'allow' | 'block' | 'error' | 'pending' | 'review';
  manualDecision: MangaPornographyManualDecision | null;
  nextAttemptAt: Date | null;
  pending: boolean;
  processingLeaseExpiresAt: Date | null;
  status: MangaPornographyAssessmentStatus;
  verdict: MangaPornographyAssessmentVerdict | null;
}

export type MangaPornographyEffectiveStatus =
  | 'allowed'
  | 'blocked'
  | 'errors'
  | 'pending'
  | 'review';

export type ProcessMangaPornographyAssessmentResult =
  | {
      outcome: 'completed';
      assessmentId: string;
      sexualScore: number;
      verdict: MangaPornographyAssessmentVerdict;
    }
  | {
      outcome: 'disabled' | 'not_claimed' | 'stale' | 'unavailable';
      assessmentId: string;
    }
  | {
      outcome: 'permanent_error' | 'retry_scheduled';
      assessmentId: string;
      attemptCount: number;
      errorCode: string;
      nextAttemptAt: Date | null;
    };

type Moderator = typeof moderateMangaPornography;

export function normalizeMangaPornographyIdentity(
  input: MangaPornographyIdentityInput
): NormalizedMangaPornographyIdentity {
  const title = input.mangaTitle ?? input.title;
  const normalizedTitle = normalizeIdentityText(title);

  if (!normalizedTitle) {
    throw new Error('A manga title is required for pornography assessment.');
  }

  return {
    normalizedSourceId: normalizeIdentityText(input.sourceId),
    normalizedSourceName: normalizeIdentityText(input.sourceName),
    normalizedTitle,
  };
}

export function buildMangaPornographyIdentityKey(
  input: MangaPornographyIdentityInput
) {
  const identity = normalizeMangaPornographyIdentity(input);
  const source = identity.normalizedSourceId
    ? { kind: 'sourceId', value: identity.normalizedSourceId }
    : {
        kind: 'sourceName',
        value: identity.normalizedSourceName ?? '',
      };

  return hashJson({
    algorithm: IDENTITY_ALGORITHM,
    source,
    title: identity.normalizedTitle,
  });
}

export function buildMangaPornographyInputFingerprint(input: {
  model: string;
  policyVersion: string;
  thumbnailUrl?: string | null;
  title: string;
}) {
  const normalizedTitle = normalizeIdentityText(input.title);
  if (!normalizedTitle) {
    throw new Error('A manga title is required for pornography assessment.');
  }

  return hashJson({
    algorithm: FINGERPRINT_ALGORITHM,
    model: input.model.trim(),
    policyVersion: input.policyVersion.trim(),
    thumbnailUrl: normalizeFingerprintUrl(input.thumbnailUrl),
    title: normalizedTitle,
  });
}

export async function registerMangaPornographyAssessment(
  input: MangaPornographyAssessmentRegistrationInput,
  dependencies: CommonDependencies = {}
): Promise<RegisterMangaPornographyAssessmentResult> {
  const config = resolveConfig(dependencies.config);
  const policyLog = getPolicyLogger(dependencies);
  const now = getNow(dependencies);
  const identity = normalizeMangaPornographyIdentity(input);
  const identityKey = buildMangaPornographyIdentityKey(input);
  const inputFingerprint = buildMangaPornographyInputFingerprint({
    model: config.model,
    policyVersion: config.policyVersion,
    thumbnailUrl: input.thumbnailUrl,
    title: input.title,
  });
  const delegate = getDelegate(dependencies.dbClient);

  if (!delegate) {
    policyLog.warn({
      message: 'Pornography assessment storage is unavailable',
      scope: 'content-policy',
      type: 'pornography_assessment_unavailable',
    });
    return {
      assessmentId: null,
      identityKey,
      inputFingerprint,
      shouldSchedule: false,
      status: 'unavailable',
    };
  }

  const displayValues = {
    extensionName: normalizeOptionalText(input.extensionName),
    extensionPackageName: normalizeOptionalText(input.extensionPackageName),
    mangaUrl: normalizeOptionalText(input.mangaUrl),
    sourceId: normalizeOptionalText(input.sourceId),
    sourceName: normalizeOptionalText(input.sourceName),
    thumbnailUrl: normalizeOptionalText(input.thumbnailUrl),
    title: input.title.trim(),
  };

  const existingOrCreated = await delegate.upsert({
    create: {
      ...displayValues,
      identityKey,
      inputFingerprint,
      lastSeenAt: now,
      model: config.model,
      normalizedTitle: identity.normalizedTitle,
      policyVersion: config.policyVersion,
    },
    update: {
      ...displayValues,
      lastSeenAt: now,
      normalizedTitle: identity.normalizedTitle,
    },
    where: { identityKey },
  });

  const fingerprintChanged =
    existingOrCreated.inputFingerprint !== inputFingerprint;
  if (fingerprintChanged) {
    await delegate.updateMany({
      data: {
        ...displayValues,
        attemptCount: 0,
        classifiedAt: null,
        imageInputIncluded: false,
        inputFingerprint,
        lastAttemptAt: null,
        lastErrorAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        model: config.model,
        nextAttemptAt: null,
        normalizedTitle: identity.normalizedTitle,
        policyVersion: config.policyVersion,
        processingLeaseExpiresAt: null,
        processingStartedAt: null,
        providerRequestId: null,
        resultPayload: Prisma.DbNull,
        sexualAppliedInputTypes: [],
        sexualFlag: null,
        sexualScore: null,
        status: 'pending',
        verdict: null,
      },
      where: {
        id: existingOrCreated.id,
        inputFingerprint: existingOrCreated.inputFingerprint,
      },
    });
  }

  const assessment = await delegate.findUnique({
    where: { identityKey },
  });

  if (!assessment) {
    policyLog.warn({
      assessmentId: existingOrCreated.id,
      message: 'Pornography assessment disappeared after registration',
      scope: 'content-policy',
      type: 'pornography_assessment_unavailable',
    });
    return {
      assessmentId: null,
      identityKey,
      inputFingerprint,
      shouldSchedule: false,
      status: 'unavailable',
    };
  }

  const automationSettings = await resolveAutomationSettings(
    dependencies,
    config
  );
  const shouldSchedule =
    automationSettings.enabled &&
    isAssessmentReadyToProcess(assessment, config, now);

  policyLog.debug?.({
    assessmentId: assessment.id,
    automationEnabled: automationSettings.enabled,
    fingerprintChanged,
    imageCandidatePresent: Boolean(assessment.thumbnailUrl),
    message: 'Pornography assessment registration resolved',
    model: assessment.model,
    policyVersion: assessment.policyVersion,
    scope: 'content-policy',
    shouldSchedule,
    status: assessment.status,
    type: 'pornography_assessment_registered',
  });

  if (
    !fingerprintChanged &&
    (assessment.status === 'completed' || assessment.manualDecision !== null)
  ) {
    policyLog.debug?.({
      assessmentId: assessment.id,
      manualDecisionPresent: assessment.manualDecision !== null,
      message: 'Reusing cached pornography assessment',
      scope: 'content-policy',
      status: assessment.status,
      type: 'pornography_assessment_cache_hit',
      verdict: assessment.verdict,
    });
  }

  return {
    assessmentId: assessment.id,
    identityKey,
    inputFingerprint: assessment.inputFingerprint,
    shouldSchedule,
    status: assessment.status,
  };
}

export async function processMangaPornographyAssessment(
  input: { assessmentId: string },
  dependencies: CommonDependencies & { moderator?: Moderator } = {}
): Promise<ProcessMangaPornographyAssessmentResult> {
  const config = resolveConfig(dependencies.config);
  const policyLog = getPolicyLogger(dependencies);
  const automationSettings = await resolveAutomationSettings(
    dependencies,
    config
  );
  if (!automationSettings.enabled) {
    policyLog.debug?.({
      assessmentId: input.assessmentId,
      message: 'Pornography automation is disabled',
      scope: 'content-policy',
      stage: 'process',
      type: 'pornography_policy_automation_disabled',
    });
    return { assessmentId: input.assessmentId, outcome: 'disabled' };
  }

  const delegate = getDelegate(dependencies.dbClient);
  if (!delegate) {
    policyLog.warn({
      assessmentId: input.assessmentId,
      message: 'Pornography assessment storage is unavailable',
      scope: 'content-policy',
      stage: 'process',
      type: 'pornography_assessment_unavailable',
    });
    return { assessmentId: input.assessmentId, outcome: 'unavailable' };
  }

  const now = getNow(dependencies);
  const leaseExpiresAt = new Date(now.getTime() + config.leaseDurationMs);
  const claimed = await delegate.updateMany({
    data: {
      attemptCount: { increment: 1 },
      lastAttemptAt: now,
      nextAttemptAt: null,
      processingLeaseExpiresAt: leaseExpiresAt,
      processingStartedAt: now,
      status: 'processing',
    },
    where: {
      attemptCount: { lt: config.maxAttempts },
      id: input.assessmentId,
      OR: [
        { status: 'pending' },
        {
          status: 'retryable_error',
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        {
          status: 'processing',
          OR: [
            { processingLeaseExpiresAt: null },
            { processingLeaseExpiresAt: { lte: now } },
          ],
        },
      ],
    },
  });

  if (claimed.count !== 1) {
    policyLog.debug?.({
      assessmentId: input.assessmentId,
      message: 'Pornography assessment claim skipped',
      reason: 'not_eligible_or_already_claimed',
      scope: 'content-policy',
      type: 'pornography_assessment_claim_skipped',
    });
    return { assessmentId: input.assessmentId, outcome: 'not_claimed' };
  }

  const assessment = await delegate.findUnique({
    where: { id: input.assessmentId },
  });
  if (!assessment) {
    policyLog.warn({
      assessmentId: input.assessmentId,
      message: 'Claimed pornography assessment no longer exists',
      reason: 'assessment_missing_after_claim',
      scope: 'content-policy',
      type: 'pornography_moderation_result_discarded',
    });
    return { assessmentId: input.assessmentId, outcome: 'stale' };
  }

  const claimIdentity = {
    attemptCount: assessment.attemptCount,
    inputFingerprint: assessment.inputFingerprint,
    processingStartedAt: assessment.processingStartedAt,
  };
  const moderationStartedAt = getMonotonicNow(dependencies);

  policyLog.debug?.({
    assessmentId: assessment.id,
    attemptCount: assessment.attemptCount,
    leaseDurationMs: config.leaseDurationMs,
    message: 'Pornography assessment claimed',
    scope: 'content-policy',
    type: 'pornography_assessment_claimed',
  });
  policyLog.info({
    assessmentId: assessment.id,
    attemptCount: assessment.attemptCount,
    imageCandidatePresent: Boolean(assessment.thumbnailUrl),
    message: 'OpenAI pornography moderation started',
    model: assessment.model,
    scope: 'content-policy',
    timeoutMs: config.timeoutMs,
    type: 'pornography_moderation_started',
  });

  try {
    const moderator = dependencies.moderator ?? moderateMangaPornography;
    const result = await moderator(
      {
        imageUrl: assessment.thumbnailUrl,
        title: assessment.title,
      },
      {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: assessment.model,
        timeoutMs: config.timeoutMs,
      }
    );
    const verdict = classifyModerationResult(result, config);
    const classifiedAt = getNow(dependencies);
    const saved = await delegate.updateMany({
      data: {
        classifiedAt,
        imageInputIncluded: result.imageIncluded,
        lastErrorAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        nextAttemptAt: null,
        processingLeaseExpiresAt: null,
        processingStartedAt: null,
        providerRequestId: result.id,
        resultPayload: buildSafeResultPayload(result),
        sexualAppliedInputTypes: result.sexualAppliedInputTypes,
        sexualFlag: result.sexual,
        sexualScore: result.sexualScore,
        status: 'completed',
        verdict,
      },
      where: {
        ...claimIdentity,
        id: assessment.id,
        status: 'processing',
      },
    });

    if (saved.count !== 1) {
      policyLog.warn({
        assessmentId: assessment.id,
        attemptCount: assessment.attemptCount,
        durationMs: getDurationMs(moderationStartedAt, dependencies),
        message: 'Discarded stale pornography moderation result',
        reason: 'stale_claim',
        scope: 'content-policy',
        type: 'pornography_moderation_result_discarded',
      });
      return { assessmentId: assessment.id, outcome: 'stale' };
    }

    policyLog.info({
      assessmentId: assessment.id,
      attemptCount: assessment.attemptCount,
      durationMs: getDurationMs(moderationStartedAt, dependencies),
      imageInputIncluded: result.imageIncluded,
      message: 'OpenAI pornography moderation completed',
      scope: 'content-policy',
      sexualAppliedInputTypes: result.sexualAppliedInputTypes,
      sexualFlag: result.sexual,
      sexualScore: result.sexualScore,
      type: 'pornography_moderation_completed',
      verdict,
    });

    return {
      assessmentId: assessment.id,
      outcome: 'completed',
      sexualScore: result.sexualScore,
      verdict,
    };
  } catch (error) {
    const processingResult = await recordProcessingError({
      assessment,
      claimIdentity,
      config,
      delegate,
      error,
      now: getNow(dependencies),
    });
    const safeError = getSafeProcessingError(error);
    const logPayload = {
      assessmentId: assessment.id,
      attemptCount: assessment.attemptCount,
      durationMs: getDurationMs(moderationStartedAt, dependencies),
      errorCode: safeError.code,
      httpStatus: safeError.statusCode,
      message: 'OpenAI pornography moderation failed',
      outcome: processingResult.outcome,
      retryable: safeError.retryable,
      scope: 'content-policy',
      type: 'pornography_moderation_failed',
      ...(processingResult.outcome === 'retry_scheduled'
        ? { nextAttemptAt: processingResult.nextAttemptAt }
        : {}),
    };

    if (processingResult.outcome === 'permanent_error') {
      policyLog.error(logPayload);
    } else {
      policyLog.warn(logPayload);
    }

    return processingResult;
  }
}

export function classifyModerationResult(
  result: Pick<
    OpenAIPornographyModerationResult,
    'imageIncluded' | 'sexual' | 'sexualAppliedInputTypes' | 'sexualScore'
  >,
  config: Pick<
    MangaPornographyPolicyConfig,
    'blockThreshold' | 'reviewThreshold'
  >
): MangaPornographyAssessmentVerdict {
  if (result.sexual && result.sexualScore >= config.blockThreshold) {
    return 'block';
  }

  if (
    result.sexual ||
    result.sexualScore >= config.reviewThreshold ||
    !result.imageIncluded ||
    !result.sexualAppliedInputTypes.includes('image')
  ) {
    return 'review';
  }

  return 'no_explicit_signal';
}

export async function getMangaPornographyPolicyDecision(
  identity: MangaPornographyIdentityInput,
  dependencies: Pick<
    CommonDependencies,
    'automationSettings' | 'config' | 'dbClient'
  > = {}
): Promise<MangaPornographyPolicyDecision | null> {
  const delegate = getDelegate(dependencies.dbClient);
  if (!delegate) {
    return null;
  }

  const assessment = await delegate.findUnique({
    where: {
      identityKey: buildMangaPornographyIdentityKey(identity),
    },
  });

  if (!assessment) {
    return null;
  }

  const config = resolveConfig(dependencies.config);
  const automationSettings = await resolveAutomationSettings(
    dependencies,
    config
  );

  return applyAutomationSetting(
    buildPolicyDecision(assessment),
    automationSettings.enabled
  );
}

export async function waitForMangaPornographyPolicyDecision(
  identity: MangaPornographyIdentityInput,
  dependencies: CommonDependencies & {
    moderator?: Moderator;
    pollIntervalMs?: number;
    sleep?: (milliseconds: number) => Promise<void>;
    timeoutMs?: number;
  } = {}
): Promise<MangaPornographyPolicyDecision | null> {
  const config = resolveConfig(dependencies.config);
  const policyLog = getPolicyLogger(dependencies);
  const automationSettings = await resolveAutomationSettings(
    dependencies,
    config
  );
  const timeoutMs = Math.min(
    25_000,
    Math.max(
      0,
      dependencies.timeoutMs ??
        envServer.OPENAI_PORNOGRAPHY_MODERATION_GATE_WAIT_MS
    )
  );
  const pollIntervalMs = Math.max(
    10,
    dependencies.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  );
  const sleep = dependencies.sleep ?? defaultSleep;
  const startedAt = getNow(dependencies).getTime();
  let processingTask: Promise<void> | null = null;
  let recoveryAttempted = false;

  while (true) {
    let decision: MangaPornographyPolicyDecision | null;
    try {
      decision = await getMangaPornographyPolicyDecision(identity, {
        automationSettings,
        config,
        dbClient: dependencies.dbClient,
      });
    } catch (error) {
      policyLog.warn({
        ...getSafeMangaPornographyLogError(error),
        message: 'Pornography policy lookup failed',
        scope: 'content-policy',
        type: 'pornography_policy_lookup_failed',
      });
      return null;
    }

    if (!automationSettings.enabled) {
      policyLog.debug?.({
        assessmentId: decision?.assessmentId,
        cachedVerdictPresent: decision?.verdict != null,
        manualDecisionPresent: decision?.manualDecision != null,
        message: 'Pornography automation is disabled',
        scope: 'content-policy',
        stage: 'gate',
        type: 'pornography_policy_automation_disabled',
      });
      return decision;
    }

    if (!decision) {
      if (recoveryAttempted) {
        return null;
      }

      recoveryAttempted = true;
      try {
        if (!(await recoverAssessmentFromLatestVisit(identity, dependencies))) {
          policyLog.debug?.({
            message:
              'No matching visit found for pornography assessment recovery',
            scope: 'content-policy',
            type: 'pornography_assessment_recovery_miss',
          });
          return null;
        }
      } catch (error) {
        policyLog.warn({
          ...getSafeMangaPornographyLogError(error),
          message: 'Pornography assessment recovery failed',
          scope: 'content-policy',
          type: 'pornography_assessment_recovery_failed',
        });
        return null;
      }
      continue;
    }

    if (!decision.pending || decision.manualDecision) {
      const decisionLog = {
        assessmentId: decision.assessmentId,
        blocked: decision.blocked,
        effectiveDecision: decision.effectiveDecision,
        manualDecisionPresent: decision.manualDecision !== null,
        message: 'Pornography policy decision resolved',
        scope: 'content-policy',
        status: decision.status,
        type: 'pornography_policy_decision_resolved',
        verdict: decision.verdict,
      };

      if (decision.blocked) {
        policyLog.info({
          ...decisionLog,
          message: 'Pornography policy block enforced',
          type: 'pornography_policy_block_enforced',
        });
      } else {
        policyLog.debug?.(decisionLog);
      }
      return decision;
    }

    const currentTime = getNow(dependencies);
    const elapsed = currentTime.getTime() - startedAt;
    if (elapsed >= timeoutMs) {
      policyLog.warn({
        assessmentId: decision.assessmentId,
        attemptCount: decision.attemptCount,
        message: 'Timed out waiting for pornography policy decision',
        scope: 'content-policy',
        status: decision.status,
        timeoutMs,
        type: 'pornography_policy_wait_timeout',
      });
      return decision;
    }

    if (!processingTask && isDecisionReadyToProcess(decision, currentTime)) {
      processingTask = processMangaPornographyAssessment(
        { assessmentId: decision.assessmentId },
        dependencies
      )
        .catch((error) => {
          policyLog.error({
            ...getSafeMangaPornographyLogError(error),
            assessmentId: decision.assessmentId,
            message: 'Pornography policy processing task failed unexpectedly',
            scope: 'content-policy',
            type: 'pornography_policy_processing_task_failed',
          });
        })
        .then(() => undefined)
        .finally(() => {
          processingTask = null;
        });
    }

    const waitMs = Math.min(pollIntervalMs, timeoutMs - elapsed);
    if (processingTask) {
      await Promise.race([processingTask, sleep(waitMs)]);
    } else {
      await sleep(waitMs);
    }
  }
}

export async function backfillMangaPornographyAssessments(
  input: { limit?: number } = {},
  dependencies: CommonDependencies = {}
) {
  const dbClient = dependencies.dbClient ?? db;
  const visitDelegate = dbClient.deviceMangaVisit;
  if (!visitDelegate?.findMany || !getDelegate(dbClient)) {
    return {
      registered: 0,
      scanned: 0,
      scheduledAssessmentIds: [] as string[],
    };
  }

  const limit = Math.min(200, Math.max(1, Math.trunc(input.limit ?? 100)));
  const visits = await visitDelegate.findMany({
    orderBy: [{ lastVisitedAt: 'desc' }, { id: 'desc' }],
    select: {
      extensionName: true,
      extensionPackageName: true,
      mangaUrl: true,
      sourceId: true,
      sourceName: true,
      thumbnailUrl: true,
      title: true,
    },
    take: limit,
  });
  const registeredAssessmentIds = new Set<string>();
  const scheduledAssessmentIds = new Set<string>();
  const seenIdentityKeys = new Set<string>();
  const config = resolveConfig(dependencies.config);
  const automationSettings = await resolveAutomationSettings(
    dependencies,
    config
  );
  const scopedDependencies = { ...dependencies, automationSettings };

  for (const visit of visits) {
    const identityKey = buildMangaPornographyIdentityKey({
      mangaTitle: visit.title,
      sourceId: visit.sourceId,
      sourceName: visit.sourceName,
    });
    if (seenIdentityKeys.has(identityKey)) {
      continue;
    }
    seenIdentityKeys.add(identityKey);

    const registration = await registerMangaPornographyAssessment(
      {
        extensionName: visit.extensionName,
        extensionPackageName: visit.extensionPackageName,
        mangaUrl: visit.mangaUrl,
        sourceId: visit.sourceId,
        sourceName: visit.sourceName,
        thumbnailUrl: visit.thumbnailUrl,
        title: visit.title,
      },
      scopedDependencies
    );

    if (registration.assessmentId) {
      registeredAssessmentIds.add(registration.assessmentId);
      if (registration.shouldSchedule) {
        scheduledAssessmentIds.add(registration.assessmentId);
      }
    }
  }

  return {
    registered: registeredAssessmentIds.size,
    scanned: visits.length,
    scheduledAssessmentIds: [...scheduledAssessmentIds],
  };
}

async function recoverAssessmentFromLatestVisit(
  identity: MangaPornographyIdentityInput,
  dependencies: CommonDependencies
) {
  const dbClient = dependencies.dbClient ?? db;
  const findFirst = dbClient.deviceMangaVisit?.findFirst;
  if (!findFirst || !getDelegate(dbClient)) {
    return false;
  }

  const title = normalizeOptionalText(identity.mangaTitle ?? identity.title);
  const sourceId = normalizeOptionalText(identity.sourceId);
  const sourceName = normalizeOptionalText(identity.sourceName);
  if (!title || (!sourceId && !sourceName)) {
    return false;
  }

  const visit = await findFirst({
    orderBy: [{ lastVisitedAt: 'desc' }, { id: 'desc' }],
    select: {
      extensionName: true,
      extensionPackageName: true,
      mangaUrl: true,
      sourceId: true,
      sourceName: true,
      thumbnailUrl: true,
      title: true,
    },
    where: {
      sourceId: sourceId ?? undefined,
      sourceName: sourceId
        ? undefined
        : { equals: sourceName ?? '', mode: 'insensitive' },
      title: { equals: title, mode: 'insensitive' },
    },
  });
  if (!visit) {
    return false;
  }

  const registration = await registerMangaPornographyAssessment(
    {
      extensionName: visit.extensionName,
      extensionPackageName: visit.extensionPackageName,
      mangaUrl: visit.mangaUrl,
      sourceId: visit.sourceId,
      sourceName: visit.sourceName,
      thumbnailUrl: visit.thumbnailUrl,
      title: visit.title,
    },
    dependencies
  );

  return registration.assessmentId !== null;
}

export async function listMangaPornographyAssessments(
  input: {
    cursor?: string | null;
    search?: string | null;
    status?: MangaPornographyAssessmentStatus | null;
    take?: number;
    verdict?: MangaPornographyAssessmentVerdict | null;
  } = {},
  dependencies: Pick<CommonDependencies, 'dbClient'> = {}
) {
  const delegate = getDelegate(dependencies.dbClient);
  const take = Math.min(100, Math.max(1, input.take ?? 50));
  if (!delegate) {
    return { items: [] as MangaPornographyAssessment[], nextCursor: null };
  }

  const search = input.search?.trim();
  const items = await delegate.findMany({
    cursor: input.cursor ? { id: input.cursor } : undefined,
    orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
    skip: input.cursor ? 1 : undefined,
    take: take + 1,
    where: {
      status: input.status ?? undefined,
      verdict: input.verdict ?? undefined,
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { sourceName: { contains: search, mode: 'insensitive' } },
            { extensionName: { contains: search, mode: 'insensitive' } },
            {
              extensionPackageName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    },
  });
  const hasMore = items.length > take;
  const visibleItems = hasMore ? items.slice(0, take) : items;

  return {
    items: visibleItems,
    nextCursor: hasMore ? (visibleItems.at(-1)?.id ?? null) : null,
  };
}

export async function updateMangaPornographyManualDecision(
  input: {
    assessmentId: string;
    decision: MangaPornographyManualDecision | null;
    reason?: string | null;
    reviewerId?: string | null;
  },
  dependencies: Pick<CommonDependencies, 'dbClient' | 'now'> = {}
) {
  const delegate = getDelegate(dependencies.dbClient);
  if (!delegate) {
    return null;
  }

  const decision = input.decision;
  return await delegate.update({
    data: {
      manualDecidedAt: decision ? getNow(dependencies) : null,
      manualDecision: decision,
      manualReason: decision ? normalizeOptionalText(input.reason) : null,
      manualReviewerId: decision
        ? normalizeOptionalText(input.reviewerId)
        : null,
    },
    where: { id: input.assessmentId },
  });
}

export async function retryMangaPornographyAssessment(
  input: { assessmentId: string },
  dependencies: CommonDependencies = {}
) {
  const delegate = getDelegate(dependencies.dbClient);
  if (!delegate) {
    return {
      assessment: null,
      shouldSchedule: false,
    };
  }

  const config = resolveConfig(dependencies.config);
  const automationSettings = await resolveAutomationSettings(
    dependencies,
    config
  );

  // A retry is destructive to the cached provider result. Preserve that
  // result while automation is paused instead of clearing it into a pending
  // state that cannot be scheduled.
  if (!automationSettings.enabled) {
    return {
      assessment: await delegate.findUnique({
        where: { id: input.assessmentId },
      }),
      shouldSchedule: false,
    };
  }

  const assessment = await delegate.update({
    data: {
      attemptCount: 0,
      classifiedAt: null,
      imageInputIncluded: false,
      lastAttemptAt: null,
      lastErrorAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      nextAttemptAt: null,
      processingLeaseExpiresAt: null,
      processingStartedAt: null,
      providerRequestId: null,
      resultPayload: Prisma.DbNull,
      sexualAppliedInputTypes: [],
      sexualFlag: null,
      sexualScore: null,
      status: 'pending',
      verdict: null,
    },
    where: { id: input.assessmentId },
  });

  return {
    assessment,
    shouldSchedule: true,
  };
}

function getDelegate(dbClient?: MangaPornographyPolicyDbClient) {
  return (dbClient ?? db).mangaPornographyAssessment;
}

async function resolveAutomationSettings(
  dependencies: Pick<CommonDependencies, 'automationSettings' | 'dbClient'>,
  config: Pick<MangaPornographyPolicyConfig, 'enabled'>
) {
  return (
    dependencies.automationSettings ??
    (await getMangaPornographyAutomationSettings({
      dbClient: dependencies.dbClient,
      defaultEnabled: config.enabled,
    }))
  );
}

function resolveConfig(
  overrides: Partial<MangaPornographyPolicyConfig> | undefined
): MangaPornographyPolicyConfig {
  const timeoutMs =
    overrides?.timeoutMs ?? envServer.OPENAI_PORNOGRAPHY_MODERATION_TIMEOUT_MS;

  return {
    apiKey: overrides?.apiKey ?? envServer.OPENAI_API_KEY ?? '',
    baseUrl: overrides?.baseUrl ?? envServer.OPENAI_BASE_URL,
    blockThreshold:
      overrides?.blockThreshold ??
      envServer.OPENAI_PORNOGRAPHY_MODERATION_BLOCK_THRESHOLD,
    enabled:
      overrides?.enabled ?? envServer.OPENAI_PORNOGRAPHY_MODERATION_ENABLED,
    leaseDurationMs:
      overrides?.leaseDurationMs ?? timeoutMs + DEFAULT_LEASE_BUFFER_MS,
    maxAttempts:
      overrides?.maxAttempts ??
      envServer.OPENAI_PORNOGRAPHY_MODERATION_MAX_ATTEMPTS,
    model: overrides?.model ?? envServer.OPENAI_PORNOGRAPHY_MODERATION_MODEL,
    policyVersion:
      overrides?.policyVersion ??
      envServer.OPENAI_PORNOGRAPHY_MODERATION_POLICY_VERSION,
    retryBaseDelayMs:
      overrides?.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
    reviewThreshold:
      overrides?.reviewThreshold ??
      envServer.OPENAI_PORNOGRAPHY_MODERATION_REVIEW_THRESHOLD,
    timeoutMs,
  };
}

function isAssessmentReadyToProcess(
  assessment: MangaPornographyAssessment,
  config: MangaPornographyPolicyConfig,
  now: Date
) {
  if (assessment.attemptCount >= config.maxAttempts) {
    return false;
  }

  if (assessment.status === 'pending') {
    return true;
  }

  if (assessment.status === 'retryable_error') {
    return !assessment.nextAttemptAt || assessment.nextAttemptAt <= now;
  }

  return (
    assessment.status === 'processing' &&
    (!assessment.processingLeaseExpiresAt ||
      assessment.processingLeaseExpiresAt <= now)
  );
}

function buildPolicyDecision(
  assessment: MangaPornographyAssessment
): MangaPornographyPolicyDecision {
  const pending =
    assessment.status === 'pending' ||
    assessment.status === 'processing' ||
    assessment.status === 'retryable_error';

  if (assessment.manualDecision === 'block') {
    return {
      assessmentId: assessment.id,
      attemptCount: assessment.attemptCount,
      blocked: true,
      effectiveDecision: 'block',
      manualDecision: assessment.manualDecision,
      nextAttemptAt: assessment.nextAttemptAt,
      pending,
      processingLeaseExpiresAt: assessment.processingLeaseExpiresAt,
      status: assessment.status,
      verdict: assessment.verdict,
    };
  }

  if (assessment.manualDecision === 'allow') {
    return {
      assessmentId: assessment.id,
      attemptCount: assessment.attemptCount,
      blocked: false,
      effectiveDecision: 'allow',
      manualDecision: assessment.manualDecision,
      nextAttemptAt: assessment.nextAttemptAt,
      pending,
      processingLeaseExpiresAt: assessment.processingLeaseExpiresAt,
      status: assessment.status,
      verdict: assessment.verdict,
    };
  }

  const effectiveStatus = resolveMangaPornographyEffectiveStatus(assessment);
  const blocked = effectiveStatus === 'blocked';
  const effectiveDecision =
    effectiveStatus === 'allowed'
      ? 'allow'
      : effectiveStatus === 'blocked'
        ? 'block'
        : effectiveStatus === 'errors'
          ? 'error'
          : effectiveStatus;

  return {
    assessmentId: assessment.id,
    attemptCount: assessment.attemptCount,
    blocked,
    effectiveDecision,
    manualDecision: null,
    nextAttemptAt: assessment.nextAttemptAt,
    pending,
    processingLeaseExpiresAt: assessment.processingLeaseExpiresAt,
    status: assessment.status,
    verdict: assessment.verdict,
  };
}

function applyAutomationSetting(
  decision: MangaPornographyPolicyDecision,
  automationEnabled: boolean
): MangaPornographyPolicyDecision {
  if (automationEnabled || decision.manualDecision) {
    return decision;
  }

  return {
    ...decision,
    blocked: false,
    effectiveDecision: 'allow',
  };
}

export function resolveMangaPornographyEffectiveStatus(
  assessment: Pick<
    MangaPornographyAssessment,
    'manualDecision' | 'status' | 'verdict'
  >
): MangaPornographyEffectiveStatus {
  if (assessment.manualDecision === 'block') {
    return 'blocked';
  }

  if (assessment.manualDecision === 'allow') {
    return 'allowed';
  }

  if (assessment.status === 'pending' || assessment.status === 'processing') {
    return 'pending';
  }

  if (
    assessment.status === 'retryable_error' ||
    assessment.status === 'permanent_error'
  ) {
    return 'errors';
  }

  if (assessment.verdict === 'block') {
    return 'blocked';
  }

  if (assessment.verdict === 'review') {
    return 'review';
  }

  return assessment.verdict === 'no_explicit_signal' ? 'allowed' : 'errors';
}

function isDecisionReadyToProcess(
  decision: MangaPornographyPolicyDecision,
  now: Date
) {
  if (decision.status === 'pending') {
    return true;
  }

  if (decision.status === 'retryable_error') {
    return !decision.nextAttemptAt || decision.nextAttemptAt <= now;
  }

  return (
    decision.status === 'processing' &&
    (!decision.processingLeaseExpiresAt ||
      decision.processingLeaseExpiresAt <= now)
  );
}

function buildSafeResultPayload(
  result: OpenAIPornographyModerationResult
): Prisma.InputJsonObject {
  return {
    imageInputIncluded: result.imageIncluded,
    sexualAppliedInputTypes: result.sexualAppliedInputTypes,
    sexualFlag: result.sexual,
    sexualScore: result.sexualScore,
  };
}

async function recordProcessingError(input: {
  assessment: MangaPornographyAssessment;
  claimIdentity: {
    attemptCount: number;
    inputFingerprint: string;
    processingStartedAt: Date | null;
  };
  config: MangaPornographyPolicyConfig;
  delegate: AssessmentDelegate;
  error: unknown;
  now: Date;
}): Promise<ProcessMangaPornographyAssessmentResult> {
  const safeError = getSafeProcessingError(input.error);
  const canRetry =
    safeError.retryable &&
    input.assessment.attemptCount < input.config.maxAttempts;
  const nextAttemptAt = canRetry
    ? new Date(
        input.now.getTime() +
          getRetryDelayMs(
            input.assessment.attemptCount,
            input.config.retryBaseDelayMs
          )
      )
    : null;
  const saved = await input.delegate.updateMany({
    data: {
      lastErrorAt: input.now,
      lastErrorCode: safeError.code,
      lastErrorMessage: safeError.message,
      nextAttemptAt,
      processingLeaseExpiresAt: null,
      processingStartedAt: null,
      status: canRetry ? 'retryable_error' : 'permanent_error',
      verdict: null,
    },
    where: {
      ...input.claimIdentity,
      id: input.assessment.id,
      status: 'processing',
    },
  });

  if (saved.count !== 1) {
    return { assessmentId: input.assessment.id, outcome: 'stale' };
  }

  return {
    assessmentId: input.assessment.id,
    attemptCount: input.assessment.attemptCount,
    errorCode: safeError.code,
    nextAttemptAt,
    outcome: canRetry ? 'retry_scheduled' : 'permanent_error',
  };
}

function getSafeProcessingError(error: unknown) {
  if (error instanceof OpenAIPornographyModerationError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      statusCode: error.statusCode,
    };
  }

  return {
    code: 'unexpected_error',
    message: 'Pornography moderation processing failed.',
    retryable: true,
    statusCode: undefined,
  };
}

export function getSafeMangaPornographyLogError(error: unknown): {
  errorCode?: string;
  errorName: string;
} {
  const errorName =
    error instanceof Error && SAFE_LOG_ERROR_NAMES.has(error.name)
      ? error.name
      : 'UnknownError';
  const candidateCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;

  return {
    ...(typeof candidateCode === 'string' && isSafeLogErrorCode(candidateCode)
      ? { errorCode: candidateCode }
      : {}),
    errorName,
  };
}

function isSafeLogErrorCode(value: string) {
  return (
    /^P\d{4}$/.test(value) ||
    /^E[A-Z0-9_]{1,31}$/.test(value) ||
    [
      'configuration_error',
      'http_error',
      'malformed_response',
      'request_failed',
      'timeout',
      'unexpected_error',
    ].includes(value)
  );
}

function getRetryDelayMs(attemptCount: number, baseDelayMs: number) {
  return Math.min(
    MAX_RETRY_DELAY_MS,
    Math.max(0, baseDelayMs) * 2 ** Math.max(0, attemptCount - 1)
  );
}

function normalizeIdentityText(value: string | null | undefined) {
  return (
    value
      ?.normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('en-US') || null
  );
}

function normalizeFingerprintUrl(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return `${url.protocol}//${url.host.toLocaleLowerCase('en-US')}${url.pathname}`;
  } catch {
    return null;
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function hashJson(value: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function getNow(dependencies: { now?: () => Date }) {
  return dependencies.now?.() ?? new Date();
}

function getMonotonicNow(dependencies: { monotonicNow?: () => number }) {
  return dependencies.monotonicNow?.() ?? performance.now();
}

function getDurationMs(
  startedAt: number,
  dependencies: { monotonicNow?: () => number }
) {
  return Math.max(0, Math.round(getMonotonicNow(dependencies) - startedAt));
}

function getPolicyLogger(dependencies: { log?: MangaPornographyPolicyLogger }) {
  return dependencies.log ?? logger;
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
