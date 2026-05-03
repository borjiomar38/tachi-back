import { type TranslationJobResultManifest } from './schema';

type HostedBlock =
  TranslationJobResultManifest['pages'][string]['blocks'][number];

export type OcrGroupingIssueKind =
  | 'possible_overmerged_block'
  | 'possible_undermerged_neighbors'
  | 'empty_translation';

export type OcrGroupingIssueSeverity = 'info' | 'warning' | 'critical';

export type OcrGroupingIssue = {
  blockIndex?: number;
  cacheKey?: string;
  chapterCacheKey?: string | null;
  kind: OcrGroupingIssueKind;
  message: string;
  metrics: Record<string, number | string | null>;
  neighborIndexes?: [number, number];
  neighborTexts?: [string, string];
  pageKey: string;
  severity: OcrGroupingIssueSeverity;
  sourceText?: string;
  targetLanguage: string;
  translation?: string;
};

export type OcrManifestAnalysis = {
  blockCount: number;
  cacheKey?: string;
  chapterCacheKey?: string | null;
  issueCount: number;
  issues: OcrGroupingIssue[];
  pageCount: number;
  targetLanguage: string;
};

export function analyzeTranslationManifestOcr(input: {
  cacheKey?: string;
  chapterCacheKey?: string | null;
  manifest: TranslationJobResultManifest;
}): OcrManifestAnalysis {
  const issues: OcrGroupingIssue[] = [];
  let blockCount = 0;

  for (const pageKey of input.manifest.pageOrder) {
    const page = input.manifest.pages[pageKey];
    if (!page) {
      continue;
    }

    blockCount += page.blocks.length;

    page.blocks.forEach((block, blockIndex) => {
      const overmergedIssue = detectOvermergedBlock({
        block,
        blockIndex,
        cacheKey: input.cacheKey,
        chapterCacheKey: input.chapterCacheKey,
        imgHeight: page.imgHeight,
        imgWidth: page.imgWidth,
        pageKey,
        targetLanguage: input.manifest.targetLanguage,
      });

      if (overmergedIssue) {
        issues.push(overmergedIssue);
      }

      if (!block.translation.trim()) {
        issues.push({
          blockIndex,
          cacheKey: input.cacheKey,
          chapterCacheKey: input.chapterCacheKey,
          kind: 'empty_translation',
          message: 'Block has OCR text but an empty translation.',
          metrics: blockMetrics(block, page.imgWidth, page.imgHeight),
          pageKey,
          severity: 'info',
          sourceText: block.text,
          targetLanguage: input.manifest.targetLanguage,
          translation: block.translation,
        });
      }
    });

    for (const issue of detectUndermergedNeighbors({
      blocks: page.blocks,
      cacheKey: input.cacheKey,
      chapterCacheKey: input.chapterCacheKey,
      imgHeight: page.imgHeight,
      imgWidth: page.imgWidth,
      pageKey,
      targetLanguage: input.manifest.targetLanguage,
    })) {
      issues.push(issue);
    }
  }

  return {
    blockCount,
    cacheKey: input.cacheKey,
    chapterCacheKey: input.chapterCacheKey,
    issueCount: issues.length,
    issues,
    pageCount: input.manifest.pageCount,
    targetLanguage: input.manifest.targetLanguage,
  };
}

export function summarizeOcrManifestAnalyses(analyses: OcrManifestAnalysis[]) {
  const issues = analyses.flatMap((analysis) => analysis.issues);
  const byKind = countBy(issues.map((issue) => issue.kind));
  const bySeverity = countBy(issues.map((issue) => issue.severity));

  return {
    analyzedBlocks: analyses.reduce(
      (sum, analysis) => sum + analysis.blockCount,
      0
    ),
    analyzedManifests: analyses.length,
    analyzedPages: analyses.reduce(
      (sum, analysis) => sum + analysis.pageCount,
      0
    ),
    issueCount: issues.length,
    issuesByKind: byKind,
    issuesBySeverity: bySeverity,
  };
}

export function selectTopOcrGroupingIssues(
  analyses: OcrManifestAnalysis[],
  limit: number
) {
  const severityScore: Record<OcrGroupingIssueSeverity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return analyses
    .flatMap((analysis) => analysis.issues)
    .sort((left, right) => {
      const severityDelta =
        severityScore[right.severity] - severityScore[left.severity];
      if (severityDelta !== 0) {
        return severityDelta;
      }

      const leftScore = Number(left.metrics.score ?? 0);
      const rightScore = Number(right.metrics.score ?? 0);
      return rightScore - leftScore;
    })
    .slice(0, limit);
}

