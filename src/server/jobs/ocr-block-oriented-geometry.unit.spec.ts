import { describe, expect, it } from 'vitest';

import {
  mergeOcrBlockOrientedGeometry,
  scaleOcrBlockOrientedGeometryForPlacement,
} from '@/server/jobs/ocr-block-oriented-geometry';
import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

type OcrBlock = NormalizedOcrPage['blocks'][number];

describe('OCR block oriented geometry', () => {
  it('encloses merged blocks in their shared inclined coordinate space', () => {
    const angle = 20;
    const radians = (angle * Math.PI) / 180;
    const first = block({
      angle,
      orientedHeight: 30,
      orientedWidth: 100,
      orientedX: 100,
      orientedY: 100,
    });
    const centerOffsetX = Math.cos(radians) * 120;
    const centerOffsetY = Math.sin(radians) * 120;
    const second = block({
      angle,
      orientedHeight: 30,
      orientedWidth: 100,
      orientedX: first.orientedX! + centerOffsetX,
      orientedY: first.orientedY! + centerOffsetY,
    });

    const merged = mergeOcrBlockOrientedGeometry([first, second]);

    expect(merged?.angle).toBeCloseTo(angle);
    expect(merged?.orientedWidth).toBeCloseTo(220);
    expect(merged?.orientedHeight).toBeCloseTo(30);
  });

  it('keeps circular angles stable across the minus-180 boundary', () => {
    const merged = mergeOcrBlockOrientedGeometry([
      block({ angle: 179 }),
      block({ angle: -179 }),
    ]);

    expect(Math.abs(merged?.angle ?? 0)).toBeCloseTo(180);
  });

  it('transforms the oriented rectangle and angle with page placement scaling', () => {
    const scaled = scaleOcrBlockOrientedGeometryForPlacement({
      block: block({
        angle: 30,
        height: 112,
        orientedHeight: 40,
        orientedWidth: 120,
        orientedX: 100,
        orientedY: 200,
        width: 124,
        x: 98,
        y: 164,
      }),
      clipBounds: { bottom: 400, left: 0, right: 400, top: 0 },
      offsetX: 50,
      offsetY: 100,
      scaleX: 2,
      scaleY: 3,
    });

    expect(scaled?.angle).toBeCloseTo(40.8934, 3);
    expect(scaled?.orientedHeight).toBeGreaterThan(0);
    expect(scaled?.orientedWidth).toBeGreaterThan(0);
  });

  it('drops oriented geometry when the OCR block is clipped at a page edge', () => {
    expect(
      scaleOcrBlockOrientedGeometryForPlacement({
        block: block({ height: 30, width: 60, x: -10, y: 20 }),
        clipBounds: { bottom: 100, left: 0, right: 100, top: 0 },
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
      })
    ).toBeNull();
  });
});

function block(overrides: Partial<OcrBlock> = {}): OcrBlock {
  return {
    angle: 12,
    height: 40,
    orientedHeight: 30,
    orientedWidth: 100,
    orientedX: 100,
    orientedY: 100,
    symHeight: 30,
    symWidth: 18,
    text: 'TEXT',
    width: 104,
    x: 98,
    y: 95,
    ...overrides,
  };
}
