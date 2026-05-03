import { describe, expect, it } from 'vitest';

import {
  analyzeTranslationManifestOcr,
  selectTopOcrGroupingIssues,
  summarizeOcrManifestAnalyses,
} from './ocr-cache-analysis';
import { type TranslationJobResultManifest } from './schema';

describe('OCR cache analysis', () => {
  it('flags a huge translated block as a possible over-merge', () => {
    const manifest = buildManifest({
      blocks: [
        block({
          height: 150,
          symHeight: 15,
          text: 'FIRST SENTENCE. SECOND SENTENCE? THIRD SENTENCE!',
          translation: 'translated text',
          width: 300,
          x: 80,
          y: 120,
        }),
      ],
    });

    const analysis = analyzeTranslationManifestOcr({
      cacheKey: 'cache-1',
      chapterCacheKey: 'chapter-1',
      manifest,
    });

    expect(analysis.issues).toContainEqual(
      expect.objectContaining({
        blockIndex: 0,
        kind: 'possible_overmerged_block',
        pageKey: '001.jpg',
        severity: 'critical',
      })
    );
  });

  it('flags adjacent blocks that look like one missed bubble group', () => {
    const manifest = buildManifest({
      blocks: [
        block({ text: 'FIRST LINE', x: 100, y: 100 }),
        block({ text: 'SECOND LINE', x: 102, y: 123 }),
      ],
    });

    const analysis = analyzeTranslationManifestOcr({
      cacheKey: 'cache-2',
      chapterCacheKey: 'chapter-2',
      manifest,
    });

    expect(analysis.issues).toContainEqual(
      expect.objectContaining({
        kind: 'possible_undermerged_neighbors',
        neighborIndexes: [0, 1],
        pageKey: '001.jpg',
      })
    );
  });

  it('summarizes and ranks detected grouping issues', () => {
    const analyses = [
      analyzeTranslationManifestOcr({
        manifest: buildManifest({
          blocks: [
            block({
              height: 150,
              symHeight: 15,
              text: 'ONE. TWO? THREE!',
              width: 300,
            }),
          ],
        }),
      }),
      analyzeTranslationManifestOcr({
        manifest: buildManifest({
          blocks: [
            block({ text: 'FIRST LINE', x: 100, y: 100 }),
            block({ text: 'SECOND LINE', x: 102, y: 123 }),
          ],
        }),
      }),
    ];

    const summary = summarizeOcrManifestAnalyses(analyses);
    const topIssues = selectTopOcrGroupingIssues(analyses, 1);

    expect(summary.issueCount).toBeGreaterThanOrEqual(2);
    expect(summary.issuesByKind.possible_overmerged_block).toBe(1);
    expect(topIssues[0]?.severity).toBe('critical');
  });
});

function buildManifest(input: {
  blocks: TranslationJobResultManifest['pages'][string]['blocks'];
}): TranslationJobResultManifest {
  return {
    completedAt: new Date('2026-05-03T00:00:00.000Z'),
    deviceId: 'device',
    jobId: 'job',
    licenseId: 'license',
    pageCount: 1,
    pageOrder: ['001.jpg'],
    pages: {
      '001.jpg': {
        blocks: input.blocks,
        imgHeight: 900,
        imgWidth: 700,
        sourceLanguage: 'en',
        targetLanguage: 'ar',
        translatorType: 'gemini',
      },
    },
    sourceLanguage: 'en',
    targetLanguage: 'ar',
    translatorType: 'gemini',
    version: '2026-03-20.phase11.v1',
  };
}

function block(
  overrides: Partial<
    TranslationJobResultManifest['pages'][string]['blocks'][number]
  >
): TranslationJobResultManifest['pages'][string]['blocks'][number] {
  return {
    angle: 0,
    height: 20,
    symHeight: 12,
    symWidth: 8,
    text: 'TEXT',
    translation: 'translation',
    width: 120,
    x: 100,
    y: 100,
    ...overrides,
  };
}
