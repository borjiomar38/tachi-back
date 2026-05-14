import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
  analyzeTranslationManifestOcr,
  selectTopOcrGroupingIssues,
  summarizeOcrManifestAnalyses,
} from '@/server/jobs/ocr-cache-analysis';
import {
  type TranslationJobResultManifest,
  zTranslationJobResultManifest,
} from '@/server/jobs/schema';

type FixtureIndex = {
  entries: FixtureIndexEntry[];
  schemaVersion: string;
  skipped?: Array<{ cacheKey: string; reason: string }>;
};

type FixtureIndexEntry = {
  cacheKeyPrefix: string;
  chapterCacheKeyPrefix: string | null;
  displayName: string;
  fixtureFile: string;
  sourceLanguage: string;
  targetLanguage: string;
};

type ManifestBlock =
  TranslationJobResultManifest['pages'][string]['blocks'][number];

type QualityIssue = {
  blockIndex: number;
  displayName: string;
  kind:
    | 'empty_non_mask_translation'
    | 'mask_only_has_translation'
    | 'missing_target_script'
    | 'source_script_remaining'
    | 'suspicious_mask_only_block'
    | 'translation_equals_source';
  pageKey: string;
  sourceText: string;
  translation: string;
};

const DEFAULT_FIXTURE_DIR =
  'src/server/jobs/fixtures/production-cache-regressions';
const NEVER_MATCH_REGEX = /(?!)/;
const EAST_ASIAN_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
const ARABIC_REGEX = /[\u0600-\u06ff]/u;
const LATIN_WORD_REGEX = /[A-Za-z]{2,}/u;
const URL_OR_DOMAIN_REGEX =
  /(?:https?:\/\/|www\.|(?:[a-z0-9][a-z0-9-]*\.)+(?:com|net|org|io|co|me|xyz|top|site|vip|cc|tv)\b)/i;

const options = parseArgs(process.argv.slice(2));

const fixtureDir = resolve(process.cwd(), options.fixtureDir);
const index = await loadIndex(join(fixtureDir, 'index.json'));
const manifests = await Promise.all(
  index.entries.map(async (entry) => ({
    entry,
    manifest: await loadManifest(join(fixtureDir, entry.fixtureFile)),
  }))
);
const analyses = manifests.map(({ entry, manifest }) =>
  analyzeTranslationManifestOcr({
    cacheKey: entry.cacheKeyPrefix,
    chapterCacheKey: entry.chapterCacheKeyPrefix,
    manifest,
  })
);
const qualityIssues = manifests.flatMap(({ entry, manifest }) =>
  collectQualityIssues(entry, manifest)
);
const issueCountByKind = countBy(qualityIssues.map((issue) => issue.kind));
const manifestSummary = manifests.reduce(
  (summary, { manifest }) => {
    for (const pageKey of manifest.pageOrder) {
      const page = manifest.pages[pageKey];

      if (!page) {
        continue;
      }

      summary.pages += 1;

      for (const block of page.blocks) {
        summary.blocks += 1;

        if (block.renderMode === 'mask_only') {
          summary.maskOnlyBlocks += 1;
        } else {
          summary.translatableBlocks += 1;
        }
      }
    }

    return summary;
  },
  {
    blocks: 0,
    maskOnlyBlocks: 0,
    pages: 0,
    translatableBlocks: 0,
  }
);

console.log(
  JSON.stringify(
    {
      fixtureDir,
      groupingSummary: summarizeOcrManifestAnalyses(analyses),
      manifestSummary: {
        manifests: manifests.length,
        ...manifestSummary,
      },
      skippedDuringExport: index.skipped ?? [],
      topGroupingIssues: selectTopOcrGroupingIssues(analyses, options.top),
      topQualityIssues: qualityIssues.slice(0, options.top),
      qualityIssueCount: qualityIssues.length,
      qualityIssuesByKind: issueCountByKind,
    },
    null,
    2
  )
);

async function loadIndex(path: string): Promise<FixtureIndex> {
  const index = JSON.parse(await readFile(path, 'utf8')) as FixtureIndex;

  if (index.schemaVersion !== 'translation-cache-regression-fixtures.v1') {
    throw new Error(`Unsupported fixture index schema: ${index.schemaVersion}`);
  }

  return index;
}

