import { describe, expect, it, vi } from 'vitest';

const { mockCreateAndroidApkDownloadResponse } = vi.hoisted(() => ({
  mockCreateAndroidApkDownloadResponse: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
  }),
}));

vi.mock('@/server/services/android-apk-download', () => ({
  createAndroidApkDownloadResponse: mockCreateAndroidApkDownloadResponse,
}));

import { Route } from './tachiyomiat-latest[.]apk';

describe('GET /api/download/tachiyomiat-latest.apk', () => {
  it('uses the shared Android APK download response', async () => {
    const expectedResponse = Response.redirect(
      'https://objects.example.test/tachiyomiat-latest.apk?signature=test',
      302
    );
    mockCreateAndroidApkDownloadResponse.mockResolvedValue(expectedResponse);
    const handler = (
      Route as never as {
        options: {
          server: {
            handlers: {
              GET: () => Promise<Response>;
            };
          };
        };
      }
    ).options.server.handlers.GET;

    await expect(handler()).resolves.toBe(expectedResponse);
    expect(mockCreateAndroidApkDownloadResponse).toHaveBeenCalledTimes(1);
  });
});
