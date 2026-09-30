import { describe, expect, it } from 'vitest';

import { scaleOcrBlockTypographyForPlacement } from '@/server/jobs/ocr-block-typography-scaling';
import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

describe('OCR typography placement scaling', () => {
  it('rescales inclined geometry in the restored page coordinate space', () => {
    const block: NormalizedOcrPage['blocks'][number] = {
      angle: 15,
      height: 60,
      orientedHeight: 30,
      orientedWidth: 90,
      orientedX: 55,
      orientedY: 65,
      symHeight: 24,
      symWidth: 14,
      text: 'Inclined',
      width: 100,
      x: 50,
      y: 50,
    };

    const scaled = scaleOcrBlockTypographyForPlacement({
      block,
      clipBounds: { bottom: 300, left: 0, right: 300, top: 0 },
      offsetX: 0,
      offsetY: 0,
      scaleX: 2,
      scaleY: 2,
    });

    expect(scaled.angle).toBeCloseTo(15);
    expect(scaled.orientedHeight).toBeCloseTo(60);
    expect(scaled.orientedWidth).toBeCloseTo(180);
    expect(scaled.orientedX).toBeCloseTo(110);
    expect(scaled.orientedY).toBeCloseTo(130);
  });

  it('rescales category heights and original typography snapshots immutably', () => {
    const block: NormalizedOcrPage['blocks'][number] = {
      angle: 3,
      groupingBounds: { height: 30, width: 40, x: 7, y: 15 },
      hasLetterOrDigit: true,
      height: 60,
      sourceTypography: [
        {
          angle: 2,
          hasLetterOrDigit: true,
          symbolMetrics: {
            lowercase: { count: 4, height: 10 },
            uppercase: { count: 2, height: 14 },
          },
          symHeight: 12,
        },
        { angle: 3, hasLetterOrDigit: false, symHeight: 3 },
      ],
      symbolMetrics: {
        digit: { count: 3, height: 13 },
        lowercase: { count: 4, height: 10 },
        uncased: { count: 1, height: 12 },
        uppercase: { count: 2, height: 14 },
      },
      symHeight: 12,
      symWidth: 7,
      text: 'Test 123',
      width: 80,
      x: 5,
      y: 12,
    };
    const original = structuredClone(block);
    const scaled = scaleOcrBlockTypographyForPlacement({
      block,
      clipBounds: { bottom: 20, left: 0, right: 30, top: 0 },
      offsetX: 10,
      offsetY: 20,
      scaleX: 2,
      scaleY: 3,
    });

    expect(scaled).toMatchObject({
      angle: 3,
      groupingBounds: { height: 60, width: 60, x: 0, y: 0 },
      hasLetterOrDigit: true,
      sourceTypography: [
        {
          angle: 2,
          hasLetterOrDigit: true,
          symbolMetrics: {
            lowercase: { count: 4, height: 30 },
            uppercase: { count: 2, height: 42 },
          },
          symHeight: 36,
        },
        { angle: 3, hasLetterOrDigit: false, symHeight: 9 },
      ],
      symbolMetrics: {
        digit: { count: 3, height: 39 },
        lowercase: { count: 4, height: 30 },
        uncased: { count: 1, height: 36 },
        uppercase: { count: 2, height: 42 },
      },
      symHeight: 36,
      symWidth: 14,
    });
    expect(block).toEqual(original);
    expect(scaled.sourceTypography).not.toBe(block.sourceTypography);
    expect(scaled.symbolMetrics?.lowercase).not.toBe(
      block.symbolMetrics?.lowercase
    );
    expect(scaled.sourceTypography?.[0]?.symbolMetrics?.lowercase).not.toBe(
      block.sourceTypography?.[0]?.symbolMetrics?.lowercase
    );
  });

  it('keeps legacy blocks free of new optional metadata', () => {
    const block: NormalizedOcrPage['blocks'][number] = {
      angle: 5,
      height: 20,
      symHeight: 10,
      symWidth: 7,
      text: 'Legacy',
      width: 40,
      x: 10,
      y: 20,
    };
    expect(
      scaleOcrBlockTypographyForPlacement({
        block,
        clipBounds: { bottom: 100, left: 0, right: 100, top: 0 },
        offsetX: 0,
        offsetY: 0,
        scaleX: 2,
        scaleY: 3,
      })
    ).toEqual({ ...block, symHeight: 30, symWidth: 14 });
  });

  it('removes a grouping area entirely outside the clipped page', () => {
    expect(
      scaleOcrBlockTypographyForPlacement({
        block: {
          angle: 0,
          groupingBounds: { height: 10, width: 10, x: -20, y: -20 },
          height: 20,
          symHeight: 10,
          symWidth: 7,
          text: 'Clipped',
          width: 40,
          x: -20,
          y: -20,
        },
        clipBounds: { bottom: 100, left: 0, right: 100, top: 0 },
        offsetX: 0,
        offsetY: 0,
        scaleX: 2,
        scaleY: 3,
      }).groupingBounds
    ).toBeUndefined();
  });
});
