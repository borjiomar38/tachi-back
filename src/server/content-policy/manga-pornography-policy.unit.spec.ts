import { describe, expect, it, vi } from 'vitest';

import type { MangaPornographyAssessment } from '@/server/db/generated/client';

import {
  backfillMangaPornographyAssessments,
  buildMangaPornographyIdentityKey,
  buildMangaPornographyInputFingerprint,
  classifyModerationResult,
  getMangaPornographyPolicyDecision,
  getSafeMangaPornographyLogError,
  type MangaPornographyPolicyConfig,
  type MangaPornographyPolicyDbClient,
  processMangaPornographyAssessment,
  registerMangaPornographyAssessment,
  resolveMangaPornographyEffectiveStatus,
  retryMangaPornographyAssessment,
  waitForMangaPornographyPolicyDecision,
} from './manga-pornography-policy';
import { OpenAIPornographyModerationError } from './openai-pornography-moderation';

const NOW = new Date('2026-08-09T12:00:00.000Z');
const CONFIG: MangaPornographyPolicyConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1',
  blockThreshold: 0.9,
  enabled: true,
  leaseDurationMs: 30_000,
  maxAttempts: 3,
  model: 'omni-moderation-2024-09-26',
  policyVersion: 'test-policy-v1',
  retryBaseDelayMs: 5_000,
  reviewThreshold: 0.15,
  timeoutMs: 1_000,
};

const buildAssessment = (
  overrides: Partial<MangaPornographyAssessment> = {}
): MangaPornographyAssessment => ({
  attemptCount: 0,
  classifiedAt: null,
  createdAt: NOW,
  extensionName: 'Example extension',
  extensionPackageName: 'com.example.extension',
  firstSeenAt: NOW,
  id: 'assessment-1',
  identityKey: 'identity-1',
  imageInputIncluded: false,
  inputFingerprint: 'fingerprint-1',
  lastAttemptAt: null,
  lastErrorAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  lastSeenAt: NOW,
  mangaUrl: '/manga/example',
  manualDecidedAt: null,
  manualDecision: null,
  manualReason: null,
  manualReviewerId: null,
  model: CONFIG.model,
  nextAttemptAt: null,
  normalizedTitle: 'example manga',
  policyVersion: CONFIG.policyVersion,
  processingLeaseExpiresAt: null,
  processingStartedAt: null,
  providerRequestId: null,
  resultPayload: null,
  sexualAppliedInputTypes: [],
  sexualFlag: null,
  sexualScore: null,
  sourceId: '123',
  sourceName: 'Example source',
  status: 'pending',
  thumbnailUrl: 'https://cdn.example.com/example.jpg?token=secret',
  title: 'Example Manga',
  updatedAt: NOW,
  verdict: null,
  ...overrides,
});

const buildDbClient = (
  overrides: Partial<{
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  }> = {}
) => {
  const delegate = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    ...overrides,
  };

  return {
    dbClient: {
      mangaPornographyAssessment: delegate,
    } as unknown as MangaPornographyPolicyDbClient,
    delegate,
  };
};

const buildPolicyLog = () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
});

type PolicyLog = ReturnType<typeof buildPolicyLog>;
type PolicyLogLevel = keyof PolicyLog;

const expectPolicyLogEvent = (
  log: PolicyLog,
  level: PolicyLogLevel,
  type: string
) => {
  expect(
    log[level].mock.calls.some((call) =>
      call.some(
        (argument) =>
          typeof argument === 'object' &&
          argument !== null &&
          'type' in argument &&
          argument.type === type
      )
    )
  ).toBe(true);
};

const expectPolicyLogsNotToContain = (
  log: PolicyLog,
  sensitiveValues: readonly string[]
) => {
  const serializedCalls = JSON.stringify(
    Object.values(log).flatMap((method) => method.mock.calls)
  );

  for (const sensitiveValue of sensitiveValues) {
    expect(serializedCalls).not.toContain(sensitiveValue);
  }
};

const SENSITIVE_LOG_VALUES = [
  'SENSITIVE_TITLE_DO_NOT_LOG',
  'SENSITIVE_URL_TOKEN',
  'SENSITIVE_API_KEY',
  'SENSITIVE_SOURCE_ID',
  'SENSITIVE_SOURCE_NAME',
  'SENSITIVE_PACKAGE_NAME',
  'SENSITIVE_RAW_PROVIDER_PAYLOAD',
] as const;

