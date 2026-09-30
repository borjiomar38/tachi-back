import {
  canAttachOcrPunctuationAngle,
  canMergeOcrBlockTypography,
  getOcrBlockSourceTypography,
  isStrictOcrPunctuationText,
} from '@/server/jobs/ocr-block-compatibility';
import { mergeOcrBlockOrientedGeometry } from '@/server/jobs/ocr-block-oriented-geometry';
import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

type OcrLayoutPageLike = {
  ocrPage: NormalizedOcrPage;
};
type OcrBlock = NormalizedOcrPage['blocks'][number];
type OcrBlockBounds = Pick<OcrBlock, 'height' | 'width' | 'x' | 'y'>;

export function isAlreadyGroupedOcrPage(
  page: Pick<NormalizedOcrPage, 'providerModel'>
): boolean {
  return page.providerModel === 'cached_result_manifest';
}

export function applyOcrPageContinuationPolicy<T extends OcrLayoutPageLike>(
  pages: T[],
  layoutMode: 'continuous' | 'paged'
): T[] {
  return layoutMode === 'continuous'
    ? coalesceOcrPageContinuations(pages)
    : pages;
}

export function coalesceOcrLineBlocks(
  ocrPage: NormalizedOcrPage,
  _options: { mobileOcrRegionHints?: unknown } = {}
): NormalizedOcrPage {
  const sanitizedPage = sanitizeOcrPageForGrouping(ocrPage);

  if (
    isAlreadyGroupedOcrPage(sanitizedPage) ||
    sanitizedPage.blocks.length < 2
  ) {
    return sanitizedPage;
  }

  const punctuationBlocks = sanitizedPage.blocks.filter(isPunctuationOnlyBlock);
  const sortedBlocks = sortOcrBlocksForReading(
    sanitizedPage.blocks.filter((block) => !isPunctuationOnlyBlock(block))
  );
  const parent = sortedBlocks.map((_, index) => index);
  const groupMembers = sortedBlocks.map((block) => [block]);
  const find = (index: number): number => {
    const parentIndex = parent[index];

    if (parentIndex == null || parentIndex === index) {
      return index;
    }

    const root = find(parentIndex);
    parent[index] = root;
    return root;
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);

    // A pair can match while the complete group still drifts in size or angle.
    if (
      leftRoot !== rightRoot &&
      canMergeOcrBlockTypography([
        ...groupMembers[leftRoot]!,
        ...groupMembers[rightRoot]!,
      ])
    ) {
      parent[rightRoot] = leftRoot;
      groupMembers[leftRoot] = [
        ...groupMembers[leftRoot]!,
        ...groupMembers[rightRoot]!,
      ];
    }
  };

  for (let leftIndex = 0; leftIndex < sortedBlocks.length; leftIndex += 1) {
    const leftBlock = sortedBlocks[leftIndex];

    if (!leftBlock) {
      continue;
    }

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < sortedBlocks.length;
      rightIndex += 1
    ) {
      const rightBlock = sortedBlocks[rightIndex];

      if (!rightBlock) {
        continue;
      }

      if (shouldCoalesceOcrBlocks(leftBlock, rightBlock, sanitizedPage)) {
        union(leftIndex, rightIndex);
      }
    }
  }

  const groups = new Map<number, NormalizedOcrPage['blocks']>();

  for (const [index, block] of sortedBlocks.entries()) {
    const root = find(index);
    const group = groups.get(root);

    if (group) {
      group.push(block);
    } else {
      groups.set(root, [block]);
    }
  }

  return {
    ...sanitizedPage,
    blocks: sortOcrBlocksForReading(
      attachPunctuationToCoreGroups(
        [...groups.values()].map(mergeOcrBlockGroup),
        punctuationBlocks
      )
    ),
  };
}

