import { describe, expect, it, vi } from 'vitest';

import {
  getDefaultOcrUploadCompressionRuntimeConfig,
  OCR_UPLOAD_COMPRESSION_CONFIG_KEY,
} from '@/server/ocr-upload-compression/schema';
import {
  buildOcrUploadCompressionPolicyRevision,
  getOcrUploadCompressionRolloutBucket,
  getOcrUploadCompressionRuntimeConfig,
  resolveEffectiveOcrUploadCompressionPolicy,
  updateOcrUploadCompressionRuntimeConfig,
} from '@/server/ocr-upload-compression/service';

describe('OCR upload compression runtime config', () => {
  it('defaults to the original upload flow', async () => {
    const dbClient = {
      appConfig: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await getOcrUploadCompressionRuntimeConfig({
      dbClient: dbClient as never,
    });

    expect(result.current).toEqual({
      custom: {
        maxWidthPx: 2_000,
        webpQuality: 75,
      },
      policyVersion: 1,
      profile: 'original',
      rollout: {
        mode: 'all',
      },
    });
    expect(result.catalog).toEqual([
      expect.objectContaining({
        measuredReductionPercent: 0,
        profile: 'original',
      }),
      expect.objectContaining({
        maxWidthPx: 2_000,
        measuredReductionPercent: 44.7,
        profile: 'safe',
        webpQuality: 75,
      }),
      expect.objectContaining({
        maxWidthPx: 1_600,
        measuredReductionPercent: 57.8,
        profile: 'balanced',
        webpQuality: 70,
      }),
      expect.objectContaining({
        maxWidthPx: 1_400,
        measuredReductionPercent: 69.7,
        profile: 'strong',
        webpQuality: 50,
      }),
      expect.objectContaining({
        measuredReductionPercent: null,
        profile: 'custom',
      }),
    ]);
    expect(result.policyRevision).toMatch(/^ocr-upload-v1-[a-f\d]{16}$/);
    expect(result.updatedAt).toBeNull();
  });

  it('falls back to Original when the stored payload is incompatible', async () => {
    const updatedAt = new Date('2026-07-31T10:00:00.000Z');
    const dbClient = {
      appConfig: {
        findUnique: vi.fn().mockResolvedValue({
          updatedAt,
          value: {
            enabled: true,
            profile: 'strong',
          },
        }),
      },
    };

    const result = await getOcrUploadCompressionRuntimeConfig({
      dbClient: dbClient as never,
    });

    expect(result.current.profile).toBe('original');
    expect(result.updatedAt).toEqual(updatedAt);
  });

  it('persists one profile field without a separate enabled flag', async () => {
    const updatedAt = new Date('2026-07-31T11:00:00.000Z');
    const current = {
      custom: {
        maxWidthPx: 1_850,
        webpQuality: 72,
      },
      policyVersion: 1 as const,
      profile: 'custom' as const,
      rollout: {
        installationIds: ['installation-1'],
        mode: 'test_devices' as const,
      },
    };
    const dbClient = {
      appConfig: {
        upsert: vi.fn().mockResolvedValue({
          updatedAt,
          value: current,
        }),
      },
    };

    const result = await updateOcrUploadCompressionRuntimeConfig(current, {
      dbClient: dbClient as never,
    });

    expect(result.current).toEqual(current);
    expect(result.updatedAt).toEqual(updatedAt);
    expect(dbClient.appConfig.upsert).toHaveBeenCalledWith({
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
    expect(
      dbClient.appConfig.upsert.mock.calls[0]?.[0].create.value
    ).not.toHaveProperty('enabled');
  });
});

describe('resolveEffectiveOcrUploadCompressionPolicy', () => {
  it('returns the validated Safe parameters for an all-user rollout', () => {
    const config = {
      ...getDefaultOcrUploadCompressionRuntimeConfig(),
      profile: 'safe' as const,
    };

    const policy = resolveEffectiveOcrUploadCompressionPolicy({
      config,
      installationId: 'installation-safe',
    });

    expect(policy).toEqual({
      maxWidthPx: 2_000,
      measuredReductionPercent: 44.7,
      mode: 'webp',
      policyRevision: buildOcrUploadCompressionPolicyRevision(config),
      policyVersion: 1,
      profile: 'safe',
      webpQuality: 75,
    });
  });

  it('uses custom image parameters without claiming a measured reduction', () => {
    const config = {
      ...getDefaultOcrUploadCompressionRuntimeConfig(),
      custom: {
        maxWidthPx: 1_725,
        webpQuality: 63,
      },
      profile: 'custom' as const,
    };

    const policy = resolveEffectiveOcrUploadCompressionPolicy({
      config,
      installationId: 'installation-custom',
    });

    expect(policy).toMatchObject({
      maxWidthPx: 1_725,
      measuredReductionPercent: null,
      mode: 'webp',
      profile: 'custom',
      webpQuality: 63,
    });
  });

  it('only enables test installations explicitly listed in the config', () => {
    const config = {
      ...getDefaultOcrUploadCompressionRuntimeConfig(),
      profile: 'balanced' as const,
      rollout: {
        installationIds: ['included-installation'],
        mode: 'test_devices' as const,
      },
    };

    expect(
      resolveEffectiveOcrUploadCompressionPolicy({
        config,
        installationId: 'included-installation',
      })
    ).toMatchObject({
      maxWidthPx: 1_600,
      measuredReductionPercent: 57.8,
      mode: 'webp',
      profile: 'balanced',
      webpQuality: 70,
    });
    expect(
      resolveEffectiveOcrUploadCompressionPolicy({
        config,
        installationId: 'excluded-installation',
      })
    ).toEqual({
      measuredReductionPercent: 0,
      mode: 'original',
      policyRevision: buildOcrUploadCompressionPolicyRevision(config),
      policyVersion: 1,
      profile: 'original',
    });
  });

  it('supports deterministic percentage rollout boundaries', () => {
    const baseConfig = {
      ...getDefaultOcrUploadCompressionRuntimeConfig(),
      profile: 'strong' as const,
    };
    const installationId = 'stable-installation';
    const bucket = getOcrUploadCompressionRolloutBucket(installationId);

    expect(getOcrUploadCompressionRolloutBucket(installationId)).toBe(bucket);
    expect(
      resolveEffectiveOcrUploadCompressionPolicy({
        config: {
          ...baseConfig,
          rollout: {
            mode: 'percentage' as const,
            percentage: 0,
          },
        },
        installationId,
      }).mode
    ).toBe('original');
    expect(
      resolveEffectiveOcrUploadCompressionPolicy({
        config: {
          ...baseConfig,
          rollout: {
            mode: 'percentage' as const,
            percentage: 100,
          },
        },
        installationId,
      })
    ).toMatchObject({
      maxWidthPx: 1_400,
      measuredReductionPercent: 69.7,
      mode: 'webp',
      profile: 'strong',
      webpQuality: 50,
    });
  });

  it('fails safely to Original when called with an incompatible config', () => {
    const policy = resolveEffectiveOcrUploadCompressionPolicy({
      config: {
        enabled: true,
        profile: 'safe',
      } as never,
      installationId: 'installation-invalid',
    });

    expect(policy).toMatchObject({
      measuredReductionPercent: 0,
      mode: 'original',
      policyVersion: 1,
      profile: 'original',
    });
  });

  it('changes the revision when the effective configuration changes', () => {
    const original = getDefaultOcrUploadCompressionRuntimeConfig();
    const safe = {
      ...original,
      profile: 'safe' as const,
    };

    expect(buildOcrUploadCompressionPolicyRevision(original)).not.toBe(
      buildOcrUploadCompressionPolicyRevision(safe)
    );
  });
});