const buildSensitiveAssessment = (
  overrides: Partial<MangaPornographyAssessment> = {}
) =>
  buildAssessment({
    extensionPackageName: 'SENSITIVE_PACKAGE_NAME',
    normalizedTitle: 'sensitive_title_do_not_log',
    resultPayload: { raw: 'SENSITIVE_RAW_PROVIDER_PAYLOAD' },
    sourceId: 'SENSITIVE_SOURCE_ID',
    sourceName: 'SENSITIVE_SOURCE_NAME',
    thumbnailUrl:
      'https://private.example.invalid/cover.jpg?token=SENSITIVE_URL_TOKEN',
    title: 'SENSITIVE_TITLE_DO_NOT_LOG',
    ...overrides,
  });

const withAutomationToggle = (
  dbClient: MangaPornographyPolicyDbClient,
  enabled: boolean
) =>
  ({
    ...dbClient,
    appConfig: {
      findUnique: vi.fn().mockResolvedValue({
        updatedAt: NOW,
        value: { enabled },
      }),
      upsert: vi.fn(),
    },
  }) as unknown as MangaPornographyPolicyDbClient;

describe('manga pornography policy identity', () => {
  it('normalizes title and source deterministically, preferring sourceId', () => {
    const first = buildMangaPornographyIdentityKey({
      mangaTitle: '  The\u00a0Hero  Returns ',
      sourceId: ' SOURCE-42 ',
      sourceName: 'Old source name',
    });
    const second = buildMangaPornographyIdentityKey({
      mangaTitle: 'the hero returns',
      sourceId: 'source-42',
      sourceName: 'Renamed source',
    });

    expect(first).toBe(second);
    expect(
      buildMangaPornographyIdentityKey({
        mangaTitle: 'the hero returns',
        sourceName: 'Another source',
      })
    ).not.toBe(
      buildMangaPornographyIdentityKey({
        mangaTitle: 'the hero returns',
        sourceName: 'Example source',
      })
    );
  });

  it('ignores signed URL query churn but changes for a different image path', () => {
    const build = (thumbnailUrl: string) =>
      buildMangaPornographyInputFingerprint({
        model: CONFIG.model,
        policyVersion: CONFIG.policyVersion,
        thumbnailUrl,
        title: 'Example Manga',
      });

    expect(
      build('https://CDN.example.com/covers/example.jpg?token=first#preview')
    ).toBe(
      build('https://cdn.example.com/covers/example.jpg?token=second&expires=2')
    );
    expect(build('https://cdn.example.com/covers/new.jpg')).not.toBe(
      build('https://cdn.example.com/covers/example.jpg')
    );
  });
});