function detectOvermergedBlock(input: {
  block: HostedBlock;
  blockIndex: number;
  cacheKey?: string;
  chapterCacheKey?: string | null;
  imgHeight: number;
  imgWidth: number;
  pageKey: string;
  targetLanguage: string;
}): OcrGroupingIssue | null {
  const metrics = blockMetrics(input.block, input.imgWidth, input.imgHeight);
  const heightToSymbol = Number(metrics.heightToSymbol);
  const sentenceBreakCount = countSentenceBreaks(input.block.text);
  const textLength = input.block.text.trim().length;
  const areaRatio = Number(metrics.areaRatio);
  const score =
    heightToSymbol * 0.7 +
    sentenceBreakCount * 1.4 +
    areaRatio * 10 +
    Math.min(textLength / 80, 3);

  if (heightToSymbol < 5.5 && sentenceBreakCount < 3 && areaRatio < 0.18) {
    return null;
  }

  if (textLength < 45 && sentenceBreakCount < 2 && heightToSymbol < 8) {
    return null;
  }

  return {
    blockIndex: input.blockIndex,
    cacheKey: input.cacheKey,
    chapterCacheKey: input.chapterCacheKey,
    kind: 'possible_overmerged_block',
    message:
      'Block geometry/text looks large enough to contain multiple bubbles.',
    metrics: {
      ...metrics,
      score: Number(score.toFixed(3)),
      sentenceBreakCount,
      textLength,
    },
    pageKey: input.pageKey,
    severity: score >= 9 ? 'critical' : 'warning',
    sourceText: input.block.text,
    targetLanguage: input.targetLanguage,
    translation: input.block.translation,
  };
}

function detectUndermergedNeighbors(input: {
  blocks: HostedBlock[];
  cacheKey?: string;
  chapterCacheKey?: string | null;
  imgHeight: number;
  imgWidth: number;
  pageKey: string;
  targetLanguage: string;
}): OcrGroupingIssue[] {
  const sortedBlocks = input.blocks
    .map((block, index) => ({ block, index }))
    .sort(
      (left, right) =>
        left.block.y - right.block.y || left.block.x - right.block.x
    );
  const issues: OcrGroupingIssue[] = [];

  for (let index = 1; index < sortedBlocks.length; index += 1) {
    const previous = sortedBlocks[index - 1]!;
    const next = sortedBlocks[index]!;
    const metrics = neighborMetrics(
      previous.block,
      next.block,
      input.imgWidth,
      input.imgHeight
    );

    if (!looksLikeUndermergedNeighbor(previous.block, next.block, metrics)) {
      continue;
    }

    issues.push({
      cacheKey: input.cacheKey,
      chapterCacheKey: input.chapterCacheKey,
      kind: 'possible_undermerged_neighbors',
      message:
        'Adjacent blocks look like separate OCR lines from the same bubble.',
      metrics,
      neighborIndexes: [previous.index, next.index],
      neighborTexts: [previous.block.text, next.block.text],
      pageKey: input.pageKey,
      severity: Number(metrics.verticalGap) <= 4 ? 'warning' : 'info',
      targetLanguage: input.targetLanguage,
    });
  }

  return issues;
}

function looksLikeUndermergedNeighbor(
  previousBlock: HostedBlock,
  nextBlock: HostedBlock,
  metrics: Record<string, number | string | null>
) {
  const averageSymbolHeight =
    (previousBlock.symHeight + nextBlock.symHeight) / 2;
  const verticalGap = Number(metrics.verticalGap);
  const overlapRatio = Number(metrics.overlapRatio);
  const centerDistance = Number(metrics.centerDistance);
  const maxGap = Math.max(7, averageSymbolHeight * 0.65);
  const maxCenterDistance = Math.max(34, averageSymbolHeight * 2.8);

  if (verticalGap < -averageSymbolHeight || verticalGap > maxGap) {
    return false;
  }

  if (Math.abs(previousBlock.angle - nextBlock.angle) > 8) {
    return false;
  }

  if (endsLikeCompleteSentence(previousBlock.text) && verticalGap > 3) {
    return false;
  }

  return overlapRatio >= 0.35 || centerDistance <= maxCenterDistance;
}

function blockMetrics(block: HostedBlock, imgWidth: number, imgHeight: number) {
  return {
    areaRatio: roundRatio(
      (block.width * block.height) / (imgWidth * imgHeight)
    ),
    height: roundMetric(block.height),
    heightToSymbol: roundRatio(block.height / block.symHeight),
    width: roundMetric(block.width),
    widthRatio: roundRatio(block.width / imgWidth),
    x: roundMetric(block.x),
    y: roundMetric(block.y),
  };
}

function neighborMetrics(
  previousBlock: HostedBlock,
  nextBlock: HostedBlock,
  imgWidth: number,
  imgHeight: number
) {
  const previousBottom = previousBlock.y + previousBlock.height;
  const verticalGap = nextBlock.y - previousBottom;
  const overlap =
    Math.min(
      previousBlock.x + previousBlock.width,
      nextBlock.x + nextBlock.width
    ) - Math.max(previousBlock.x, nextBlock.x);
  const minWidth = Math.min(previousBlock.width, nextBlock.width);
  const overlapRatio = minWidth > 0 ? Math.max(0, overlap) / minWidth : 0;
  const previousCenter = previousBlock.x + previousBlock.width / 2;
  const nextCenter = nextBlock.x + nextBlock.width / 2;

  return {
    centerDistance: roundMetric(Math.abs(previousCenter - nextCenter)),
    imgHeight,
    imgWidth,
    overlapRatio: roundRatio(overlapRatio),
    previousTextLength: previousBlock.text.trim().length,
    verticalGap: roundMetric(verticalGap),
  };
}

function countSentenceBreaks(value: string) {
  return (value.match(/[.!?。！？؟]+/g) ?? []).length;
}

function endsLikeCompleteSentence(value: string) {
  return /[.!?。！？؟…]\s*$/.test(value.trim());
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
}

function roundRatio(value: number) {
  return Number(value.toFixed(4));
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}