export function coalesceOcrPageContinuations<T extends OcrLayoutPageLike>(
  pages: T[]
): T[] {
  if (pages.length < 2) {
    return pages;
  }

  const nextPages = pages.map((page) => ({
    ...page,
    ocrPage: {
      ...page.ocrPage,
      blocks: isAlreadyGroupedOcrPage(page.ocrPage)
        ? [...page.ocrPage.blocks]
        : sortOcrBlocksForReading(page.ocrPage.blocks),
    },
  }));
  for (let pageIndex = 0; pageIndex < nextPages.length - 1; pageIndex += 1) {
    const previousPage = nextPages[pageIndex];
    const nextPage = nextPages[pageIndex + 1];

    if (
      !previousPage ||
      !nextPage ||
      isAlreadyGroupedOcrPage(previousPage.ocrPage) ||
      isAlreadyGroupedOcrPage(nextPage.ocrPage)
    ) {
      continue;
    }

    const previousBlockIndex = findBottomContinuationBlockIndex(
      previousPage.ocrPage
    );
    const nextBlockIndex = findTopContinuationBlockIndex(nextPage.ocrPage);

    if (previousBlockIndex == null || nextBlockIndex == null) {
      continue;
    }

    const previousBlock = previousPage.ocrPage.blocks[previousBlockIndex];
    const nextBlock = nextPage.ocrPage.blocks[nextBlockIndex];

    if (
      !previousBlock ||
      !nextBlock ||
      !shouldCoalesceOcrPageContinuationBlocks({
        nextBlock,
        nextPage: nextPage.ocrPage,
        previousBlock,
        previousPage: previousPage.ocrPage,
      })
    ) {
      continue;
    }

    const combinedText = combineOcrText(previousBlock.text, nextBlock.text);
    const sourceTypography = getOcrBlockSourceTypography([
      previousBlock,
      nextBlock,
    ]);
    const keepPrevious =
      previousBlock.width * previousBlock.height >=
      nextBlock.width * nextBlock.height;

    if (keepPrevious) {
      const mergedBlock = {
        ...previousBlock,
        sourceTypography,
        symHeight: (previousBlock.symHeight + nextBlock.symHeight) / 2,
        symWidth: (previousBlock.symWidth + nextBlock.symWidth) / 2,
        text: combinedText,
      };
      previousPage.ocrPage.blocks[previousBlockIndex] = mergedBlock;
      nextPage.ocrPage.blocks[nextBlockIndex] = toMaskOnlyBlock(nextBlock);
    } else {
      const mergedBlock = {
        ...nextBlock,
        sourceTypography,
        symHeight: (previousBlock.symHeight + nextBlock.symHeight) / 2,
        symWidth: (previousBlock.symWidth + nextBlock.symWidth) / 2,
        text: combinedText,
      };
      nextPage.ocrPage.blocks[nextBlockIndex] = mergedBlock;
      previousPage.ocrPage.blocks[previousBlockIndex] =
        toMaskOnlyBlock(previousBlock);
    }
  }

  return nextPages;
}

export function shouldCoalesceOcrBlocks(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number],
  page?: NormalizedOcrPage
) {
  if (
    isPunctuationOnlyBlock(previousBlock) ||
    isPunctuationOnlyBlock(nextBlock) ||
    previousBlock.hasLetterOrDigit === false ||
    nextBlock.hasLetterOrDigit === false ||
    !hasOcrLetterOrDigit(previousBlock) ||
    !hasOcrLetterOrDigit(nextBlock)
  ) {
    return false;
  }

  if (!canMergeOcrBlockTypography([previousBlock, nextBlock])) {
    return false;
  }

  if (
    previousBlock.renderMode === 'mask_only' ||
    nextBlock.renderMode === 'mask_only'
  ) {
    return false;
  }

  if (
    isLikelyStandaloneWatermarkSource(previousBlock.text) ||
    isLikelyStandaloneWatermarkSource(nextBlock.text)
  ) {
    return false;
  }

  const previousGroupingBlock = getOcrGroupingBlock(previousBlock);
  const nextGroupingBlock = getOcrGroupingBlock(nextBlock);

  if (
    shouldCoalesceVertically(previousGroupingBlock, nextGroupingBlock, page)
  ) {
    return true;
  }

  return page
    ? shouldCoalesceHorizontalRowFragments(
        previousGroupingBlock,
        nextGroupingBlock,
        page
      )
    : false;
}

function shouldCoalesceVertically(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number],
  page?: NormalizedOcrPage
) {
  const averageSymbolHeight = getAverageSymbolHeight(previousBlock, nextBlock);
  const verticalGap = nextBlock.y - (previousBlock.y + previousBlock.height);
  const standardMaxVerticalGap = getMaxVerticalGap(
    previousBlock,
    nextBlock,
    page
  );
  const resolutionScaledMaxVerticalGap = getResolutionScaledMaxVerticalGap(
    previousBlock,
    nextBlock,
    page
  );
  const maxVerticalGap = Math.max(
    standardMaxVerticalGap,
    resolutionScaledMaxVerticalGap
  );
  const maxVerticalOverlap = Math.max(10, averageSymbolHeight * 1.2);
  const previousCenterY = previousBlock.y + previousBlock.height / 2;
  const nextCenterY = nextBlock.y + nextBlock.height / 2;
  const centerYDistance = nextCenterY - previousCenterY;
  const maxLineStep = Math.max(
    42,
    averageSymbolHeight * 3,
    Math.min(previousBlock.height, nextBlock.height) * 0.9
  );

  if (verticalGap > maxVerticalGap) {
    return false;
  }

  if (verticalGap < -maxVerticalOverlap && centerYDistance > maxLineStep) {
    return false;
  }

  const overlap =
    Math.min(
      previousBlock.x + previousBlock.width,
      nextBlock.x + nextBlock.width
    ) - Math.max(previousBlock.x, nextBlock.x);
  const minWidth = Math.min(previousBlock.width, nextBlock.width);
  const overlapRatio = minWidth > 0 ? overlap / minWidth : 0;
  const previousCenter = previousBlock.x + previousBlock.width / 2;
  const nextCenter = nextBlock.x + nextBlock.width / 2;
  const maxCenterDistance = Math.max(
    48,
    averageSymbolHeight * 4,
    Math.min(previousBlock.width, nextBlock.width) * 0.55
  );

  const hasStandardHorizontalAlignment =
    overlapRatio >= 0.25 ||
    Math.abs(previousCenter - nextCenter) <= maxCenterDistance;

  if (!hasStandardHorizontalAlignment) {
    return false;
  }

  if (verticalGap <= standardMaxVerticalGap) {
    return true;
  }

  return page
    ? canUseResolutionScaledVerticalGap({
        averageSymbolHeight,
        nextBlock,
        nextCenter,
        overlapRatio,
        page,
        previousBlock,
        previousCenter,
      })
    : false;
}