describe('registerMangaPornographyAssessment', () => {
  it('is idempotent when the moderation fingerprint is unchanged', async () => {
    const input = {
      sourceId: '123',
      sourceName: 'Example source',
      thumbnailUrl: 'https://cdn.example.com/example.jpg?token=one',
      title: 'Example Manga',
    };
    const fingerprint = buildMangaPornographyInputFingerprint({
      model: CONFIG.model,
      policyVersion: CONFIG.policyVersion,
      thumbnailUrl: input.thumbnailUrl,
      title: input.title,
    });
    const assessment = buildAssessment({ inputFingerprint: fingerprint });
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(assessment),
      upsert: vi.fn().mockResolvedValue(assessment),
    });

    const result = await registerMangaPornographyAssessment(input, {
      config: CONFIG,
      dbClient,
      now: () => NOW,
    });

    expect(result).toMatchObject({
      assessmentId: assessment.id,
      inputFingerprint: fingerprint,
      shouldSchedule: true,
      status: 'pending',
    });
    expect(delegate.updateMany).not.toHaveBeenCalled();
  });

  it('logs when a completed shared assessment is reused without scheduling OpenAI', async () => {
    const input = {
      sourceId: '123',
      thumbnailUrl: 'https://cdn.example.com/example.jpg?token=rotated',
      title: 'Example Manga',
    };
    const inputFingerprint = buildMangaPornographyInputFingerprint({
      model: CONFIG.model,
      policyVersion: CONFIG.policyVersion,
      thumbnailUrl: input.thumbnailUrl,
      title: input.title,
    });
    const assessment = buildAssessment({
      inputFingerprint,
      status: 'completed',
      verdict: 'no_explicit_signal',
    });
    const log = buildPolicyLog();
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(assessment),
      upsert: vi.fn().mockResolvedValue(assessment),
    });

    await expect(
      registerMangaPornographyAssessment(input, {
        config: CONFIG,
        dbClient,
        log,
        now: () => NOW,
      })
    ).resolves.toMatchObject({
      assessmentId: assessment.id,
      shouldSchedule: false,
      status: 'completed',
    });

    expectPolicyLogEvent(log, 'debug', 'pornography_assessment_cache_hit');
  });

  it('resets only the AI state when title, image path, model, or policy changes', async () => {
    const input = {
      sourceId: '123',
      thumbnailUrl: 'https://cdn.example.com/new-cover.jpg',
      title: 'Example Manga',
    };
    const newFingerprint = buildMangaPornographyInputFingerprint({
      model: CONFIG.model,
      policyVersion: CONFIG.policyVersion,
      thumbnailUrl: input.thumbnailUrl,
      title: input.title,
    });
    const existing = buildAssessment({
      inputFingerprint: 'old-fingerprint',
      manualDecision: 'allow',
      status: 'completed',
      verdict: 'block',
    });
    const reset = buildAssessment({
      inputFingerprint: newFingerprint,
      manualDecision: 'allow',
      status: 'pending',
      verdict: null,
    });
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(reset),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue(existing),
    });

    const result = await registerMangaPornographyAssessment(input, {
      config: CONFIG,
      dbClient,
      now: () => NOW,
    });

    expect(result.shouldSchedule).toBe(true);
    expect(delegate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptCount: 0,
          inputFingerprint: newFingerprint,
          status: 'pending',
          verdict: null,
        }),
        where: {
          id: existing.id,
          inputFingerprint: existing.inputFingerprint,
        },
      })
    );
    const resetData = delegate.updateMany.mock.calls[0]?.[0]?.data;
    expect(resetData).not.toHaveProperty('manualDecision');
  });

  it('fails open when the Prisma delegate is absent', async () => {
    await expect(
      registerMangaPornographyAssessment(
        { sourceId: '123', title: 'Example Manga' },
        { config: CONFIG, dbClient: {} }
      )
    ).resolves.toMatchObject({
      assessmentId: null,
      shouldSchedule: false,
      status: 'unavailable',
    });
  });

  it('persists the assessment but does not schedule it when automation is off', async () => {
    const input = {
      sourceId: '123',
      thumbnailUrl: 'https://cdn.example.com/example.jpg',
      title: 'Example Manga',
    };
    const fingerprint = buildMangaPornographyInputFingerprint({
      model: CONFIG.model,
      policyVersion: CONFIG.policyVersion,
      thumbnailUrl: input.thumbnailUrl,
      title: input.title,
    });
    const assessment = buildAssessment({ inputFingerprint: fingerprint });
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(assessment),
      upsert: vi.fn().mockResolvedValue(assessment),
    });

    await expect(
      registerMangaPornographyAssessment(input, {
        config: CONFIG,
        dbClient: withAutomationToggle(dbClient, false),
        now: () => NOW,
      })
    ).resolves.toMatchObject({
      assessmentId: assessment.id,
      shouldSchedule: false,
      status: 'pending',
    });
  });
});

describe('moderation classification', () => {
  it('blocks only a positive sexual category at or above the block threshold', () => {
    expect(
      classifyModerationResult(
        {
          imageIncluded: true,
          sexual: true,
          sexualAppliedInputTypes: ['text', 'image'],
          sexualScore: 0.9,
        },
        CONFIG
      )
    ).toBe('block');
    expect(
      classifyModerationResult(
        {
          imageIncluded: true,
          sexual: false,
          sexualAppliedInputTypes: ['text', 'image'],
          sexualScore: 0.99,
        },
        CONFIG
      )
    ).toBe('review');
  });

  it('sends missing or unapplied images to review and allows a clean image result', () => {
    expect(
      classifyModerationResult(
        {
          imageIncluded: false,
          sexual: false,
          sexualAppliedInputTypes: ['text'],
          sexualScore: 0.01,
        },
        CONFIG
      )
    ).toBe('review');
    expect(
      classifyModerationResult(
        {
          imageIncluded: true,
          sexual: false,
          sexualAppliedInputTypes: ['text'],
          sexualScore: 0.01,
        },
        CONFIG
      )
    ).toBe('review');
    expect(
      classifyModerationResult(
        {
          imageIncluded: true,
          sexual: false,
          sexualAppliedInputTypes: ['text', 'image'],
          sexualScore: 0.01,
        },
        CONFIG
      )
    ).toBe('no_explicit_signal');
  });
});

describe('effective backoffice status', () => {
  it.each([
    ['block', 'pending', null, 'blocked'],
    ['allow', 'completed', 'block', 'allowed'],
    [null, 'pending', null, 'pending'],
    [null, 'processing', null, 'pending'],
    [null, 'retryable_error', null, 'errors'],
    [null, 'permanent_error', null, 'errors'],
    [null, 'completed', 'block', 'blocked'],
    [null, 'completed', 'review', 'review'],
    [null, 'completed', 'no_explicit_signal', 'allowed'],
  ] as const)(
    'resolves manual=%s status=%s verdict=%s to %s',
    (manualDecision, status, verdict, expected) => {
      expect(
        resolveMangaPornographyEffectiveStatus({
          manualDecision,
          status,
          verdict,
        })
      ).toBe(expected);
    }
  );
});

