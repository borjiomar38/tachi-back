import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/s3', () => ({
  objectStorageBuckets: {
    results: 'results',
    uploads: 'uploads',
  },
  uploadClient: {},
}));

import { buildJobUploadObjectKey } from '@/server/jobs/storage';

describe('job storage', () => {
  it('sanitizes upload file names without throwing on regex replacements', () => {
    const objectKey = buildJobUploadObjectKey({
      fileName: '  ../page 001 (final)?.png  ',
      jobId: 'job-1',
      pageNumber: 1,
    });

    expect(objectKey).toBe('jobs/job-1/uploads/0001-page-001-final-.png');
  });

  it('falls back to page when the file name sanitizes to an empty value', () => {
    const objectKey = buildJobUploadObjectKey({
      fileName: '.....',
      jobId: 'job-2',
      pageNumber: 9,
    });

    expect(objectKey).toBe('jobs/job-2/uploads/0009-page');
  });
});