function getMaxVerticalGap(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number],
  page?: NormalizedOcrPage
) {
  const averageSymbolHeight = getAverageSymbolHeight(previousBlock, nextBlock);
  const currentGap = Math.max(6, Math.min(24, averageSymbolHeight * 0.85));

  if (!page) {
    return currentGap;
  }

  const pageWidth = Math.max(1, page.imgWidth);
  const verticalScaleRate = clampNumber(
    1.12 - 4.8 * (averageSymbolHeight / pageWidth),
    0.82,
    0.99
  );
  const resolutionScaledGap = Math.min(
    averageSymbolHeight * verticalScaleRate,
    pageWidth * 0.04
  );
  const scaleAwareCap = isAsianSourceLanguage(page.sourceLanguage) ? 44 : 40;
  const scaleAwareGap = Math.min(scaleAwareCap, resolutionScaledGap);

  return Math.max(currentGap, scaleAwareGap);
}

function getResolutionScaledMaxVerticalGap(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number],
  page?: NormalizedOcrPage
) {
  if (!page) {
    return getMaxVerticalGap(previousBlock, nextBlock);
  }

  const averageSymbolHeight = getAverageSymbolHeight(previousBlock, nextBlock);
  const pageWidth = Math.max(1, page.imgWidth);
  const verticalScaleRate = clampNumber(
    1.12 - 4.8 * (averageSymbolHeight / pageWidth),
    0.82,
    0.99
  );

  return Math.min(averageSymbolHeight * verticalScaleRate, pageWidth * 0.04);
}

function canUseResolutionScaledVerticalGap(input: {
  averageSymbolHeight: number;
  nextBlock: NormalizedOcrPage['blocks'][number];
  nextCenter: number;
  overlapRatio: number;
  page: NormalizedOcrPage;
  previousBlock: NormalizedOcrPage['blocks'][number];
  previousCenter: number;
}) {
  const {
    averageSymbolHeight,
    nextBlock,
    nextCenter,
    overlapRatio,
    page,
    previousBlock,
    previousCenter,
  } = input;
  const pageWidth = Math.max(1, page.imgWidth);
  const centerDistance = Math.abs(previousCenter - nextCenter);
  const maxCenterDistance = Math.max(
    12,
    Math.min(pageWidth * 0.02, averageSymbolHeight * 0.5)
  );
  const widthGrowth = nextBlock.width - previousBlock.width;
  const hasCompatibleWidth =
    widthGrowth <= 0 ||
    (widthGrowth <= Math.max(50, pageWidth * 0.08) &&
      widthGrowth <= Math.max(50, previousBlock.width * 0.2));
  const groupLeft = Math.min(previousBlock.x, nextBlock.x);
  const groupTop = Math.min(previousBlock.y, nextBlock.y);
  const groupRight = Math.max(
    previousBlock.x + previousBlock.width,
    nextBlock.x + nextBlock.width
  );
  const groupBottom = Math.max(
    previousBlock.y + previousBlock.height,
    nextBlock.y + nextBlock.height
  );
  const boundingArea = Math.max(
    1,
    (groupRight - groupLeft) * (groupBottom - groupTop)
  );
  const fillRatio =
    (previousBlock.width * previousBlock.height +
      nextBlock.width * nextBlock.height) /
    boundingArea;

  return (
    overlapRatio >= 0.7 &&
    centerDistance <= maxCenterDistance &&
    fillRatio >= 0.55 &&
    hasCompatibleWidth
  );
}

