import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPresignGetObject, mockUploadClient } = vi.hoisted(() => ({
  mockPresignGetObject: vi.fn(),
  mockUploadClient: { name: 'test-upload-client' },
}));

vi.mock('@better-upload/server/helpers', () => ({
  presignGetObject: mockPresignGetObject,
}));

vi.mock('@/server/s3', () => ({
  objectStorageBuckets: {
    legacyPublic: 'legacy-public-test',
  },
  uploadClient: mockUploadClient,
}));

import { androidApkDownload } from '@/features/public/download-assets';
import {
  createLegacyMobileUpdateDownloadResponse,
  createVersionedAndroidAbiApkDownloadResponse,
  createWebsiteAndroidApkDownloadResponse,
  resolveVersionedAndroidAbiApkObjectKey,
} from '@/server/services/android-apk-download';

describe('Android APK download responses', () => {
  beforeEach(() => {
    mockPresignGetObject.mockReset();
  });

  it('redirects the website to the compact ARM64 APK', async () => {
    const signedUrl =
      'https://objects.example.test/public/downloads/tachiyomiat-latest.apk?signature=test';
    mockPresignGetObject.mockResolvedValue(signedUrl);

    const response = await createWebsiteAndroidApkDownloadResponse();

    expect(mockPresignGetObject).toHaveBeenCalledWith(mockUploadClient, {
      bucket: 'legacy-public-test',
      expiresIn: 600,
      key: androidApkDownload.objectKey,
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(signedUrl);
  });

  it('keeps the legacy mobile updater on its existing object', async () => {
    const signedUrl =
      'https://objects.example.test/public/downloads/tachiyomiat-latest.apk?signature=test';
    mockPresignGetObject.mockResolvedValue(signedUrl);

    const response = await createLegacyMobileUpdateDownloadResponse();

    expect(mockPresignGetObject).toHaveBeenCalledWith(mockUploadClient, {
      bucket: 'legacy-public-test',
      expiresIn: 600,
      key: 'public/downloads/tachiyomiat-latest.apk',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(signedUrl);
  });

  it.each(['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'])(
    'redirects the %s release APK to its immutable object',
    async (abi) => {
      const version = 'v0.17.38';
      const filename = `TachiyomiAT-${abi}-${version}.apk`;
      const signedUrl = `https://objects.example.test/${filename}?signature=test`;
      mockPresignGetObject.mockResolvedValue(signedUrl);

      const response = await createVersionedAndroidAbiApkDownloadResponse({
        filename,
        version,
      });

      expect(mockPresignGetObject).toHaveBeenCalledWith(mockUploadClient, {
        bucket: 'legacy-public-test',
        expiresIn: 600,
        key: `android/releases/${version}/${filename}`,
      });
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(signedUrl);
    }
  );

  it('supports the explicitly reserved v0.17.40 release path', () => {
    expect(
      resolveVersionedAndroidAbiApkObjectKey({
        filename: 'TachiyomiAT-x86_64-v0.17.40.apk',
        version: 'v0.17.40',
      })
    ).toBe('android/releases/v0.17.40/TachiyomiAT-x86_64-v0.17.40.apk');
  });

  it.each([
    {
      filename: 'TachiyomiAT-arm64-v8a-v0.17.38.apk',
      version: 'v0.17.39',
    },
    {
      filename: 'TachiyomiAT-universal-v0.17.38.apk',
      version: 'v0.17.38',
    },
    {
      filename: 'TachiyomiAT-arm64-v8a-v0.17.40.apk',
      version: 'v0.17.38',
    },
    {
      filename: '../TachiyomiAT-arm64-v8a-v0.17.38.apk',
      version: 'v0.17.38',
    },
  ])('rejects an unapproved release path: $filename', async (input) => {
    const response = await createVersionedAndroidAbiApkDownloadResponse(input);

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mockPresignGetObject).not.toHaveBeenCalled();
  });
});