async function loadManifest(
  path: string
): Promise<TranslationJobResultManifest> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as Record<
    string,
    unknown
  >;

  return zTranslationJobResultManifest.parse({
    ...raw,
    completedAt:
      typeof raw.completedAt === 'string'
        ? new Date(raw.completedAt)
        : raw.completedAt,
  });
}

function collectQualityIssues(
  entry: FixtureIndexEntry,
  manifest: TranslationJobResultManifest
): QualityIssue[] {
  return flattenManifestBlocks(manifest).flatMap((block) => {
    const issues: QualityIssue[] = [];
    const translation = normalizeText(block.translation);
    const sourceText = normalizeText(block.text);

    if (block.renderMode === 'mask_only') {
      if (translation) {
        issues.push(buildIssue(entry, block, 'mask_only_has_translation'));
      }

      if (isSuspiciousMaskOnlyBlock(block)) {
        issues.push(buildIssue(entry, block, 'suspicious_mask_only_block'));
      }

      return issues;
    }

    if (
      !translation &&
      usefulLetterOrNumberCount(sourceText) >= 10 &&
      !isLikelyWatermark(sourceText)
    ) {
      issues.push(buildIssue(entry, block, 'empty_non_mask_translation'));
    }

    if (
      manifest.sourceLanguage !== manifest.targetLanguage &&
      translation &&
      usefulLetterOrNumberCount(sourceText) >= 10 &&
      !isLikelyWatermark(sourceText) &&
      normalizeComparableText(translation) ===
        normalizeComparableText(sourceText)
    ) {
      issues.push(buildIssue(entry, block, 'translation_equals_source'));
    }

    if (
      sourceScriptLeakRegex(manifest).test(translation) &&
      usefulLetterOrNumberCount(sourceText) >= 4 &&
      !isLikelyWatermark(sourceText) &&
      !isAllowedSourceScriptLeak(translation)
    ) {
      issues.push(buildIssue(entry, block, 'source_script_remaining'));
    }

    if (
      translation &&
      usefulLetterOrNumberCount(sourceText) >= 10 &&
      !isLikelyWatermark(sourceText) &&
      !containsTargetScriptOrSafeText(translation, manifest.targetLanguage)
    ) {
      issues.push(buildIssue(entry, block, 'missing_target_script'));
    }

    return issues;
  });
}

function buildIssue(
  entry: FixtureIndexEntry,
  block: ManifestBlock & {
    blockIndex: number;
    pageHeight: number;
    pageKey: string;
    pageWidth: number;
  },
  kind: QualityIssue['kind']
): QualityIssue {
  return {
    blockIndex: block.blockIndex,
    displayName: entry.displayName,
    kind,
    pageKey: block.pageKey,
    sourceText: block.text,
    translation: block.translation,
  };
}

function flattenManifestBlocks(manifest: TranslationJobResultManifest) {
  return manifest.pageOrder.flatMap((pageKey) => {
    const page = manifest.pages[pageKey];

    if (!page) {
      return [];
    }

    return page.blocks.map((block, blockIndex) => ({
      ...block,
      blockIndex,
      pageKey,
      pageHeight: page.imgHeight,
      pageWidth: page.imgWidth,
    }));
  });
}

function sourceScriptLeakRegex(manifest: TranslationJobResultManifest) {
  if (isAsianSourceLanguage(manifest.sourceLanguage)) {
    return EAST_ASIAN_REGEX;
  }

  if (isArabicLanguage(manifest.sourceLanguage)) {
    return ARABIC_REGEX;
  }

  return NEVER_MATCH_REGEX;
}

function containsTargetScriptOrSafeText(text: string, targetLanguage: string) {
  if (isNumericOrPunctuationOnly(text)) {
    return true;
  }

  if (isArabicLanguage(targetLanguage)) {
    return ARABIC_REGEX.test(text);
  }

  if (isAsianSourceLanguage(targetLanguage)) {
    return EAST_ASIAN_REGEX.test(text);
  }

  if (isLatinLanguage(targetLanguage)) {
    return LATIN_WORD_REGEX.test(text);
  }

  return true;
}

