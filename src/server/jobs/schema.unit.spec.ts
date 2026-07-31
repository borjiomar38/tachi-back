import { describe, expect, it } from 'vitest';

import {
  zCreateTranslationJobInput,
  zTranslationJobOcrUploadMetadata,
  zTranslationJobUploadSourcePages,
} from '@/server/jobs/schema';

const legacySourcePage = {
  fileName: '001.jpg',
  height: 1333,
  offsetX: 0,
  offsetY: 0,
  width: 2000,
};

describe('translation job upload source page schema', () => {
  it('keeps legacy OCR batch metadata valid', () => {
    expect(zTranslationJobUploadSourcePages.parse([legacySourcePage])).toEqual([
      legacySourcePage,
    ]);
  });

  it('accepts original dimensions for every resized source page', () => {
    const sourcePages = [
      {
        ...legacySourcePage,
        originalHeight: 1667,
        originalWidth: 2500,
      },
      {
        fileName: '002.jpg',
        height: 1000,
        offsetX: 0,
        offsetY: 1333,
        originalHeight: 1250,
        originalWidth: 2500,
        width: 2000,
      },
    ];

    expect(zTranslationJobUploadSourcePages.parse(sourcePages)).toEqual(
      sourcePages
    );
  });

  it('rejects an original dimension without its pair', () => {
    const result = zTranslationJobUploadSourcePages.safeParse([
      {
        ...legacySourcePage,
        originalWidth: 2500,
      },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [0, 'originalHeight'],
          }),
        ])
      );
    }
  });

  it('rejects mixed legacy and resized metadata within one batch', () => {
    const result = zTranslationJobUploadSourcePages.safeParse([
      {
        ...legacySourcePage,
        originalHeight: 1667,
        originalWidth: 2500,
      },
      {
        ...legacySourcePage,
        fileName: '002.jpg',
        offsetY: 1333,
      },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [1, 'originalWidth'],
          }),
        ])
      );
    }
  });

  it('rejects original dimensions smaller than uploaded OCR dimensions', () => {
    const result = zTranslationJobUploadSourcePages.safeParse([
      {
        ...legacySourcePage,
        originalHeight: 1200,
        originalWidth: 1900,
      },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [0, 'originalWidth'],
          }),
        ])
      );
    }
  });

  it('keeps legacy v2 logical fragments valid without restored dimensions', () => {
    const sourcePages = [
      {
        ...legacySourcePage,
        fileName: '001__001.jpg',
        height: 100,
        logicalFileName: '001.jpg',
        logicalHeight: 200,
        logicalOffsetX: 0,
        logicalOffsetY: 0,
        logicalPageNumber: 1,
        logicalWidth: 80,
        width: 80,
      },
      {
        ...legacySourcePage,
        fileName: '001__002.jpg',
        height: 100,
        logicalFileName: '001.jpg',
        logicalHeight: 200,
        logicalOffsetX: 0,
        logicalOffsetY: 100,
        logicalPageNumber: 1,
        logicalWidth: 80,
        offsetY: 100,
        width: 80,
      },
    ];

    expect(zTranslationJobUploadSourcePages.parse(sourcePages)).toEqual(
      sourcePages
    );
  });

  it('rejects restored fragments that extend beyond the logical canvas', () => {
    const result = zTranslationJobUploadSourcePages.safeParse([
      {
        ...legacySourcePage,
        height: 100,
        logicalFileName: '001.jpg',
        logicalHeight: 500,
        logicalOffsetX: 1,
        logicalOffsetY: 251,
        logicalPageNumber: 1,
        logicalWidth: 200,
        originalHeight: 250,
        originalWidth: 200,
        width: 80,
      },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [0, 'logicalWidth'],
          }),
          expect.objectContaining({
            path: [0, 'logicalHeight'],
          }),
        ])
      );
    }
  });

  it('rejects negative logical offsets', () => {
    const result = zTranslationJobUploadSourcePages.safeParse([
      {
        ...legacySourcePage,
        logicalFileName: '001.jpg',
        logicalHeight: 1333,
        logicalOffsetX: -1,
        logicalOffsetY: 0,
        logicalPageNumber: 1,
        logicalWidth: 2000,
      },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [0, 'logicalOffsetX'],
          }),
        ])
      );
    }
  });

  it('rejects inconsistent logical geometry across separate upload batches', () => {
    const result = zCreateTranslationJobInput.safeParse({
      pages: [
        {
          fileName: 'ocr-batch-0001.webp',
          mimeType: 'image/webp',
          sizeBytes: 1000,
          sourcePages: [
            {
              fileName: '001__001.jpg',
              height: 100,
              logicalFileName: '001.jpg',
              logicalHeight: 500,
              logicalOffsetX: 0,
              logicalOffsetY: 0,
              logicalPageNumber: 1,
              logicalWidth: 200,
              offsetX: 0,
              offsetY: 0,
              originalHeight: 250,
              originalWidth: 200,
              width: 80,
            },
          ],
        },
        {
          fileName: 'ocr-batch-0002.webp',
          mimeType: 'image/webp',
          sizeBytes: 1000,
          sourcePages: [
            {
              fileName: '001__002.jpg',
              height: 100,
              logicalFileName: '001.jpg',
              logicalHeight: 501,
              logicalOffsetX: 0,
              logicalOffsetY: 250,
              logicalPageNumber: 2,
              logicalWidth: 201,
              offsetX: 0,
              offsetY: 0,
              originalHeight: 250,
              originalWidth: 200,
              width: 80,
            },
          ],
        },
      ],
      targetLanguage: 'en',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['pages', 1, 'sourcePages', 0, 'logicalHeight'],
          }),
          expect.objectContaining({
            path: ['pages', 1, 'sourcePages', 0, 'logicalPageNumber'],
          }),
          expect.objectContaining({
            path: ['pages', 1, 'sourcePages', 0, 'logicalWidth'],
          }),
        ])
      );
    }
  });
});