function shouldCoalesceHorizontalRowFragments(
  firstBlock: NormalizedOcrPage['blocks'][number],
  secondBlock: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
) {
  const [leftBlock, rightBlock] =
    firstBlock.x <= secondBlock.x
      ? [firstBlock, secondBlock]
      : [secondBlock, firstBlock];
  const averageSymbolHeight = getAverageSymbolHeight(leftBlock, rightBlock);
  const averageSymbolWidth = (leftBlock.symWidth + rightBlock.symWidth) / 2;
  const horizontalGap = rightBlock.x - (leftBlock.x + leftBlock.width);
  const pageWidth = Math.max(1, page.imgWidth);
  const horizontalScaleRate = clampNumber(
    0.75 - 4.5 * (averageSymbolWidth / pageWidth),
    0.35,
    0.7
  );
  const maxHorizontalGap = Math.min(
    14,
    averageSymbolWidth * horizontalScaleRate,
    pageWidth * 0.02
  );

  if (horizontalGap < 0 || horizontalGap > maxHorizontalGap) {
    return false;
  }

  const verticalOverlap =
    Math.min(leftBlock.y + leftBlock.height, rightBlock.y + rightBlock.height) -
    Math.max(leftBlock.y, rightBlock.y);
  const minHeight = Math.min(leftBlock.height, rightBlock.height);
  const maxHeight = Math.max(leftBlock.height, rightBlock.height);
  const verticalOverlapRatio = minHeight > 0 ? verticalOverlap / minHeight : 0;
  const centerYDistance = Math.abs(
    leftBlock.y + leftBlock.height / 2 - (rightBlock.y + rightBlock.height / 2)
  );
  const maxLineSlots = Math.max(
    leftBlock.height / Math.max(1, leftBlock.symHeight),
    rightBlock.height / Math.max(1, rightBlock.symHeight)
  );
  const heightRatio = maxHeight / Math.max(1, minHeight);

  return (
    verticalOverlapRatio >= 0.6 &&
    centerYDistance <= Math.max(8, averageSymbolHeight * 0.75) &&
    maxLineSlots <= 2.2 &&
    heightRatio <= 2.2
  );
}