describe('processMangaPornographyAssessment', () => {
  it('returns disabled before claiming or calling the moderator', async () => {
    const moderator = vi.fn();
    const { dbClient, delegate } = buildDbClient();

    await expect(
      processMangaPornographyAssessment(
        { assessmentId: 'assessment-1' },
        {
          config: CONFIG,
          dbClient: withAutomationToggle(dbClient, false),
          moderator,
          now: () => NOW,
        }
      )
    ).resolves.toEqual({
      assessmentId: 'assessment-1',
      outcome: 'disabled',
    });
    expect(delegate.updateMany).not.toHaveBeenCalled();
    expect(moderator).not.toHaveBeenCalled();
  });

  it('claims atomically and saves only the sexual moderation signal', async () => {
    const claimedAssessment = buildAssessment({
      attemptCount: 1,
      processingLeaseExpiresAt: new Date(NOW.getTime() + 30_000),
      processingStartedAt: NOW,
      status: 'processing',
    });
    const moderator = vi.fn().mockResolvedValue({
      id: 'modr-123',
      imageIncluded: true,
      model: CONFIG.model,
      sexual: true,
      sexualAppliedInputTypes: ['text', 'image'],
      sexualScore: 0.97,
    });
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(claimedAssessment),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 }),
    });

    const result = await processMangaPornographyAssessment(
      { assessmentId: claimedAssessment.id },
      {
        config: CONFIG,
        dbClient,
        moderator,
        now: () => NOW,
      }
    );

    expect(result).toMatchObject({ outcome: 'completed', verdict: 'block' });
    expect(moderator).toHaveBeenCalledOnce();
    expect(delegate.updateMany.mock.calls[0]?.[0]).toMatchObject({
      data: {
        attemptCount: { increment: 1 },
        status: 'processing',
      },
      where: {
        attemptCount: { lt: CONFIG.maxAttempts },
        id: claimedAssessment.id,
      },
    });
    expect(delegate.updateMany.mock.calls[1]?.[0]).toMatchObject({
      data: {
        providerRequestId: 'modr-123',
        sexualFlag: true,
        sexualScore: 0.97,
        status: 'completed',
        verdict: 'block',
      },
      where: {
        attemptCount: 1,
        id: claimedAssessment.id,
        inputFingerprint: claimedAssessment.inputFingerprint,
        processingStartedAt: NOW,
        status: 'processing',
      },
    });
    expect(
      JSON.stringify(delegate.updateMany.mock.calls[1]?.[0])
    ).not.toContain('token=secret');
  });

  it('allows only one worker to call OpenAI for the same claim', async () => {
    const claimedAssessment = buildAssessment({
      attemptCount: 1,
      processingStartedAt: NOW,
      status: 'processing',
    });
    const moderator = vi.fn().mockResolvedValue({
      id: 'modr-123',
      imageIncluded: true,
      model: CONFIG.model,
      sexual: false,
      sexualAppliedInputTypes: ['text', 'image'],
      sexualScore: 0.01,
    });
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(claimedAssessment),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 }),
    });

    const results = await Promise.all([
      processMangaPornographyAssessment(
        { assessmentId: claimedAssessment.id },
        { config: CONFIG, dbClient, moderator, now: () => NOW }
      ),
      processMangaPornographyAssessment(
        { assessmentId: claimedAssessment.id },
        { config: CONFIG, dbClient, moderator, now: () => NOW }
      ),
    ]);

    expect(results.map((result) => result.outcome).sort()).toEqual([
      'completed',
      'not_claimed',
    ]);
    expect(moderator).toHaveBeenCalledOnce();
  });

  it('does not let an obsolete response overwrite a newer fingerprint', async () => {
    const claimedAssessment = buildAssessment({
      attemptCount: 1,
      processingStartedAt: NOW,
      status: 'processing',
    });
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(claimedAssessment),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 }),
    });

    await expect(
      processMangaPornographyAssessment(
        { assessmentId: claimedAssessment.id },
        {
          config: CONFIG,
          dbClient,
          moderator: vi.fn().mockResolvedValue({
            id: 'old-result',
            imageIncluded: true,
            model: CONFIG.model,
            sexual: true,
            sexualAppliedInputTypes: ['text', 'image'],
            sexualScore: 0.99,
          }),
          now: () => NOW,
        }
      )
    ).resolves.toMatchObject({ outcome: 'stale' });
  });

  it('records retryable errors with exponential backoff and no false allow', async () => {
    const claimedAssessment = buildAssessment({
      attemptCount: 1,
      processingStartedAt: NOW,
      status: 'processing',
    });
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(claimedAssessment),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 }),
    });

    const result = await processMangaPornographyAssessment(
      { assessmentId: claimedAssessment.id },
      {
        config: CONFIG,
        dbClient,
        moderator: vi
          .fn()
          .mockRejectedValue(
            new OpenAIPornographyModerationError('timeout', true)
          ),
        now: () => NOW,
      }
    );

    expect(result).toMatchObject({
      errorCode: 'timeout',
      nextAttemptAt: new Date(NOW.getTime() + 5_000),
      outcome: 'retry_scheduled',
    });
    expect(delegate.updateMany.mock.calls[1]?.[0]).toMatchObject({
      data: {
        lastErrorCode: 'timeout',
        lastErrorMessage: 'OpenAI moderation request timed out.',
        status: 'retryable_error',
        verdict: null,
      },
    });
  });

  it('ends at permanent_error after the final attempt', async () => {
    const claimedAssessment = buildAssessment({
      attemptCount: CONFIG.maxAttempts,
      processingStartedAt: NOW,
      status: 'processing',
    });
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(claimedAssessment),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 }),
    });

    await expect(
      processMangaPornographyAssessment(
        { assessmentId: claimedAssessment.id },
        {
          config: CONFIG,
          dbClient,
          moderator: vi
            .fn()
            .mockRejectedValue(
              new OpenAIPornographyModerationError('request_failed', true)
            ),
          now: () => NOW,
        }
      )
    ).resolves.toMatchObject({
      nextAttemptAt: null,
      outcome: 'permanent_error',
    });
    expect(delegate.updateMany.mock.calls[1]?.[0]).toMatchObject({
      data: {
        nextAttemptAt: null,
        status: 'permanent_error',
        verdict: null,
      },
    });
  });
});

