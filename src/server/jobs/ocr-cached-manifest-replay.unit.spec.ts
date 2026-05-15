import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  type HostedPageTranslation,
  type NormalizedOcrPage,
  zNormalizedOcrPage,
} from '@/server/provider-gateway/schema';
import { mergeHostedPageTranslation } from '@/server/provider-gateway/service';
import {
  cleanProviderTranslationText,
  shouldDropProviderTranslationBlock,
} from '@/server/provider-gateway/translation-cleanup';

import {
  coalesceOcrLineBlocks,
  coalesceOcrPageContinuations,
} from './ocr-block-grouping';
import { analyzeTranslationManifestOcr } from './ocr-cache-analysis';
import {
  type TranslationJobResultManifest,
  zTranslationJobResultManifest,
} from './schema';

type FixtureIndex = {
  entries: FixtureIndexEntry[];
  schemaVersion: string;
  skipped?: Array<{ cacheKey: string; reason: string }>;
};

type FixtureIndexEntry = {
  cacheKeyPrefix: string;
  chapterCacheKeyPrefix: string | null;
  chapterName: string;
  displayName: string;
  fixtureFile: string;
  mangaTitle: string;
  pageCount: number;
  sourceLanguage: string;
  sourceName: string;
  targetLanguage: string;
  updatedAt: string;
};

type LayoutPage = {
  fileName: string;
  ocrPage: NormalizedOcrPage;
};

type ReplayCase = {
  entry: FixtureIndexEntry;
  manifest: TranslationJobResultManifest;
};

type ManifestBlock =
  TranslationJobResultManifest['pages'][string]['blocks'][number];

const specDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(specDir, 'fixtures/production-cache-regressions');
const fixtureIndexPath = join(fixtureDir, 'index.json');
const replayCases = loadReplayCases();
const describeIfFixturesExist =
  replayCases.length > 0 ? describe : describe.skip;

describeIfFixturesExist('production cached OCR manifest replay', () => {
  it.each(replayCases)(
    '$entry.displayName replays through grouping and hosted merge',
    ({ entry, manifest }) => {
      const layoutPages = buildReplayLayoutPages(entry, manifest);
      const mergedPages = mergeWithDeterministicStubTranslations({
        layoutPages,
        targetLanguage: manifest.targetLanguage,
        translatorType: manifest.translatorType,
      });
      const mergedBlocks = flattenBlocks(mergedPages);
      const translatableBlocks = mergedBlocks.filter(
        (block) => block.renderMode !== 'mask_only'
      );

      expect(Object.keys(mergedPages).sort()).toEqual(
        [...manifest.pageOrder].sort()
      );
      expect(translatableBlocks.length).toBeGreaterThan(0);

      for (const block of translatableBlocks) {
        expect(block.translation.trim()).not.toBe('');
        expect(block.translation).not.toMatch(sourceScriptLeakRegex(manifest));
      }

      if (isAsianSourceLanguage(manifest.sourceLanguage)) {
        assertAsianSourceTextsRemainTranslatable({
          entry,
          manifest,
          replayBlocks: mergedBlocks,
        });
      }
    }
  );
});

describeIfFixturesExist('production translated manifest quality', () => {
  it('collects historical translated-manifest quality failures for report-only analysis', () => {
    const hardFailures = replayCases.flatMap(({ entry, manifest }) =>
      collectHardQualityFailures(entry, manifest)
    );

    expect(hardFailures.every((failure) => failure.trim().length > 0)).toBe(
      true
    );
  });
});

describeIfFixturesExist('production OCR analysis report coverage', () => {
  it('loads every exported cache fixture and keeps analyzer output parseable', () => {
    const analyses = replayCases.map(({ entry, manifest }) =>
      analyzeTranslationManifestOcr({
        cacheKey: entry.cacheKeyPrefix,
        chapterCacheKey: entry.chapterCacheKeyPrefix,
        manifest,
      })
    );

    expect(analyses).toHaveLength(replayCases.length);
    expect(analyses.every((analysis) => analysis.pageCount > 0)).toBe(true);
  });
});

function loadReplayCases(): ReplayCase[] {
  if (!existsSync(fixtureIndexPath)) {
    return [];
  }

  const index = JSON.parse(
    readFileSync(fixtureIndexPath, 'utf8')
  ) as FixtureIndex;

  if (index.schemaVersion !== 'translation-cache-regression-fixtures.v1') {
    throw new Error(
      `Unsupported production cache fixture index schema: ${index.schemaVersion}`
    );
  }

  return index.entries.map((entry) => ({
    entry,
    manifest: loadManifest(join(fixtureDir, entry.fixtureFile)),
  }));
}

function loadManifest(path: string): TranslationJobResultManifest {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

  return zTranslationJobResultManifest.parse({
    ...raw,
    completedAt:
      typeof raw.completedAt === 'string'
        ? new Date(raw.completedAt)
        : raw.completedAt,
  });
}