function getAverageSymbolHeight(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number]
) {
  return (previousBlock.symHeight + nextBlock.symHeight) / 2;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shouldCoalesceOcrPageContinuationBlocks(input: {
  nextBlock: NormalizedOcrPage['blocks'][number];
  nextPage: NormalizedOcrPage;
  previousBlock: NormalizedOcrPage['blocks'][number];
  previousPage: NormalizedOcrPage;
}) {
  if (
    isPunctuationOnlyBlock(input.previousBlock) ||
    isPunctuationOnlyBlock(input.nextBlock)
  ) {
    return false;
  }

  if (!canMergeOcrBlockTypography([input.previousBlock, input.nextBlock])) {
    return false;
  }

  const previousBlock = getOcrGroupingBlock(input.previousBlock);
  const nextBlock = getOcrGroupingBlock(input.nextBlock);

  if (
    previousBlock.y + previousBlock.height <
      input.previousPage.imgHeight -
        getPageBoundaryMargin(input.previousPage) ||
    nextBlock.y > getPageBoundaryMargin(input.nextPage)
  ) {
    return false;
  }

  if (
    !isTextContinuationCandidate(input.previousBlock) ||
    !isTextContinuationCandidate(input.nextBlock)
  ) {
    return false;
  }

  if (
    !previousTextSuggestsContinuation(input.previousBlock.text) ||
    !nextTextLooksLikeContinuation(input.nextBlock.text)
  ) {
    return false;
  }

  const overlap =
    Math.min(
      previousBlock.x + previousBlock.width,
      nextBlock.x + nextBlock.width
    ) - Math.max(previousBlock.x, nextBlock.x);
  const minWidth = Math.min(previousBlock.width, nextBlock.width);
  const overlapRatio = minWidth > 0 ? overlap / minWidth : 0;
  const previousCenter = previousBlock.x + previousBlock.width / 2;
  const nextCenter = nextBlock.x + nextBlock.width / 2;
  const averageSymbolHeight =
    (input.previousBlock.symHeight + input.nextBlock.symHeight) / 2;
  const maxCenterDistance = Math.max(
    70,
    averageSymbolHeight * 8,
    minWidth * 0.8
  );

  return (
    overlapRatio >= 0.18 ||
    Math.abs(previousCenter - nextCenter) <= maxCenterDistance
  );
}

function mergeOcrBlockGroup(
  blocks: NormalizedOcrPage['blocks']
): NormalizedOcrPage['blocks'][number] {
  if (blocks.length === 1) {
    return blocks[0]!;
  }

  const left = Math.min(...blocks.map((block) => block.x));
  const top = Math.min(...blocks.map((block) => block.y));
  const right = Math.max(...blocks.map((block) => block.x + block.width));
  const bottom = Math.max(...blocks.map((block) => block.y + block.height));
  const orientedGeometry = mergeOcrBlockOrientedGeometry(blocks);

  return {
    angle: orientedGeometry?.angle ?? blocks[0]?.angle ?? 0,
    height: bottom - top,
    ...(blocks.some((block) => block.groupingBounds)
      ? { groupingBounds: getOcrBlockBounds(blocks.map(getOcrGroupingBlock)) }
      : {}),
    sourceTypography: getOcrBlockSourceTypography(blocks),
    ...(orientedGeometry
      ? {
          orientedHeight: orientedGeometry.orientedHeight,
          orientedWidth: orientedGeometry.orientedWidth,
          orientedX: orientedGeometry.orientedX,
          orientedY: orientedGeometry.orientedY,
        }
      : {}),
    symHeight:
      blocks.reduce((sum, block) => sum + block.symHeight, 0) / blocks.length,
    symWidth:
      blocks.reduce((sum, block) => sum + block.symWidth, 0) / blocks.length,
    text: blocks.map((block) => block.text).join(' '),
    width: right - left,
    x: left,
    y: top,
  };
}

function sortOcrBlocksForReading(blocks: NormalizedOcrPage['blocks']) {
  return [...blocks].sort((left, right) => {
    const leftBounds = getOcrGroupingBlock(left);
    const rightBounds = getOcrGroupingBlock(right);
    return leftBounds.y - rightBounds.y || leftBounds.x - rightBounds.x;
  });
}

function isPunctuationOnlyBlock(block: OcrBlock): boolean {
  return (
    block.renderMode !== 'mask_only' && isStrictOcrPunctuationText(block.text)
  );
}

function hasOcrLetterOrDigit(block: OcrBlock): boolean {
  return /[\p{L}\p{N}]/u.test(block.text);
}

function getOcrGroupingBlock(block: OcrBlock): OcrBlock {
  return block.groupingBounds ? { ...block, ...block.groupingBounds } : block;
}

function getOcrBlockBounds(blocks: readonly OcrBlockBounds[]): OcrBlockBounds {
  const x = Math.min(...blocks.map((block) => block.x));
  const y = Math.min(...blocks.map((block) => block.y));
  return {
    height: Math.max(...blocks.map((block) => block.y + block.height)) - y,
    width: Math.max(...blocks.map((block) => block.x + block.width)) - x,
    x,
    y,
  };
}

function attachPunctuationToCoreGroups(
  coreGroups: OcrBlock[],
  punctuationBlocks: OcrBlock[]
): OcrBlock[] {
  const result = [...coreGroups];
  const unattached: OcrBlock[] = [];

  for (const punctuation of punctuationBlocks) {
    const eligibleGroupIndices = coreGroups.flatMap((core, index) =>
      canAttachPunctuationToCore(core, punctuation) ? [index] : []
    );

    if (eligibleGroupIndices.length !== 1) {
      unattached.push(punctuation);
      continue;
    }

    const groupIndex = eligibleGroupIndices[0]!;
    const currentGroup = result[groupIndex]!;
    const core = coreGroups[groupIndex]!;

    if (!canMergeOcrBlockTypography([currentGroup, punctuation])) {
      unattached.push(punctuation);
      continue;
    }

    const fullBounds = getOcrBlockBounds([currentGroup, punctuation]);
    const orientedGeometry = mergeOcrBlockOrientedGeometry([
      currentGroup,
      punctuation,
    ]);
    const textBlocks = [currentGroup, punctuation].sort(
      (left, right) => left.x - right.x
    );
    result[groupIndex] = {
      ...currentGroup,
      ...fullBounds,
      ...orientedGeometry,
      // Rendering covers attached punctuation; later grouping keeps core geometry.
      groupingBounds: getOcrBlockBounds([getOcrGroupingBlock(core)]),
      sourceTypography: getOcrBlockSourceTypography([
        currentGroup,
        punctuation,
      ]),
      text: textBlocks.map((block) => block.text).join(' '),
    };
  }

  return [...result, ...unattached];
}

function canAttachPunctuationToCore(
  core: OcrBlock,
  punctuation: OcrBlock
): boolean {
  if (
    core.renderMode === 'mask_only' ||
    !hasOcrLetterOrDigit(core) ||
    !canAttachOcrPunctuationAngle(core, punctuation)
  ) {
    return false;
  }

  const coreBounds = getOcrGroupingBlock(core);
  const coreTypography = getOcrBlockSourceTypography([core]).filter(
    (block) => block.hasLetterOrDigit !== false
  );
  const symbolHeight =
    coreTypography.reduce((sum, block) => sum + block.symHeight, 0) /
    coreTypography.length;
  const horizontalGap = Math.max(
    0,
    coreBounds.x - (punctuation.x + punctuation.width),
    punctuation.x - (coreBounds.x + coreBounds.width)
  );
  const baselineOffset = Math.abs(
    punctuation.y + punctuation.height - (coreBounds.y + coreBounds.height)
  );

  return (
    horizontalGap <= symbolHeight * 0.75 &&
    baselineOffset <= symbolHeight * 0.35 &&
    punctuation.height <= symbolHeight * 1.5 &&
    punctuation.width <= symbolHeight * 2
  );
}

function findBottomContinuationBlockIndex(ocrPage: NormalizedOcrPage) {
  const margin = getPageBoundaryMargin(ocrPage);

  for (let index = ocrPage.blocks.length - 1; index >= 0; index -= 1) {
    const block = ocrPage.blocks[index];

    if (!block) {
      continue;
    }

    if (isPunctuationOnlyBlock(block)) {
      continue;
    }

    const bounds = getOcrGroupingBlock(block);
    if (bounds.y + bounds.height < ocrPage.imgHeight - margin) {
      return null;
    }

    if (isTextContinuationCandidate(block)) {
      return index;
    }
  }

  return null;
}

function findTopContinuationBlockIndex(ocrPage: NormalizedOcrPage) {
  const margin = getPageBoundaryMargin(ocrPage);

  for (const [index, block] of ocrPage.blocks.entries()) {
    if (isPunctuationOnlyBlock(block)) {
      continue;
    }

    if (getOcrGroupingBlock(block).y > margin) {
      return null;
    }

    if (isTextContinuationCandidate(block)) {
      return index;
    }
  }

  return null;
}

function getPageBoundaryMargin(ocrPage: NormalizedOcrPage) {
  return Math.max(64, Math.min(140, ocrPage.imgHeight * 0.05));
}

function isTextContinuationCandidate(
  block: NormalizedOcrPage['blocks'][number]
) {
  if (block.renderMode === 'mask_only') {
    return false;
  }

  const text = normalizeOcrText(block.text);

  if (text.length < 4 || !/\p{L}/u.test(text)) {
    return false;
  }

  if (
    /\b(?:ACLOUD|COLAMANGA|MANGA|MEROL|RTMTH)\b/i.test(text) ||
    /\.[A-Z]{2,}\b/i.test(text)
  ) {
    return false;
  }

  if (block.symHeight > 45 && text.split(/\s+/).length < 4) {
    return false;
  }

  return true;
}

function sanitizeOcrPageForGrouping(
  ocrPage: NormalizedOcrPage
): NormalizedOcrPage {
  const sanitizedBlocks = ocrPage.blocks
    .map((block) => sanitizeOcrBlockForGrouping(block, ocrPage))
    .filter((block) => !shouldDropOcrBlockBeforeTranslation(block, ocrPage));

  return {
    ...ocrPage,
    blocks: sanitizedBlocks,
  };
}

function shouldDropOcrBlockBeforeTranslation(
  block: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
) {
  if (isAsianSourceLanguage(page.sourceLanguage)) {
    return shouldDropAsianSourcePollutionBlock(block, page);
  }

  return (
    isSuspiciousLargeSparseOcrBlock(block, page) ||
    isLargeDecorativeEastAsianOcrBlock(block, page)
  );
}

function sanitizeOcrBlockForGrouping(
  block: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
): NormalizedOcrPage['blocks'][number] {
  if (block.renderMode === 'mask_only') {
    return block;
  }

  if (isLikelyStandalonePublisherWatermarkBlock(block, page)) {
    return toMaskOnlyBlock(block);
  }

  if (!hasLikelyWatermarkSource(block.text)) {
    return block;
  }

  const cleanedText = stripWatermarkText(block.text);

  if (!cleanedText) {
    return {
      ...block,
      renderMode: 'mask_only',
    };
  }

  if (cleanedText === block.text) {
    return block;
  }

  return {
    ...block,
    ...estimatePollutedOcrBlockGeometry(block, cleanedText),
    text: cleanedText,
  };
}

function estimatePollutedOcrBlockGeometry(
  block: NormalizedOcrPage['blocks'][number],
  cleanedText: string
): Partial<NormalizedOcrPage['blocks'][number]> {
  const currentLineSlots = block.height / Math.max(1, block.symHeight);

  if (currentLineSlots < 5) {
    return {};
  }

  const estimatedLineCount = estimateTextLineCount(block, cleanedText);
  const estimatedHeight = Math.ceil(
    estimatedLineCount * block.symHeight * 1.45
  );
  const minimumHeight = Math.ceil(block.symHeight * 1.8);
  const nextHeight = Math.max(minimumHeight, estimatedHeight);

  if (nextHeight >= block.height * 0.82) {
    return {};
  }

  return {
    height: nextHeight,
  };
}

function estimateTextLineCount(
  block: NormalizedOcrPage['blocks'][number],
  text: string
) {
  const glyphCount = normalizeOcrText(text).length;
  const usableWidth = Math.max(block.symWidth, block.width * 0.9);
  return Math.max(1, Math.ceil((glyphCount * block.symWidth) / usableWidth));
}

function isSuspiciousLargeSparseOcrBlock(
  block: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
) {
  if (block.renderMode === 'mask_only') {
    return false;
  }

  const metrics = getSparseOcrBlockMetrics(block, page);

  if (metrics.usefulCharacterCount <= 0 && metrics.areaRatio >= 0.025) {
    return true;
  }

  const sparseBySymbolSlots =
    metrics.symbolSlotDensity < 0.18 &&
    metrics.symbolColumnSlots >= 8 &&
    metrics.symbolLineSlots >= 3.5;
  const touchesPageEdge =
    metrics.touchesHorizontalPageEdge || metrics.touchesVerticalPageEdge;
  const largeEdgeBlock =
    touchesPageEdge &&
    metrics.areaRatio >= 0.045 &&
    metrics.usefulCharacterCount <= 140 &&
    sparseBySymbolSlots;
  const extremeSparseBlock =
    metrics.areaRatio >= 0.16 &&
    metrics.usefulCharacterCount <= 80 &&
    metrics.symbolSlotDensity < 0.12 &&
    metrics.symbolLineSlots >= 4.5;
  const fullWidthSparseBlock =
    metrics.widthRatio >= 0.82 &&
    metrics.areaRatio >= 0.055 &&
    metrics.usefulCharacterCount <= 90 &&
    sparseBySymbolSlots;

  return largeEdgeBlock || extremeSparseBlock || fullWidthSparseBlock;
}

function shouldDropAsianSourcePollutionBlock(
  block: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
) {
  if (block.renderMode === 'mask_only') {
    return false;
  }

  const metrics = getSparseOcrBlockMetrics(block, page);

  return metrics.usefulCharacterCount <= 0 && metrics.areaRatio >= 0.025;
}

function isLargeDecorativeEastAsianOcrBlock(
  block: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
) {
  if (block.renderMode === 'mask_only') {
    return false;
  }

  const metrics = getSparseOcrBlockMetrics(block, page);

  if (
    metrics.usefulCharacterCount <= 0 ||
    metrics.usefulCharacterCount > MAX_DECORATIVE_SOURCE_CHARS
  ) {
    return false;
  }

  const eastAsianCharacterCount = countEastAsianScriptCharacters(block.text);
  if (eastAsianCharacterCount <= 0) {
    return false;
  }

  if (
    eastAsianCharacterCount / Math.max(1, metrics.usefulCharacterCount) <
    MIN_DECORATIVE_EAST_ASIAN_RATIO
  ) {
    return false;
  }

  const hasHugeGlyphMetrics =
    block.symHeight >= MIN_DECORATIVE_SYMBOL_SIZE ||
    block.symWidth >= MIN_DECORATIVE_SYMBOL_SIZE ||
    metrics.heightRatio >= MIN_DECORATIVE_HEIGHT_RATIO;
  const isLargeBlock =
    metrics.widthRatio >= MIN_DECORATIVE_WIDTH_RATIO ||
    metrics.areaRatio >= MIN_DECORATIVE_AREA_RATIO ||
    metrics.heightRatio >= MIN_DECORATIVE_HEIGHT_RATIO;

  return hasHugeGlyphMetrics && isLargeBlock;
}

function getSparseOcrBlockMetrics(
  block: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
) {
  const pageArea = Math.max(1, page.imgWidth * page.imgHeight);
  const blockArea = Math.max(1, block.width * block.height);
  const edgeMarginX = Math.max(2, page.imgWidth * 0.015);
  const edgeMarginY = Math.max(2, page.imgHeight * 0.015);
  const symbolColumnSlots = block.width / Math.max(1, block.symWidth);
  const symbolLineSlots = block.height / Math.max(1, block.symHeight);
  const symbolSlotCount = Math.max(1, symbolColumnSlots * symbolLineSlots);
  const usefulCharacterCount = countUsefulOcrCharacters(block.text);

  return {
    areaRatio: blockArea / pageArea,
    heightRatio: block.height / Math.max(1, page.imgHeight),
    symbolColumnSlots,
    symbolLineSlots,
    symbolSlotDensity: usefulCharacterCount / symbolSlotCount,
    touchesHorizontalPageEdge:
      block.x <= edgeMarginX ||
      block.x + block.width >= page.imgWidth - edgeMarginX,
    touchesVerticalPageEdge:
      block.y <= edgeMarginY ||
      block.y + block.height >= page.imgHeight - edgeMarginY,
    usefulCharacterCount,
    widthRatio: block.width / Math.max(1, page.imgWidth),
  };
}

function countUsefulOcrCharacters(text: string) {
  return [...text].filter((character) => /[\p{L}\p{N}]/u.test(character))
    .length;
}

function countEastAsianScriptCharacters(text: string) {
  return [...text].filter((character) =>
    EAST_ASIAN_SCRIPT_CHARACTER_REGEX.test(character)
  ).length;
}

function isAsianSourceLanguage(sourceLanguage: string) {
  return /^(?:zh|zho|chi|cmn|yue|ja|jpn|ko|kor)(?:\b|[-_])/i.test(
    sourceLanguage.trim()
  );
}

function isLikelyStandalonePublisherWatermarkBlock(
  block: NormalizedOcrPage['blocks'][number],
  page: NormalizedOcrPage
) {
  const normalized = normalizeOcrText(block.text).replace(/\s+/g, '');

  if (!PUBLISHER_WATERMARK_TEXTS.has(normalized)) {
    return false;
  }

  const metrics = getSparseOcrBlockMetrics(block, page);
  const edgeMarginX = Math.max(24, page.imgWidth * 0.035);
  const touchesHorizontalEdge =
    block.x <= edgeMarginX ||
    block.x + block.width >= page.imgWidth - edgeMarginX;

  return (
    touchesHorizontalEdge &&
    metrics.widthRatio <= 0.24 &&
    metrics.heightRatio <= 0.08
  );
}

const MAX_DECORATIVE_SOURCE_CHARS = 8;
const MIN_DECORATIVE_AREA_RATIO = 0.015;
const MIN_DECORATIVE_EAST_ASIAN_RATIO = 0.6;
const MIN_DECORATIVE_HEIGHT_RATIO = 0.06;
const MIN_DECORATIVE_SYMBOL_SIZE = 48;
const MIN_DECORATIVE_WIDTH_RATIO = 0.35;
const EAST_ASIAN_SCRIPT_CHARACTER_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
const PUBLISHER_WATERMARK_TEXTS = new Set([
  '动漫',
  '腾讯',
  '腾讯动漫',
  '騰訊',
  '騰訊動漫',
  '体讯动漫',
  '體讯动漫',
]);

const URL_OR_DOMAIN_REGEX =
  /(?:https?:\/\/|www\.|(?:[a-z0-9][a-z0-9-]*\.)+(?:com|net|org|io|co|me|xyz|top|site|vip|cc|tv)\b)/gi;
const URL_OR_DOMAIN_TEST_REGEX =
  /(?:https?:\/\/|www\.|(?:[a-z0-9][a-z0-9-]*\.)+(?:com|net|org|io|co|me|xyz|top|site|vip|cc|tv)\b)/i;
const WATERMARK_MARKER_REGEX = /\b(?:ACLOUD|COLAMANGA|MANGA|MEROL|RTMTH)\b/gi;
const WATERMARK_MARKER_TEST_REGEX = /\b(?:ACLOUD|COLAMANGA|MEROL|RTMTH)\b/i;

function stripWatermarkText(text: string) {
  const withoutDomains = text
    .replace(URL_OR_DOMAIN_REGEX, ' ')
    .replace(WATERMARK_MARKER_REGEX, ' ');

  return normalizeOcrText(withoutDomains)
    .replace(/\s+([,.;:!?،؛؟…])/g, '$1')
    .trim();
}

function isLikelyStandaloneWatermarkSource(value: string) {
  const source = normalizeOcrText(value);

  if (!source || !hasLikelyWatermarkSource(source)) {
    return false;
  }

  const remainder = source
    .replace(URL_OR_DOMAIN_REGEX, ' ')
    .replace(WATERMARK_MARKER_REGEX, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

  return remainder.length <= 3;
}

function hasLikelyWatermarkSource(value: string) {
  return (
    URL_OR_DOMAIN_TEST_REGEX.test(value) ||
    WATERMARK_MARKER_TEST_REGEX.test(value)
  );
}

function previousTextSuggestsContinuation(text: string) {
  const normalized = stripWrappingQuotes(normalizeOcrText(text));

  return (
    /[-,;:]$/.test(normalized) ||
    !/[.!?]$/.test(normalized) ||
    hasUnclosedDoubleQuote(text)
  );
}

function nextTextLooksLikeContinuation(text: string) {
  const normalized = normalizeOcrText(text);
  const withoutOpeningQuote = normalized.replace(/^["'“”‘’]\s*/, '');

  return (
    withoutOpeningQuote === normalized ||
    /^(?:AND|AS|BECAUSE|BUT|IF|IN|NOR|OR|SO|THAT|THEN|TO|WHILE)\b/i.test(
      withoutOpeningQuote
    )
  );
}

function hasUnclosedDoubleQuote(text: string) {
  const quoteCount = (text.match(/"/g) ?? []).length;

  return quoteCount % 2 === 1;
}

function combineOcrText(previousText: string, nextText: string) {
  return `${normalizeOcrText(previousText)} ${normalizeOcrText(nextText)}`
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOcrText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripWrappingQuotes(text: string) {
  return text
    .replace(/^["'“”‘’]\s*/, '')
    .replace(/\s*["'“”‘’]$/g, '')
    .trim();
}

function toMaskOnlyBlock(
  block: NormalizedOcrPage['blocks'][number]
): NormalizedOcrPage['blocks'][number] {
  return {
    ...block,
    renderMode: 'mask_only',
  };
}