describe('manga pornography policy structured logging', () => {
  it('keeps only bounded error metadata and never returns the raw message', () => {
    const error = Object.assign(
      new Error('SENSITIVE_URL_TOKEN SENSITIVE_API_KEY'),
      {
        code: 'P2002',
        name: 'PrismaClientKnownRequestError',
      }
    );

    expect(getSafeMangaPornographyLogError(error)).toEqual({
      errorCode: 'P2002',
      errorName: 'PrismaClientKnownRequestError',
    });
    expect(JSON.stringify(getSafeMangaPornographyLogError(error))).not.toMatch(
      /SENSITIVE_(URL_TOKEN|API_KEY)/
    );

    expect(
      getSafeMangaPornographyLogError(
        Object.assign(new Error('raw secret'), {
          code: 'SENSITIVE_API_KEY',
          name: 'SENSITIVE_URL_TOKEN',
        })
      )
    ).toEqual({ errorName: 'UnknownError' });
  });

  it('logs moderation start and completion without assessment inputs or credentials', async () => {
    const assessment = buildSensitiveAssessment({
      attemptCount: 1,
      processingStartedAt: NOW,
      status: 'processing',
    });
    const log = buildPolicyLog();
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(assessment),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 }),
    });

    await expect(
      processMangaPornographyAssessment(
        { assessmentId: assessment.id },
        {
          config: { ...CONFIG, apiKey: 'SENSITIVE_API_KEY' },
          dbClient,
          log,
          moderator: vi.fn().mockResolvedValue({
            id: 'moderation-result-1',
            imageIncluded: true,
            model: CONFIG.model,
            sexual: true,
            sexualAppliedInputTypes: ['text', 'image'],
            sexualScore: 0.97,
          }),
          now: () => NOW,
        }
      )
    ).resolves.toMatchObject({ outcome: 'completed', verdict: 'block' });

    expectPolicyLogEvent(log, 'info', 'pornography_moderation_started');
    expectPolicyLogEvent(log, 'info', 'pornography_moderation_completed');
    expectPolicyLogsNotToContain(log, SENSITIVE_LOG_VALUES);
  });

  it('logs a safe retry failure without the raw error or assessment payload', async () => {
    const assessment = buildSensitiveAssessment({
      attemptCount: 1,
      processingStartedAt: NOW,
      status: 'processing',
    });
    const log = buildPolicyLog();
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(assessment),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 1 }),
    });

    await expect(
      processMangaPornographyAssessment(
        { assessmentId: assessment.id },
        {
          config: { ...CONFIG, apiKey: 'SENSITIVE_API_KEY' },
          dbClient,
          log,
          moderator: vi
            .fn()
            .mockRejectedValue(
              new OpenAIPornographyModerationError('timeout', true)
            ),
          now: () => NOW,
        }
      )
    ).resolves.toMatchObject({
      errorCode: 'timeout',
      outcome: 'retry_scheduled',
    });

    expectPolicyLogEvent(log, 'info', 'pornography_moderation_started');
    expectPolicyLogEvent(log, 'warn', 'pornography_moderation_failed');
    expectPolicyLogsNotToContain(log, SENSITIVE_LOG_VALUES);
  });

  it('logs that automation is disabled without exposing configuration secrets', async () => {
    const log = buildPolicyLog();

    await expect(
      processMangaPornographyAssessment(
        { assessmentId: 'assessment-1' },
        {
          config: {
            ...CONFIG,
            apiKey: 'SENSITIVE_API_KEY',
            enabled: false,
          },
          dbClient: {},
          log,
        }
      )
    ).resolves.toEqual({
      assessmentId: 'assessment-1',
      outcome: 'disabled',
    });

    expectPolicyLogEvent(
      log,
      'debug',
      'pornography_policy_automation_disabled'
    );
    expectPolicyLogsNotToContain(log, SENSITIVE_LOG_VALUES);
  });

  it('logs a gate timeout without title, source, URL, package, or payload', async () => {
    const assessment = buildSensitiveAssessment({
      attemptCount: 1,
      processingLeaseExpiresAt: new Date(NOW.getTime() + 30_000),
      processingStartedAt: NOW,
      status: 'processing',
    });
    const log = buildPolicyLog();
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(assessment),
    });
    let nowCallCount = 0;

    await expect(
      waitForMangaPornographyPolicyDecision(
        {
          mangaTitle: assessment.title,
          sourceId: assessment.sourceId,
          sourceName: assessment.sourceName,
        },
        {
          config: { ...CONFIG, apiKey: 'SENSITIVE_API_KEY' },
          dbClient,
          log,
          now: () => new Date(NOW.getTime() + (nowCallCount++ === 0 ? 0 : 100)),
          sleep: vi.fn(),
          timeoutMs: 50,
        }
      )
    ).resolves.toMatchObject({
      assessmentId: assessment.id,
      pending: true,
      status: 'processing',
    });

    expectPolicyLogEvent(log, 'warn', 'pornography_policy_wait_timeout');
    expectPolicyLogsNotToContain(log, SENSITIVE_LOG_VALUES);
  });
});

