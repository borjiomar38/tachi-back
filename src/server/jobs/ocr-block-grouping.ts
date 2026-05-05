import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

import { type MobileOcrRegionHints } from './schema';

type OcrLayoutPageLike = {
  ocrPage: NormalizedOcrPage;
};

export function coalesceOcrLineBlocks(
  ocrPage: NormalizedOcrPage,
  options: { mobileOcrRegionHints?: MobileOcrRegionHints | null } = {}
): NormalizedOcrPage {
  const sanitizedPage = sanitizeOcrPageForGrouping(ocrPage);

  if (sanitizedPage.blocks.length < 2) {
    return sanitizedPage;
  }

  const sortedBlocks = [...sanitizedPage.blocks].sort(
    (left, right) => left.y - right.y || left.x - right.x
  );
  const parent = sortedBlocks.map((_, index) => index);
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

    if (leftRoot !== rightRoot) {
      parent[rightRoot] = leftRoot;
    }
  };
  const blockRegionIds = assignWhiteBubbleRegionIds(
    sortedBlocks,
    normalizeWhiteBubbleRegions(options.mobileOcrRegionHints, sanitizedPage)
  );

  for (let leftIndex = 0; leftIndex < sortedBlocks.length; leftIndex += 1) {
    const leftRegionId = blockRegionIds.get(leftIndex);

    if (!leftRegionId) {
      continue;
    }

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < sortedBlocks.length;
      rightIndex += 1
    ) {
      if (blockRegionIds.get(rightIndex) === leftRegionId) {
        union(leftIndex, rightIndex);
      }
    }
  }

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

      const leftRegionId = blockRegionIds.get(leftIndex);
      const rightRegionId = blockRegionIds.get(rightIndex);

      if ((leftRegionId || rightRegionId) && leftRegionId !== rightRegionId) {
        continue;
      }

      if (shouldCoalesceOcrBlocks(leftBlock, rightBlock)) {
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
    blocks: [...groups.values()]
      .map(mergeOcrBlockGroup)
      .sort((left, right) => left.y - right.y || left.x - right.x),
  };
}

type WhiteBubbleRegion = {
  bottom: number;
  confidence: number;
  id: string;
  left: number;
  right: number;
  top: number;
};

function normalizeWhiteBubbleRegions(
  hints: MobileOcrRegionHints | null | undefined,
  ocrPage: NormalizedOcrPage
): WhiteBubbleRegion[] {
  if (!hints || hints.status !== 'ok' || hints.regions.length === 0) {
    return [];
  }

  const widthRatio = hints.imageWidth / ocrPage.imgWidth;
  const heightRatio = hints.imageHeight / ocrPage.imgHeight;
  const dimensionsMatch =
    Number.isFinite(widthRatio) &&
    Number.isFinite(heightRatio) &&
    widthRatio > 0.96 &&
    widthRatio < 1.04 &&
    heightRatio > 0.96 &&
    heightRatio < 1.04;

  if (!dimensionsMatch) {
    return [];
  }

  const pageArea = ocrPage.imgWidth * ocrPage.imgHeight;

  return hints.regions
    .map((region): WhiteBubbleRegion | null => {
      const confidence = region.confidence ?? 0.7;
      const left = Math.max(0, Math.min(region.x, ocrPage.imgWidth));
      const top = Math.max(0, Math.min(region.y, ocrPage.imgHeight));
      const right = Math.max(
        left,
        Math.min(region.x + region.width, ocrPage.imgWidth)
      );
      const bottom = Math.max(
        top,
        Math.min(region.y + region.height, ocrPage.imgHeight)
      );
      const width = right - left;
      const height = bottom - top;
      const area = width * height;

      if (
        confidence < 0.55 ||
        width < 8 ||
        height < 8 ||
        area <= 0 ||
        area > pageArea * 0.6
      ) {
        return null;
      }

      return {
        bottom,
        confidence,
        id: region.hintId,
        left,
        right,
        top,
      };
    })
    .filter((region): region is WhiteBubbleRegion => Boolean(region));
}

function assignWhiteBubbleRegionIds(
  blocks: NormalizedOcrPage['blocks'],
  regions: WhiteBubbleRegion[]
) {
  const assignments = new Map<number, string>();

  if (regions.length === 0) {
    return assignments;
  }

  for (const [index, block] of blocks.entries()) {
    const blockArea = block.width * block.height;
    if (blockArea <= 0 || block.renderMode === 'mask_only') {
      continue;
    }

    let bestRegion: WhiteBubbleRegion | null = null;
    let bestScore = 0;

    for (const region of regions) {
      const centerInside =
        block.x + block.width / 2 >= region.left &&
        block.x + block.width / 2 <= region.right &&
        block.y + block.height / 2 >= region.top &&
        block.y + block.height / 2 <= region.bottom;
      const intersection = rectangleIntersectionArea(
        {
          bottom: block.y + block.height,
          left: block.x,
          right: block.x + block.width,
          top: block.y,
        },
        region
      );
      const intersectionRatio = intersection / blockArea;
      const score = intersectionRatio + (centerInside ? 0.35 : 0);

      if (score > bestScore) {
        bestRegion = region;
        bestScore = score;
      }
    }

    if (bestRegion && bestScore >= 0.55) {
      assignments.set(index, bestRegion.id);
    }
  }

  return assignments;
}