function isSuspiciousMaskOnlyBlock(
  block: ManifestBlock & { pageHeight: number; pageWidth: number }
) {
  const sourceText = normalizeText(block.text);

  if (usefulLetterOrNumberCount(sourceText) < 4) {
    return false;
  }

  if (isLikelyWatermark(sourceText)) {
    return false;
  }

  const areaRatio =
    (block.width * block.height) / (block.pageWidth * block.pageHeight);
  const edgeMarginX = Math.max(24, block.pageWidth * 0.035);
  const touchesHorizontalEdge =
    block.x <= edgeMarginX ||
    block.x + block.width >= block.pageWidth - edgeMarginX;

  return areaRatio >= 0.015 && !touchesHorizontalEdge;
}

function isAllowedSourceScriptLeak(text: string) {
  return URL_OR_DOMAIN_REGEX.test(text) || isNumericOrPunctuationOnly(text);
}

function isLikelyWatermark(text: string) {
  const normalized = normalizeText(text).toLowerCase().replace(/\s+/g, '');

  return (
    normalized.includes('colamanga') ||
    normalized.includes('acloudmerol') ||
    normalized.includes('manga') ||
    normalized.includes('漫画') ||
    normalized.includes('漫畫') ||
    normalized.includes('动漫') ||
    normalized.includes('動漫') ||
    normalized.includes('看漫') ||
    normalized.includes('看漫画') ||
    normalized.includes('快看漫画') ||
    normalized.includes('包子漫画') ||
    normalized.includes('包子漫畫') ||
    normalized.includes('腾讯动') ||
    normalized.includes('腾讯动漫') ||
    normalized.includes('騰訊動') ||
    normalized.includes('騰訊動漫') ||
    normalized.includes('体讯动漫') ||
    normalized.includes('體讯动漫') ||
    normalized.includes('體訊動漫') ||
    normalized.includes('讯动漫') ||
    normalized.includes('訊動漫') ||
    normalized.includes('出品:') ||
    normalized.includes('原著:') ||
    normalized.includes('制作:') ||
    normalized.includes('監製:') ||
    normalized.includes('监制:') ||
    normalized.includes('脚本:') ||
    normalized === '动漫' ||
    URL_OR_DOMAIN_REGEX.test(normalized)
  );
}

function isAsianSourceLanguage(sourceLanguage: string) {
  return /^(?:zh|zho|chi|cmn|yue|ja|jpn|ko|kor)(?:\b|[-_])/i.test(
    sourceLanguage.trim()
  );
}

function isArabicLanguage(language: string) {
  return /^(?:ar|ara|fa|fas|per|ur|urd)(?:\b|[-_])/i.test(language.trim());
}

function isLatinLanguage(language: string) {
  return /^(?:en|eng|es|spa|pt|por|de|deu|ger|fr|fra|fre|it|ita)(?:\b|[-_])/i.test(
    language.trim()
  );
}

function isNumericOrPunctuationOnly(text: string) {
  return (
    !/[\p{Letter}]/u.test(text) &&
    /[\p{Number}\p{Punctuation}\p{Symbol}]/u.test(text)
  );
}

function usefulLetterOrNumberCount(text: string) {
  return Array.from(text.matchAll(/[\p{Letter}\p{Number}]/gu)).length;
}

function normalizeComparableText(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function parseArgs(args: string[]) {
  const parsed = {
    fixtureDir: DEFAULT_FIXTURE_DIR,
    top: 50,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--fixtures':
        parsed.fixtureDir = args[index + 1] ?? parsed.fixtureDir;
        index += 1;
        break;
      case '--top':
        parsed.top = parsePositiveInt(args[index + 1]);
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return parsed;
}

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    throw new Error('Expected a positive integer.');
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid positive integer: ${value}`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node ./run-jiti.js ./scripts/analyze-translation-cache-regression-fixtures.ts [options]

Options:
  --fixtures <path>  Fixture directory. Defaults to ${DEFAULT_FIXTURE_DIR}
  --top <n>          Number of issue samples to print. Defaults to 50.
`);
}
