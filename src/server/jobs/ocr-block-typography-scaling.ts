import {
  hasOcrBlockOrientedGeometry,
  scaleOcrBlockOrientedGeometryForPlacement,
} from '@/server/jobs/ocr-block-oriented-geometry';
import {
  type NormalizedOcrPage,
  OCR_SYMBOL_CATEGORIES,
  type OcrBlockTypography,
  type OcrSymbolMetrics,
} from '@/server/provider-gateway/schema';

type OcrBlock = NormalizedOcrPage['blocks'][number];
type PlacementClipBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export function scaleOcrBlockTypographyForPlacement(input: {
  block: OcrBlock;
  clipBounds: PlacementClipBounds;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}): OcrBlock {
  const orientedGeometry = scaleOcrBlockOrientedGeometryForPlacement(input);

  return {
    ...scaleTypography(input.block, input.scaleY),
    ...(orientedGeometry ??
      (hasOcrBlockOrientedGeometry(input.block)
        ? {
            orientedHeight: undefined,
            orientedWidth: undefined,
            orientedX: undefined,
            orientedY: undefined,
          }
        : {})),
    ...(input.block.sourceTypography
      ? {
          sourceTypography: input.block.sourceTypography.map((typography) =>
            scaleTypography(typography, input.scaleY)
          ),
        }
      : {}),
    ...(input.block.groupingBounds
      ? { groupingBounds: scaleGroupingBounds(input) }
      : {}),
    symWidth: input.block.symWidth * input.scaleX,
  };
}

function scaleTypography<T extends OcrBlockTypography>(
  typography: T,
  scaleY: number
): T {
  return {
    ...typography,
    ...(typography.symbolMetrics
      ? { symbolMetrics: scaleSymbolMetrics(typography.symbolMetrics, scaleY) }
      : {}),
    symHeight: typography.symHeight * scaleY,
  };
}

function scaleSymbolMetrics(
  symbolMetrics: OcrSymbolMetrics,
  scaleY: number
): OcrSymbolMetrics {
  const scaledMetrics: OcrSymbolMetrics = {};
  for (const category of OCR_SYMBOL_CATEGORIES) {
    const metric = symbolMetrics[category];
    if (metric) {
      scaledMetrics[category] = {
        ...metric,
        height: metric.height * scaleY,
      };
    }
  }
  return scaledMetrics;
}

function scaleGroupingBounds(
  input: Parameters<typeof scaleOcrBlockTypographyForPlacement>[0]
): OcrBlock['groupingBounds'] {
  const bounds = input.block.groupingBounds!;
  const left = Math.max(bounds.x - input.offsetX, input.clipBounds.left);
  const top = Math.max(bounds.y - input.offsetY, input.clipBounds.top);
  const right = Math.min(
    bounds.x - input.offsetX + bounds.width,
    input.clipBounds.right
  );
  const bottom = Math.min(
    bounds.y - input.offsetY + bounds.height,
    input.clipBounds.bottom
  );
  return right > left && bottom > top
    ? {
        height: (bottom - top) * input.scaleY,
        width: (right - left) * input.scaleX,
        x: left * input.scaleX,
        y: top * input.scaleY,
      }
    : undefined;
}
