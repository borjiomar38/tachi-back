import { call } from '@orpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockDb } from '@/server/routers/test-utils';
import {
  mockGetSession,
  mockUserHasPermission,
} from '@/server/routers/test-utils';

vi.mock('@/env/server', () => ({
  envServer: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_TRANSLATION_MODEL: 'claude-test',
    GEMINI_API_KEY: 'gemini-key',
    GEMINI_TRANSLATION_MODEL: 'gemini-test',
    GOOGLE_CLOUD_TRANSLATE_API_KEY: '',
    GOOGLE_CLOUD_VISION_API_KEY: 'vision-key',
    OCR_PROVIDER_PRIMARY: 'google_cloud_vision',
    OPENAI_API_KEY: 'openai-key',
    OPENAI_TRANSLATION_MODEL: 'gpt-test',
    OPENROUTER_API_KEY: '',
    PROVIDER_REQUEST_TIMEOUT_MS: 60000,
    PROVIDER_RETRY_MAX_ATTEMPTS: 2,
    TRANSLATION_PROMPT_VERSION: '2026-03-20.v1',
    TRANSLATION_PROVIDER_PRIMARY: 'gemini',
  },
}));

vi.mock('@/server/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      userHasPermission: (...args: unknown[]) => mockUserHasPermission(...args),
    },
  },
}));

import providerRouter from '@/server/routers/provider';

describe('provider router', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockUserHasPermission.mockReset();
    mockGetSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: { id: 'user-1' },
    });
    mockUserHasPermission.mockResolvedValue({
      error: false,
      success: true,
    });
  });

  it('returns the provider gateway manifest to authorized staff', async () => {
    const result = await call(providerRouter.manifest, undefined);

    expect(result.ocr.defaultProvider).toBe('google_cloud_vision');
    expect(result.translation.defaultProvider).toBe('gemini');
    expect(result.translation.promptVersion).toBe('2026-03-20.v1');
    expect(
      result.translation.providers.find(
        (provider) => provider.provider === 'openai'
      )
    ).toMatchObject({
      enabled: true,
      supportedByGateway: true,
    });
  });

  it('requires provider read permission', async () => {
    await call(providerRouter.manifest, undefined);

    expect(mockUserHasPermission).toHaveBeenCalledWith({
      body: {
        permissions: { provider: ['read'] },
        userId: 'user-1',
      },
    });
  });

  it('returns provider operations summaries', async () => {
    mockDb.providerUsage.findMany
      .mockResolvedValueOnce([
        {
          costMicros: 1500n,
          createdAt: new Date('2026-03-19T20:00:00.000Z'),
          errorCode: null,
          inputTokens: 100,
          latencyMs: 900,
          modelName: 'gemini-test',
          outputTokens: 200,
          pageCount: 2,
          provider: 'gemini',
          requestCount: 1,
          stage: 'translation',
          success: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          createdAt: new Date('2026-03-19T20:30:00.000Z'),
          errorCode: 'timeout',
          job: {
            device: {
              installationId: 'install-123',
            },
            id: 'job-1',
            license: {
              key: 'LIC-123',
            },
            status: 'failed',
          },
          modelName: 'gemini-test',
          provider: 'gemini',
          stage: 'translation',
        },
      ]);
    mockDb.translationJob.groupBy.mockResolvedValue([
      {
        _count: {
          _all: 3,
        },
        status: 'failed',
      },
    ]);

    const result = await call(providerRouter.opsSummary, {
      windowHours: 24,
    });

    expect(result.windowHours).toBe(24);
    expect(
      result.providers.find((provider) => provider.provider === 'gemini')
    ).toMatchObject({
      enabled: true,
      successRatePercent: 100,
      totalUsageCount: 1,
    });
    expect(result.recentFailures[0]).toMatchObject({
      errorCode: 'timeout',
      jobId: 'job-1',
      licenseKey: 'LIC-123',
      provider: 'gemini',
    });
  });
});