describe('gate lookup and wait', () => {
  it('applies manual allow and block ahead of the AI verdict', async () => {
    const allowed = buildAssessment({
      manualDecision: 'allow',
      status: 'completed',
      verdict: 'block',
    });
    const blocked = buildAssessment({
      manualDecision: 'block',
      status: 'completed',
      verdict: 'no_explicit_signal',
    });
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi
        .fn()
        .mockResolvedValueOnce(allowed)
        .mockResolvedValue(blocked),
    });

    await expect(
      getMangaPornographyPolicyDecision(
        { mangaTitle: allowed.title, sourceId: allowed.sourceId },
        { dbClient }
      )
    ).resolves.toMatchObject({ blocked: false, effectiveDecision: 'allow' });
    await expect(
      getMangaPornographyPolicyDecision(
        { mangaTitle: blocked.title, sourceId: blocked.sourceId },
        { dbClient }
      )
    ).resolves.toMatchObject({ blocked: true, effectiveDecision: 'block' });
    expect(delegate.findUnique).toHaveBeenCalledTimes(2);
  });

  it('claims and joins a pending assessment from the gate itself', async () => {
    let current = buildAssessment();
    const updateMany = vi
      .fn()
      .mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => {
          if (data.status === 'processing') {
            current = buildAssessment({
              ...current,
              attemptCount: current.attemptCount + 1,
              processingLeaseExpiresAt: data.processingLeaseExpiresAt as Date,
              processingStartedAt: data.processingStartedAt as Date,
              status: 'processing',
            });
          } else if (data.status === 'completed') {
            current = buildAssessment({
              ...current,
              classifiedAt: data.classifiedAt as Date,
              processingLeaseExpiresAt: null,
              processingStartedAt: null,
              sexualFlag: data.sexualFlag as boolean,
              sexualScore: data.sexualScore as number,
              status: 'completed',
              verdict: data.verdict as 'block',
            });
          }
          return { count: 1 };
        }
      );
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockImplementation(async () => current),
      updateMany,
    });

    const decision = await waitForMangaPornographyPolicyDecision(
      { mangaTitle: current.title, sourceId: current.sourceId },
      {
        config: CONFIG,
        dbClient,
        moderator: vi.fn().mockResolvedValue({
          id: 'gate-result',
          imageIncluded: true,
          model: CONFIG.model,
          sexual: true,
          sexualAppliedInputTypes: ['text', 'image'],
          sexualScore: 0.99,
        }),
        now: () => NOW,
        sleep: async () => undefined,
        timeoutMs: 1_000,
      }
    );

    expect(decision).toMatchObject({
      blocked: true,
      effectiveDecision: 'block',
      status: 'completed',
    });
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it('recovers a missing assessment from the latest matching visit', async () => {
    let current: MangaPornographyAssessment | null = null;
    const visit = {
      extensionName: 'Recovered extension',
      extensionPackageName: 'com.example.recovered',
      mangaUrl: '/recovered',
      sourceId: '456',
      sourceName: 'Recovered source',
      thumbnailUrl: 'https://cdn.example.com/recovered.jpg',
      title: 'Recovered Manga',
    };
    const findFirst = vi.fn().mockResolvedValue(visit);
    const updateMany = vi
      .fn()
      .mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => {
          if (!current) {
            return { count: 0 };
          }
          if (data.status === 'processing') {
            current = buildAssessment({
              ...current,
              attemptCount: current.attemptCount + 1,
              processingLeaseExpiresAt: data.processingLeaseExpiresAt as Date,
              processingStartedAt: data.processingStartedAt as Date,
              status: 'processing',
            });
          } else if (data.status === 'completed') {
            current = buildAssessment({
              ...current,
              processingLeaseExpiresAt: null,
              processingStartedAt: null,
              status: 'completed',
              verdict: data.verdict as 'block',
            });
          }
          return { count: 1 };
        }
      );
    const assessmentDelegate = {
      findMany: vi.fn(),
      findUnique: vi.fn().mockImplementation(async () => current),
      update: vi.fn(),
      updateMany,
      upsert: vi.fn().mockImplementation(async ({ create }) => {
        current = buildAssessment({
          ...create,
          id: 'recovered-assessment',
        });
        return current;
      }),
    };
    const dbClient = {
      deviceMangaVisit: { findFirst },
      mangaPornographyAssessment: assessmentDelegate,
    } as unknown as MangaPornographyPolicyDbClient;

    const decision = await waitForMangaPornographyPolicyDecision(
      {
        mangaTitle: 'recovered manga',
        sourceId: visit.sourceId,
        sourceName: visit.sourceName,
      },
      {
        config: CONFIG,
        dbClient,
        moderator: vi.fn().mockResolvedValue({
          id: 'recovered-result',
          imageIncluded: true,
          model: CONFIG.model,
          sexual: true,
          sexualAppliedInputTypes: ['text', 'image'],
          sexualScore: 0.99,
        }),
        now: () => NOW,
        sleep: async () => undefined,
        timeoutMs: 1_000,
      }
    );

    expect(decision).toMatchObject({
      assessmentId: 'recovered-assessment',
      blocked: true,
      status: 'completed',
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceId: visit.sourceId,
          sourceName: undefined,
          title: { equals: 'recovered manga', mode: 'insensitive' },
        },
      })
    );
  });

  it('returns pending immediately when automatic moderation is disabled', async () => {
    const pending = buildAssessment();
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(pending),
    });
    const sleep = vi.fn();

    await expect(
      waitForMangaPornographyPolicyDecision(
        { mangaTitle: pending.title, sourceId: pending.sourceId },
        {
          config: { ...CONFIG, enabled: false },
          dbClient,
          sleep,
        }
      )
    ).resolves.toMatchObject({
      blocked: false,
      effectiveDecision: 'allow',
    });
    expect(sleep).not.toHaveBeenCalled();
    expect(delegate.updateMany).not.toHaveBeenCalled();
  });

  it('ignores a cached AI block while off without sleeping or calling the moderator', async () => {
    const cachedBlock = buildAssessment({
      sexualFlag: true,
      sexualScore: 0.99,
      status: 'completed',
      verdict: 'block',
    });
    const { dbClient, delegate } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(cachedBlock),
    });
    const moderator = vi.fn();
    const sleep = vi.fn();

    await expect(
      waitForMangaPornographyPolicyDecision(
        { mangaTitle: cachedBlock.title, sourceId: cachedBlock.sourceId },
        {
          config: CONFIG,
          dbClient: withAutomationToggle(dbClient, false),
          moderator,
          sleep,
        }
      )
    ).resolves.toMatchObject({
      blocked: false,
      effectiveDecision: 'allow',
      verdict: 'block',
    });
    expect(sleep).not.toHaveBeenCalled();
    expect(moderator).not.toHaveBeenCalled();
    expect(delegate.updateMany).not.toHaveBeenCalled();
  });

  it('keeps a manual block active while automation is off', async () => {
    const manualBlock = buildAssessment({
      manualDecision: 'block',
      status: 'completed',
      verdict: 'no_explicit_signal',
    });
    const { dbClient } = buildDbClient({
      findUnique: vi.fn().mockResolvedValue(manualBlock),
    });
    const sleep = vi.fn();

    await expect(
      waitForMangaPornographyPolicyDecision(
        { mangaTitle: manualBlock.title, sourceId: manualBlock.sourceId },
        {
          config: CONFIG,
          dbClient: withAutomationToggle(dbClient, false),
          sleep,
        }
      )
    ).resolves.toMatchObject({
      blocked: true,
      effectiveDecision: 'block',
      manualDecision: 'block',
    });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('fails open when the assessment delegate is missing', async () => {
    await expect(
      waitForMangaPornographyPolicyDecision(
        { mangaTitle: 'Example Manga', sourceId: '123' },
        { config: CONFIG, dbClient: {}, timeoutMs: 10 }
      )
    ).resolves.toBeNull();
  });
});