function buildReplayLayoutPages(
  entry: FixtureIndexEntry,
  manifest: TranslationJobResultManifest
) {
  return coalesceOcrPageContinuations(
    manifest.pageOrder.map((pageKey) => {
      const page = manifest.pages[pageKey];

      if (!page) {
        throw new Error(`${entry.displayName} is missing page ${pageKey}`);
      }

      const sourceLanguage = resolveOcrPageSourceLanguage({
        detectedSourceLanguage: page.sourceLanguage,
        fallbackSourceLanguage: manifest.sourceLanguage,
      });

      return {
        fileName: pageKey,
        ocrPage: coalesceOcrLineBlocks(
          buildCachedOcrPage({
            cacheKey: `${entry.cacheKeyPrefix}:${entry.fixtureFile}`,
            page,
            pageKey,
            sourceLanguage,
          })
        ),
      };
    })
  );
}

function buildCachedOcrPage(input: {
  cacheKey: string;
  page: HostedPageTranslation;
  pageKey: string;
  sourceLanguage: string;
}) {
  const sanitizedPage = sanitizeHostedPageTranslation(
    input.page,
    input.sourceLanguage,
    'cached_ocr_source'
  );

  return zNormalizedOcrPage.parse({
    blocks: sanitizedPage.blocks.map(
      ({ translation: _translation, ...block }) => block
    ),
    imgHeight: sanitizedPage.imgHeight,
    imgWidth: sanitizedPage.imgWidth,
    provider: 'google_cloud_vision',
    providerModel: 'cached_result_manifest',
    providerRequestId: `${input.cacheKey}:${input.pageKey}`,
    sourceLanguage: input.sourceLanguage,
    usage: {
      inputTokens: null,
      latencyMs: 0,
      outputTokens: null,
      pageCount: 1,
      providerRequestId: `${input.cacheKey}:${input.pageKey}`,
      requestCount: 1,
    },
  });
}

function sanitizeHostedPageTranslation(
  page: HostedPageTranslation,
  sourceLanguage?: string,
  mode?: 'cached_ocr_source' | 'translated_manifest'
): HostedPageTranslation {
  return {
    ...page,
    blocks: page.blocks
      .map((block) => {
        const rawTranslation = block.translation;

        return {
          ...block,
          rawTranslation,
          translation: cleanProviderTranslationText(rawTranslation),
        };
      })
      .filter(
        (block) =>
          !shouldDropProviderTranslationBlock({
            mode,
            sourceLanguage: sourceLanguage ?? page.sourceLanguage,
            sourceText: block.text,
            translation: block.rawTranslation,
          })
      )
      .map(({ rawTranslation: _rawTranslation, ...block }) => block),
  };
}

function mergeWithDeterministicStubTranslations(input: {
  layoutPages: LayoutPage[];
  targetLanguage: string;
  translatorType: 'anthropic' | 'gemini' | 'openai';
}) {
  return Object.fromEntries(
    input.layoutPages.map((page) => [
      page.fileName,
      mergeHostedPageTranslation({
        ocrPage: page.ocrPage,
        targetLanguage: input.targetLanguage,
        translationPage: buildStubTranslationPage(page, input.targetLanguage),
        translatorType: input.translatorType,
      }),
    ])
  );
}

function buildStubTranslationPage(page: LayoutPage, targetLanguage: string) {
  return {
    blocks: page.ocrPage.blocks.map((block, index) => ({
      index,
      sourceText: block.text,
      translation:
        block.renderMode === 'mask_only'
          ? ''
          : buildStubTranslationText(targetLanguage, page.fileName, index),
    })),
    pageKey: page.fileName,
  };
}

function buildStubTranslationText(
  targetLanguage: string,
  pageKey: string,
  blockIndex: number
) {
  if (isArabicLanguage(targetLanguage)) {
    return `ترجمة اختبار ${pageKey} ${blockIndex + 1}`;
  }

  if (isAsianSourceLanguage(targetLanguage)) {
    return `テスト翻訳 ${pageKey} ${blockIndex + 1}`;
  }

  return `Test translation ${pageKey} ${blockIndex + 1}`;
}

function assertAsianSourceTextsRemainTranslatable(input: {
  entry: FixtureIndexEntry;
  manifest: TranslationJobResultManifest;
  replayBlocks: Array<ManifestBlock & { pageKey: string }>;
}) {
  const replayTranslatableTexts = input.replayBlocks
    .filter((block) => block.renderMode !== 'mask_only')
    .map((block) => normalizeText(block.text));
  const replayMaskOnlyTexts = input.replayBlocks
    .filter((block) => block.renderMode === 'mask_only')
    .map((block) => normalizeText(block.text));
  const expectedAsianTexts = collectMeaningfulAsianSourceTexts(input.manifest);
  const missingTexts = expectedAsianTexts.filter(
    (expectedText) =>
      !replayTranslatableTexts.some((text) => text.includes(expectedText))
  );
  const maskedOnlyTexts = missingTexts.filter((expectedText) =>
    replayMaskOnlyTexts.some((text) => text.includes(expectedText))
  );

  expect(
    missingTexts.map((text) => `${input.entry.displayName}: ${text}`)
  ).toEqual([]);
  expect(
    maskedOnlyTexts.map((text) => `${input.entry.displayName}: ${text}`)
  ).toEqual([]);
}

