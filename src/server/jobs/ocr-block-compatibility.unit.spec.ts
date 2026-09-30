import { describe, expect, it } from 'vitest';

import {
  canAttachOcrPunctuationAngle,
  canMergeOcrBlockTypography,
  getOcrBlockSourceTypography,
} from '@/server/jobs/ocr-block-compatibility';

describe('OCR block typography compatibility', () => {
  it('accepts comparable letter heights up to the inclusive size tolerance', () => {
    expect(
      canMergeOcrBlockTypography([
        { angle: 0, symHeight: 20 },
        { angle: 0, symHeight: 25 },
      ])
    ).toBe(true);
    expect(
      canMergeOcrBlockTypography([
        { angle: 0, symHeight: 20 },
        { angle: 0, symHeight: 25.1 },
      ])
    ).toBe(false);
  });

  it.each([
    { firstAngle: -4, secondAngle: 4, expected: true },
    { firstAngle: 179, secondAngle: -179, expected: true },
    { firstAngle: 358, secondAngle: 2, expected: true },
    { firstAngle: 0, secondAngle: 8.1, expected: false },
    { firstAngle: 0, secondAngle: 180, expected: false },
  ])(
    'checks circular angle distance for $firstAngle and $secondAngle degrees',
    ({ firstAngle, secondAngle, expected }) => {
      expect(
        canMergeOcrBlockTypography([
          { angle: firstAngle, symHeight: 20 },
          { angle: secondAngle, symHeight: 20 },
        ])
      ).toBe(expected);
    }
  );

  it('rejects size drift even when each successive pair is compatible', () => {
    const blocks = [
      { angle: 0, symHeight: 20 },
      { angle: 0, symHeight: 24 },
      { angle: 0, symHeight: 28 },
    ];

    expect(canMergeOcrBlockTypography(blocks.slice(0, 2))).toBe(true);
    expect(canMergeOcrBlockTypography(blocks.slice(1))).toBe(true);
    expect(canMergeOcrBlockTypography(blocks)).toBe(false);
  });

  it('rejects angle drift even when each successive pair is compatible', () => {
    const blocks = [
      { angle: 0, symHeight: 20 },
      { angle: 6, symHeight: 20 },
      { angle: 12, symHeight: 20 },
    ];

    expect(canMergeOcrBlockTypography(blocks.slice(0, 2))).toBe(true);
    expect(canMergeOcrBlockTypography(blocks.slice(1))).toBe(true);
    expect(canMergeOcrBlockTypography(blocks)).toBe(false);
  });

  it('vetoes different heights only within reliable shared character categories', () => {
    expect(
      canMergeOcrBlockTypography([
        {
          angle: 0,
          symbolMetrics: { uppercase: { count: 3, height: 20 } },
          symHeight: 20,
        },
        {
          angle: 0,
          symbolMetrics: { uppercase: { count: 4, height: 30 } },
          symHeight: 30,
        },
      ])
    ).toBe(false);
  });

  it('does not compare uppercase height against lowercase height', () => {
    expect(
      canMergeOcrBlockTypography([
        {
          angle: 0,
          symbolMetrics: { uppercase: { count: 3, height: 30 } },
          symHeight: 30,
        },
        {
          angle: 0,
          symbolMetrics: { lowercase: { count: 4, height: 20 } },
          symHeight: 20,
        },
      ])
    ).toBe(true);
  });

  it('uses shared lowercase evidence in mixed-case text', () => {
    expect(
      canMergeOcrBlockTypography([
        {
          angle: 0,
          symbolMetrics: {
            lowercase: { count: 4, height: 20 },
            uppercase: { count: 1, height: 30 },
          },
          symHeight: 30,
        },
        {
          angle: 0,
          symbolMetrics: {
            lowercase: { count: 4, height: 21 },
            uppercase: { count: 1, height: 40 },
          },
          symHeight: 21,
        },
      ])
    ).toBe(true);
  });

  it('does not treat a single uppercase initial as a reliable size veto', () => {
    expect(
      canMergeOcrBlockTypography([
        {
          angle: 0,
          symbolMetrics: { uppercase: { count: 1, height: 30 } },
          symHeight: 30,
        },
        {
          angle: 0,
          symbolMetrics: { uppercase: { count: 3, height: 20 } },
          symHeight: 20,
        },
      ])
    ).toBe(true);
  });

  it('retains legacy size safeguards when category metadata is missing', () => {
    expect(
      canMergeOcrBlockTypography([
        {
          angle: 0,
          symbolMetrics: { lowercase: { count: 3, height: 30 } },
          symHeight: 30,
        },
        { angle: 0, symHeight: 20 },
      ])
    ).toBe(false);
  });

  it('retains category evidence in original snapshots across merges', () => {
    const original = {
      angle: 0,
      hasLetterOrDigit: true,
      symbolMetrics: { lowercase: { count: 3, height: 20 } },
      symHeight: 20,
    };

    expect(getOcrBlockSourceTypography([original])).toEqual([original]);
  });

  it('ignores attached punctuation as later core size or angle evidence', () => {
    expect(
      canMergeOcrBlockTypography([
        {
          angle: 0,
          sourceTypography: [
            { angle: 0, symHeight: 20 },
            { angle: 8, hasLetterOrDigit: false, symHeight: 4 },
          ],
          symHeight: 20,
        },
        { angle: -2, symHeight: 20 },
      ])
    ).toBe(true);
  });

  it('checks punctuation attachment angle against every original core angle', () => {
    expect(
      canAttachOcrPunctuationAngle(
        {
          angle: 0,
          sourceTypography: [
            { angle: 0, symHeight: 20 },
            { angle: 4, symHeight: 20 },
          ],
          symHeight: 20,
        },
        { angle: -6, hasLetterOrDigit: false, symHeight: 4 }
      )
    ).toBe(false);
  });

  it('marks strict legacy punctuation snapshots as non-letter evidence', () => {
    expect(
      getOcrBlockSourceTypography([{ angle: 0, symHeight: 4, text: '...' }])
    ).toEqual([{ angle: 0, hasLetterOrDigit: false, symHeight: 4 }]);
  });

  it('marks existing legacy punctuation provenance as non-letter evidence', () => {
    expect(
      getOcrBlockSourceTypography([
        {
          angle: 0,
          sourceTypography: [{ angle: 0, symHeight: 4 }],
          symHeight: 4,
          text: '...',
        },
      ])
    ).toEqual([{ angle: 0, hasLetterOrDigit: false, symHeight: 4 }]);
  });

  it('checks the original letter heights when an existing group exposes an average', () => {
    expect(
      canMergeOcrBlockTypography([
        {
          angle: 0,
          sourceTypography: [
            { angle: 0, symHeight: 20 },
            { angle: 0, symHeight: 24 },
          ],
          symHeight: 22,
        },
        { angle: 0, symHeight: 26 },
      ])
    ).toBe(false);
  });

  it('flattens previously merged typography without adding aggregate metrics', () => {
    expect(
      getOcrBlockSourceTypography([
        {
          angle: 0,
          sourceTypography: [
            { angle: 0, symHeight: 20 },
            { angle: 0, symHeight: 24 },
          ],
          symHeight: 22,
        },
        { angle: 2, symHeight: 23 },
      ])
    ).toEqual([
      { angle: 0, symHeight: 20 },
      { angle: 0, symHeight: 24 },
      { angle: 2, symHeight: 23 },
    ]);
  });

  it.each([
    { angle: 0, symHeight: 0 },
    { angle: 0, symHeight: Number.NaN },
    { angle: 0, symHeight: Number.POSITIVE_INFINITY },
    { angle: Number.NaN, symHeight: 20 },
  ])('rejects invalid typography measurements', (invalidBlock) => {
    expect(
      canMergeOcrBlockTypography([{ angle: 0, symHeight: 20 }, invalidBlock])
    ).toBe(false);
  });
});