describe('translation job OCR upload observability schema', () => {
  it('keeps create-job requests without OCR upload metadata valid', () => {
    expect(
      zCreateTranslationJobInput.parse({
        pages: [
          {
            fileName: '001.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1_024,
          },
        ],
        targetLanguage: 'en',
      }).ocrUpload
    ).toBeUndefined();
  });

  it('accepts a strict WebP policy snapshot even when encoding grew the upload', () => {
    const metadata = {
      mode: 'webp' as const,
      originalTotalBytes: 1_000,
      policyRevision: 'ocr-upload-v1-0123456789abcdef',
      policyVersion: 1 as const,
      preparedTotalBytes: 1_100,
      profile: 'custom' as const,
    };

    expect(zTranslationJobOcrUploadMetadata.parse(metadata)).toEqual(metadata);
  });

  it('accepts changed byte totals for an Original legacy fragment fallback', () => {
    const metadata = {
      mode: 'original',
      originalTotalBytes: 2_000,
      policyRevision: 'ocr-upload-v1-0123456789abcdef',
      policyVersion: 1 as const,
      preparedTotalBytes: 1_900,
      profile: 'original' as const,
    };

    expect(zTranslationJobOcrUploadMetadata.parse(metadata)).toEqual(metadata);
  });

  it('rejects a non-Original profile paired with Original mode', () => {
    expect(
      zTranslationJobOcrUploadMetadata.safeParse({
        mode: 'original',
        originalTotalBytes: 2_000,
        policyRevision: 'ocr-upload-v1-0123456789abcdef',
        policyVersion: 1,
        preparedTotalBytes: 1_900,
        profile: 'safe',
      }).success
    ).toBe(false);
  });

  it('accepts mixed MIME pages when a WebP policy falls back safely', () => {
    expect(
      zCreateTranslationJobInput.safeParse({
        ocrUpload: {
          mode: 'webp',
          originalTotalBytes: 5_000,
          policyRevision: 'ocr-upload-v1-0123456789abcdef',
          policyVersion: 1,
          preparedTotalBytes: 3_000,
          profile: 'safe',
        },
        pages: [
          {
            fileName: '001.webp',
            mimeType: 'image/webp',
            sizeBytes: 2_000,
          },
          {
            fileName: '002.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1_000,
          },
        ],
        targetLanguage: 'en',
      }).success
    ).toBe(true);
  });

  it('rejects a prepared byte total that does not match the WebP pages', () => {
    const result = zCreateTranslationJobInput.safeParse({
      ocrUpload: {
        mode: 'webp',
        originalTotalBytes: 5_000,
        policyRevision: 'ocr-upload-v1-0123456789abcdef',
        policyVersion: 1,
        preparedTotalBytes: 3_000,
        profile: 'safe',
      },
      pages: [
        {
          fileName: '001.webp',
          mimeType: 'image/webp',
          sizeBytes: 2_999,
        },
      ],
      targetLanguage: 'en',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['ocrUpload', 'preparedTotalBytes'],
          }),
        ])
      );
    }
  });
});
