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
import { createAndroidApkDownloadResponse } from '@/server/services/android-apk-download';

describe('createAndroidApkDownloadResponse', () => {
  beforeEach(() => {
    mockPresignGetObject.mockReset();
  });

  it('redirects to a short-lived signed URL for the current Android APK', async () => {
    const signedUrl =
      'https://objects.example.test/public/downloads/tachiyomiat-latest.apk?signature=test';
    mockPresignGetObject.mockResolvedValue(signedUrl);

    const response = await createAndroidApkDownloadResponse();

    expect(mockPresignGetObject).toHaveBeenCalledWith(mockUploadClient, {
      bucket: 'legacy-public-test',
      expiresIn: 600,
      key: androidApkDownload.objectKey,
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(signedUrl);
  });
});