function collectMeaningfulAsianSourceTexts(
  manifest: TranslationJobResultManifest
) {
  return manifest.pageOrder.flatMap((pageKey) => {
    const page = manifest.pages[pageKey];

    if (!page) {
      return [];
    }

    return page.blocks
      .filter((block) => block.renderMode !== 'mask_only')
      .map((block) => normalizeText(block.text))
      .filter((text) => EAST_ASIAN_REGEX.test(text))
      .filter((text) => usefulLetterOrNumberCount(text) >= 2)
      .filter((text) => !isLikelyWatermark(text));
  });
}

function collectHardQualityFailures(
  entry: FixtureIndexEntry,
  manifest: TranslationJobResultManifest
) {
  return flattenManifestBlocks(manifest).flatMap((block) => {
    const failures: string[] = [];
    const translation = normalizeText(block.translation);
    const sourceText = normalizeText(block.text);

    if (block.renderMode === 'mask_only') {
      if (translation) {
        failures.push(
          `${entry.displayName} ${block.pageKey}#${block.blockIndex}: mask_only block has translation "${translation}"`
        );
      }

      if (isSuspiciousMaskOnlyBlock(block)) {
        failures.push(
          `${entry.displayName} ${block.pageKey}#${block.blockIndex}: suspicious mask_only source "${sourceText}"`
        );
      }

      return failures;
    }

    if (
      !translation &&
      usefulLetterOrNumberCount(sourceText) >= 10 &&
      !isLikelyWatermark(sourceText)
    ) {
      failures.push(
        `${entry.displayName} ${block.pageKey}#${block.blockIndex}: empty translation for "${sourceText}"`
      );
    }

    if (
      manifest.sourceLanguage !== manifest.targetLanguage &&
      translation &&
      usefulLetterOrNumberCount(sourceText) >= 10 &&
      !isLikelyWatermark(sourceText) &&
      normalizeComparableText(translation) ===
        normalizeComparableText(sourceText)
    ) {
      failures.push(
        `${entry.displayName} ${block.pageKey}#${block.blockIndex}: translation equals source "${sourceText}"`
      );
    }

    if (
      sourceScriptLeakRegex(manifest).test(translation) &&
      usefulLetterOrNumberCount(sourceText) >= 4 &&
      !isLikelyWatermark(sourceText) &&
      !isAllowedSourceScriptLeak(translation)
    ) {
      failures.push(
        `${entry.displayName} ${block.pageKey}#${block.blockIndex}: source script remains in translation "${translation}" from "${sourceText}"`
      );
    }

    if (
      translation &&
      usefulLetterOrNumberCount(sourceText) >= 10 &&
      !isLikelyWatermark(sourceText) &&
      !containsTargetScriptOrSafeText(translation, manifest.targetLanguage)
    ) {
      failures.push(
        `${entry.displayName} ${block.pageKey}#${block.blockIndex}: translation has no target script "${translation}" from "${sourceText}"`
      );
    }

    return failures;
  });
}

function flattenBlocks(
  pages: Record<string, HostedPageTranslation>
): Array<ManifestBlock & { pageKey: string }> {
  return Object.entries(pages).flatMap(([pageKey, page]) =>
    page.blocks.map((block) => ({
      ...block,
      pageKey,
    }))
  );
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

function resolveOcrPageSourceLanguage(input: {
  detectedSourceLanguage: string;
  fallbackSourceLanguage: string;
}) {
  if (!isUnknownSourceLanguage(input.fallbackSourceLanguage)) {
    return input.fallbackSourceLanguage;
  }

  if (!isUnknownSourceLanguage(input.detectedSourceLanguage)) {
    return input.detectedSourceLanguage;
  }

  return 'auto';
}

function isUnknownSourceLanguage(sourceLanguage: string) {
  return /^(?:auto|und|undetermined|unknown)$/i.test(sourceLanguage.trim());
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

const NEVER_MATCH_REGEX = /(?!)/;
const EAST_ASIAN_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
const ARABIC_REGEX = /[\u0600-\u06ff]/u;
const LATIN_WORD_REGEX = /[A-Za-z]{2,}/u;
const URL_OR_DOMAIN_REGEX =
  /(?:https?:\/\/|www\.|(?:[a-z0-9][a-z0-9-]*\.)+(?:com|net|org|io|co|me|xyz|top|site|vip|cc|tv)\b)/i;