function rectangleIntersectionArea(
  leftRect: { bottom: number; left: number; right: number; top: number },
  rightRect: { bottom: number; left: number; right: number; top: number }
) {
  const width =
    Math.min(leftRect.right, rightRect.right) -
    Math.max(leftRect.left, rightRect.left);
  const height =
    Math.min(leftRect.bottom, rightRect.bottom) -
    Math.max(leftRect.top, rightRect.top);

  return Math.max(0, width) * Math.max(0, height);
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
      blocks: sortOcrBlocksForReading(page.ocrPage.blocks),
    },
  }));

  for (let pageIndex = 0; pageIndex < nextPages.length - 1; pageIndex += 1) {
    const previousPage = nextPages[pageIndex];
    const nextPage = nextPages[pageIndex + 1];

    if (!previousPage || !nextPage) {
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
    const keepPrevious =
      previousBlock.width * previousBlock.height >=
      nextBlock.width * nextBlock.height;

    if (keepPrevious) {
      previousPage.ocrPage.blocks[previousBlockIndex] = {
        ...previousBlock,
        symHeight: (previousBlock.symHeight + nextBlock.symHeight) / 2,
        symWidth: (previousBlock.symWidth + nextBlock.symWidth) / 2,
        text: combinedText,
      };
      nextPage.ocrPage.blocks[nextBlockIndex] = toMaskOnlyBlock(nextBlock);
    } else {
      nextPage.ocrPage.blocks[nextBlockIndex] = {
        ...nextBlock,
        symHeight: (previousBlock.symHeight + nextBlock.symHeight) / 2,
        symWidth: (previousBlock.symWidth + nextBlock.symWidth) / 2,
        text: combinedText,
      };
      previousPage.ocrPage.blocks[previousBlockIndex] =
        toMaskOnlyBlock(previousBlock);
    }
  }

  return nextPages;
}

export function shouldCoalesceOcrBlocks(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number]
) {
  if (
    isLikelyStandaloneWatermarkSource(previousBlock.text) ||
    isLikelyStandaloneWatermarkSource(nextBlock.text)
  ) {
    return false;
  }

  const previousBottom = previousBlock.y + previousBlock.height;
  const verticalGap = nextBlock.y - previousBottom;
  const averageSymbolHeight =
    (previousBlock.symHeight + nextBlock.symHeight) / 2;
  const maxVerticalGap = Math.max(6, Math.min(24, averageSymbolHeight * 0.85));
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

  if (Math.abs(previousBlock.angle - nextBlock.angle) > 8) {
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

  return (
    overlapRatio >= 0.25 ||
    Math.abs(previousCenter - nextCenter) <= maxCenterDistance
  );
}

function shouldCoalesceOcrPageContinuationBlocks(input: {
  nextBlock: NormalizedOcrPage['blocks'][number];
  nextPage: NormalizedOcrPage;
  previousBlock: NormalizedOcrPage['blocks'][number];
  previousPage: NormalizedOcrPage;
}) {
  if (
    input.previousBlock.y + input.previousBlock.height <
      input.previousPage.imgHeight -
        getPageBoundaryMargin(input.previousPage) ||
    input.nextBlock.y > getPageBoundaryMargin(input.nextPage)
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
      input.previousBlock.x + input.previousBlock.width,
      input.nextBlock.x + input.nextBlock.width
    ) - Math.max(input.previousBlock.x, input.nextBlock.x);
  const minWidth = Math.min(input.previousBlock.width, input.nextBlock.width);
  const overlapRatio = minWidth > 0 ? overlap / minWidth : 0;
  const previousCenter = input.previousBlock.x + input.previousBlock.width / 2;
  const nextCenter = input.nextBlock.x + input.nextBlock.width / 2;
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

  return {
    angle: blocks[0]?.angle ?? 0,
    height: bottom - top,
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
  return [...blocks].sort(
    (left, right) => left.y - right.y || left.x - right.x
  );
}

function findBottomContinuationBlockIndex(ocrPage: NormalizedOcrPage) {
  const margin = getPageBoundaryMargin(ocrPage);

  for (let index = ocrPage.blocks.length - 1; index >= 0; index -= 1) {
    const block = ocrPage.blocks[index];

    if (!block) {
      continue;
    }

    if (block.y + block.height < ocrPage.imgHeight - margin) {
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
    if (block.y > margin) {
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
  return {
    ...ocrPage,
    blocks: ocrPage.blocks.map(sanitizeOcrBlockForGrouping),
  };
}

function sanitizeOcrBlockForGrouping(
  block: NormalizedOcrPage['blocks'][number]
): NormalizedOcrPage['blocks'][number] {
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
