import { describe, expect, it, vi } from 'vitest';

const { mockCreateVersionedAndroidAbiApkDownloadResponse } = vi.hoisted(() => ({
  mockCreateVersionedAndroidAbiApkDownloadResponse: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
  }),
}));

vi.mock('@/server/services/android-apk-download', () => ({
  createVersionedAndroidAbiApkDownloadResponse:
    mockCreateVersionedAndroidAbiApkDownloadResponse,
}));

import { Route } from './$filename';

describe('GET /api/download/android/$version/$filename', () => {
  it('passes both path parameters to the strict download service', async () => {
    const expectedResponse = Response.redirect(
      'https://objects.example.test/android.apk?signature=test',
      302
    );
    mockCreateVersionedAndroidAbiApkDownloadResponse.mockResolvedValue(
      expectedResponse
    );
    const handler = (
      Route as never as {
        options: {
          server: {
            handlers: {
              GET: (context: {
                params: { filename: string; version: string };
              }) => Promise<Response>;
            };
          };
        };
      }
    ).options.server.handlers.GET;
    const params = {
      filename: 'TachiyomiAT-arm64-v8a-v0.17.38.apk',
      version: 'v0.17.38',
    };

    await expect(handler({ params })).resolves.toBe(expectedResponse);
    expect(
      mockCreateVersionedAndroidAbiApkDownloadResponse
    ).toHaveBeenCalledWith(params);
  });
});
