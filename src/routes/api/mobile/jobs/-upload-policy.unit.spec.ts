import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  MockMobileAuthError,
  mockAuthenticateMobileAccessToken,
  mockGetEffectiveOcrUploadCompressionPolicy,
} = vi.hoisted(() => {
  class HoistedMobileAuthError extends Error {
    constructor(
      readonly code: string,
      readonly statusCode: number
    ) {
      super(code);
      this.name = 'MobileAuthError';
    }
  }

  return {
    MockMobileAuthError: HoistedMobileAuthError,
    mockAuthenticateMobileAccessToken: vi.fn(),
    mockGetEffectiveOcrUploadCompressionPolicy: vi.fn(),
  };
});

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
  }),
}));

vi.mock('@/server/mobile-auth/session', () => ({
  authenticateMobileAccessToken: mockAuthenticateMobileAccessToken,
  MobileAuthError: MockMobileAuthError,
}));

vi.mock('@/server/ocr-upload-compression/service', () => ({
  getEffectiveOcrUploadCompressionPolicy:
    mockGetEffectiveOcrUploadCompressionPolicy,
}));

import { Route } from '@/routes/api/mobile/jobs/upload-policy';

describe('GET /api/mobile/jobs/upload-policy', () => {
  const handler = (
    Route as never as {
      options: {
        server: {
          handlers: {
            GET: (input: { request: Request }) => Promise<Response>;
          };
        };
      };
    }
  ).options.server.handlers.GET;

  beforeEach(() => {
    mockAuthenticateMobileAccessToken.mockReset();
    mockGetEffectiveOcrUploadCompressionPolicy.mockReset();
  });

  it('returns the installation-specific policy in the mobile envelope', async () => {
    mockAuthenticateMobileAccessToken.mockResolvedValue({
      device: {
        installationId: 'installation-339',
      },
    });
    mockGetEffectiveOcrUploadCompressionPolicy.mockResolvedValue({
      maxWidthPx: 2_000,
      measuredReductionPercent: 44.7,
      mode: 'webp',
      policyRevision: 'ocr-upload-v1-safe',
      policyVersion: 1,
      profile: 'safe',
      webpQuality: 75,
    });

    const response = await handler({
      request: new Request('http://localhost/api/mobile/jobs/upload-policy', {
        headers: {
          Authorization: 'Bearer access-token',
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      data: {
        maxWidthPx: 2_000,
        measuredReductionPercent: 44.7,
        mode: 'webp',
        policyRevision: 'ocr-upload-v1-safe',
        policyVersion: 1,
        profile: 'safe',
        webpQuality: 75,
      },
      ok: true,
    });
    expect(
      mockGetEffectiveOcrUploadCompressionPolicy
    ).toHaveBeenCalledExactlyOnceWith({
      installationId: 'installation-339',
    });
  });

  it('returns the standard mobile auth error envelope', async () => {
    mockAuthenticateMobileAccessToken.mockRejectedValue(
      new MockMobileAuthError('invalid_session', 401)
    );

    const response = await handler({
      request: new Request('http://localhost/api/mobile/jobs/upload-policy'),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'invalid_session',
      },
      ok: false,
    });
    expect(mockGetEffectiveOcrUploadCompressionPolicy).not.toHaveBeenCalled();
  });
});
