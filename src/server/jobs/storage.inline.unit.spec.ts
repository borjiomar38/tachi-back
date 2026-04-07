import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('job storage inline fallback', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('stores and reads page uploads inline when production S3 still points to loopback', async () => {
    vi.doMock('@/server/s3', () => ({
      objectStorageBuckets: {
        results: 'results',
        uploads: 'uploads',
      },
      shouldUseInlineObjectStorage: true,
      uploadClient: {},
    }));

    const { getTranslationJobPageUpload, putTranslationJobPageUpload } =
      await import('@/server/jobs/storage');

    const stored = await putTranslationJobPageUpload({
      body: new Uint8Array(Buffer.from('hello world')),
      contentType: 'image/png',
      fileName: 'page 1.png',
      jobId: 'job-inline',
      pageNumber: 1,
    });

    expect(stored.bucketName).toBe('__inline__');
    expect(stored.objectKey.startsWith('inline:')).toBe(true);

    const object = await getTranslationJobPageUpload(stored);
    expect(await object.blob.text()).toBe('hello world');
  });

  it('stores and reads result manifests inline when production S3 still points to loopback', async () => {
    vi.doMock('@/server/s3', () => ({
      objectStorageBuckets: {
        results: 'results',
        uploads: 'uploads',
      },
      shouldUseInlineObjectStorage: true,
      uploadClient: {},
    }));

    const { getTranslationJobResultManifest, putTranslationJobResultManifest } =
      await import('@/server/jobs/storage');

    const manifest = {
      completedAt: new Date('2026-04-07T14:15:00.000Z'),
      deviceId: 'device-1',
      jobId: 'job-inline',
      licenseId: 'license-1',
      pageCount: 1,
      pageOrder: ['page-001.png'],
      pages: {
        'page-001.png': {
          blocks: [],
          imgHeight: 100,
          imgWidth: 100,
          sourceLanguage: 'en',
          targetLanguage: 'fr',
          translatorType: 'gemini' as const,
        },
      },
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      translatorType: 'gemini' as const,
      version: '2026-03-20.phase11.v1' as const,
    };

    const stored = await putTranslationJobResultManifest(manifest);
    const loaded = await getTranslationJobResultManifest(stored);

    expect(stored.bucketName).toBe('__inline__');
    expect(loaded).toEqual(manifest);
  });
});