describe('retryMangaPornographyAssessment automation setting', () => {
  it.each([
    [false, true, false],
    [true, false, true],
  ] as const)(
    'uses stored enabled=%s over default enabled=%s',
    async (storedEnabled, defaultEnabled, shouldSchedule) => {
      const assessment = buildAssessment();
      const { dbClient, delegate } = buildDbClient({
        findUnique: vi.fn().mockResolvedValue(assessment),
        update: vi.fn().mockResolvedValue(assessment),
      });

      await expect(
        retryMangaPornographyAssessment(
          { assessmentId: assessment.id },
          {
            config: { ...CONFIG, enabled: defaultEnabled },
            dbClient: withAutomationToggle(dbClient, storedEnabled),
          }
        )
      ).resolves.toMatchObject({
        assessment,
        shouldSchedule,
      });

      if (storedEnabled) {
        expect(delegate.update).toHaveBeenCalledOnce();
      } else {
        expect(delegate.update).not.toHaveBeenCalled();
        expect(delegate.findUnique).toHaveBeenCalledWith({
          where: { id: assessment.id },
        });
      }
    }
  );
});

describe('backfillMangaPornographyAssessments', () => {
  it('scans at most 200 recent visits and deduplicates assessment IDs', async () => {
    const visitFindMany = vi.fn().mockResolvedValue([
      {
        extensionName: 'Extension',
        extensionPackageName: 'com.example.extension',
        mangaUrl: '/one',
        sourceId: '123',
        sourceName: 'Source',
        thumbnailUrl: 'https://cdn.example.com/one.jpg?token=1',
        title: 'First Manga',
      },
      {
        extensionName: 'Extension',
        extensionPackageName: 'com.example.extension',
        mangaUrl: '/one-copy',
        sourceId: '123',
        sourceName: 'Source',
        thumbnailUrl: 'https://cdn.example.com/one.jpg?token=2',
        title: ' first  manga ',
      },
      {
        extensionName: 'Extension',
        extensionPackageName: 'com.example.extension',
        mangaUrl: '/two',
        sourceId: '123',
        sourceName: 'Source',
        thumbnailUrl: 'https://cdn.example.com/two.jpg',
        title: 'Second Manga',
      },
    ]);
    const records = new Map<string, MangaPornographyAssessment>();
    const assessmentDelegate = {
      findMany: vi.fn(),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.identityKey) {
          return records.get(where.identityKey) ?? null;
        }
        return null;
      }),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockImplementation(async ({ create, where }) => {
        const existing = records.get(where.identityKey);
        if (existing) {
          return existing;
        }
        const created = buildAssessment({
          ...create,
          id: `assessment-${records.size + 1}`,
        });
        records.set(where.identityKey, created);
        return created;
      }),
    };
    const dbClient = {
      deviceMangaVisit: { findMany: visitFindMany },
      mangaPornographyAssessment: assessmentDelegate,
    } as unknown as MangaPornographyPolicyDbClient;

    const result = await backfillMangaPornographyAssessments(
      { limit: 999 },
      { config: CONFIG, dbClient, now: () => NOW }
    );

    expect(result).toEqual({
      registered: 2,
      scanned: 3,
      scheduledAssessmentIds: ['assessment-1', 'assessment-2'],
    });
    expect(visitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 })
    );
    expect(assessmentDelegate.upsert).toHaveBeenCalledTimes(2);

    await expect(
      backfillMangaPornographyAssessments(
        { limit: 999 },
        {
          config: CONFIG,
          dbClient: withAutomationToggle(dbClient, false),
          now: () => NOW,
        }
      )
    ).resolves.toEqual({
      registered: 2,
      scanned: 3,
      scheduledAssessmentIds: [],
    });
  });
});
