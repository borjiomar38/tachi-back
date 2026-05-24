import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

type OcrLayoutPageLike = {
  ocrPage: NormalizedOcrPage;
};

export function coalesceOcrLineBlocks(
  ocrPage: NormalizedOcrPage,
  _options: { mobileOcrRegionHints?: unknown } = {}
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
    blocks: [...groups.values()]
      .map(mergeOcrBlockGroup)
      .sort((left, right) => left.y - right.y || left.x - right.x),
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
  nextBlock: NormalizedOcrPage['blocks'][number],
  page?: NormalizedOcrPage
) {
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

  if (shouldCoalesceVertically(previousBlock, nextBlock, page)) {
    return true;
  }

  return page
    ? shouldCoalesceHorizontalRowFragments(previousBlock, nextBlock, page)
    : false;
}

function shouldCoalesceVertically(
  previousBlock: NormalizedOcrPage['blocks'][number],
  nextBlock: NormalizedOcrPage['blocks'][number],
  page?: NormalizedOcrPage
) {
  const averageSymbolHeight = getAverageSymbolHeight(previousBlock, nextBlock);
  const verticalGap = nextBlock.y - (previousBlock.y + previousBlock.height);
  const maxVerticalGap = getMaxVerticalGap(previousBlock, nextBlock, page);
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

  const scaleAwareCap = isAsianSourceLanguage(page.sourceLanguage) ? 44 : 32;
  const scaleAwareGap = Math.min(
    scaleAwareCap,
    averageSymbolHeight * 0.65,
    page.imgWidth * 0.035
  );

  return Math.max(currentGap, scaleAwareGap);
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
  const maxHorizontalGap = Math.min(
    8,
    averageSymbolWidth * 0.35,
    page.imgWidth * 0.015
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
