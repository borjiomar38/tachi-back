import {
  type NormalizedOcrPage,
  OCR_SYMBOL_CATEGORIES,
  type OcrBlockTypography,
} from '@/server/provider-gateway/schema';

type OcrBlockWithTypographySources = Pick<
  NormalizedOcrPage['blocks'][number],
  | 'angle'
  | 'hasLetterOrDigit'
  | 'sourceTypography'
  | 'symbolMetrics'
  | 'symHeight'
> &
  Partial<Pick<NormalizedOcrPage['blocks'][number], 'text'>>;

const MIN_SYMBOL_HEIGHT_RATIO = 0.8;
const MAX_ANGLE_DIFFERENCE_DEGREES = 8;
const MIN_CATEGORY_SYMBOL_COUNT = 2;

export function canMergeOcrBlockTypography(
  blocks: readonly OcrBlockWithTypographySources[]
): boolean {
  const sourceTypography = getOcrBlockSourceTypography(blocks).filter(
    (block) => block.hasLetterOrDigit !== false
  );

  if (sourceTypography.length === 0) {
    return false;
  }

  if (
    sourceTypography.some(
      (block) =>
        !Number.isFinite(block.symHeight) ||
        block.symHeight <= 0 ||
        !Number.isFinite(block.angle)
    )
  ) {
    return false;
  }

  return sourceTypography.every((block, index) =>
    sourceTypography
      .slice(index + 1)
      .every(
        (otherBlock) =>
          getCircularAngleDifference(block.angle, otherBlock.angle) <=
            MAX_ANGLE_DIFFERENCE_DEGREES &&
          haveCompatibleOcrSymbolSizes(block, otherBlock)
      )
  );
}

export function getOcrBlockSourceTypography(
  blocks: readonly OcrBlockWithTypographySources[]
): OcrBlockTypography[] {
  return blocks.flatMap((block) => {
    const sources = block.sourceTypography ?? [
      {
        angle: block.angle,
        ...getOcrTextEvidence(block),
        ...(block.symbolMetrics ? { symbolMetrics: block.symbolMetrics } : {}),
        symHeight: block.symHeight,
      },
    ];

    return block.text && isStrictOcrPunctuationText(block.text)
      ? sources.map((source) => ({ ...source, hasLetterOrDigit: false }))
      : sources;
  });
}

export function isStrictOcrPunctuationText(text: string): boolean {
  return text.trim().length > 0 && /^[\p{P}\s]+$/u.test(text);
}

export function canAttachOcrPunctuationAngle(
  core: OcrBlockWithTypographySources,
  punctuation: OcrBlockWithTypographySources
): boolean {
  const coreTypography = getOcrBlockSourceTypography([core]).filter(
    (block) => block.hasLetterOrDigit !== false
  );
  return (
    coreTypography.length > 0 &&
    Number.isFinite(punctuation.angle) &&
    coreTypography.every(
      (block) =>
        Number.isFinite(block.angle) &&
        getCircularAngleDifference(block.angle, punctuation.angle) <=
          MAX_ANGLE_DIFFERENCE_DEGREES
    )
  );
}

function getOcrTextEvidence(
  block: OcrBlockWithTypographySources
): Pick<OcrBlockTypography, 'hasLetterOrDigit'> {
  if (block.text && isStrictOcrPunctuationText(block.text)) {
    return { hasLetterOrDigit: false };
  }

  return block.hasLetterOrDigit == null
    ? {}
    : { hasLetterOrDigit: block.hasLetterOrDigit };
}

function haveCompatibleOcrSymbolSizes(
  left: OcrBlockTypography,
  right: OcrBlockTypography
): boolean {
  if (left.hasLetterOrDigit === false || right.hasLetterOrDigit === false) {
    return true;
  }

  if (!left.symbolMetrics || !right.symbolMetrics) {
    return haveCompatibleSymbolHeights(left.symHeight, right.symHeight);
  }

  return OCR_SYMBOL_CATEGORIES.every((category) => {
    const leftMetric = left.symbolMetrics?.[category];
    const rightMetric = right.symbolMetrics?.[category];

    if (
      !leftMetric ||
      !rightMetric ||
      leftMetric.count < MIN_CATEGORY_SYMBOL_COUNT ||
      rightMetric.count < MIN_CATEGORY_SYMBOL_COUNT
    ) {
      return true;
    }

    return haveCompatibleSymbolHeights(leftMetric.height, rightMetric.height);
  });
}

function haveCompatibleSymbolHeights(left: number, right: number): boolean {
  return (
    Number.isFinite(left) &&
    Number.isFinite(right) &&
    left > 0 &&
    right > 0 &&
    Math.min(left, right) / Math.max(left, right) >= MIN_SYMBOL_HEIGHT_RATIO
  );
}

function getCircularAngleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 360;
  return Math.min(difference, 360 - difference);
}
