import { readFileSync } from 'node:fs';
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
import {
  type TranslationJobResultManifest,
  zTranslationJobResultManifest,
} from './schema';

type LayoutPage = {
  fileName: string;
  ocrPage: NormalizedOcrPage;
};

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures/chapter-128-prod-manifest.fixture.json'
);

describe('OCR block grouping chapter 128 end-to-end regression', () => {
  it('keeps every Chinese speech block translatable through cached OCR replay', () => {
    const manifest = loadChapter128Fixture();
    const expectedChineseTexts = collectExpectedChineseSpeechTexts(manifest);
    const layoutPages = coalesceOcrPageContinuations(
      manifest.pageOrder.map((pageKey) => {
        const page = manifest.pages[pageKey];

        if (!page) {
          throw new Error(`Fixture is missing page ${pageKey}`);
        }

        return {
          fileName: pageKey,
          ocrPage: coalesceOcrLineBlocks(
            buildCachedOcrPage({
              cacheKey: 'chapter-128-fixture',
              page,
              pageKey,
              sourceLanguage: page.sourceLanguage || manifest.sourceLanguage,
            })
          ),
        };
      })
    );
    const mergedPages = mergeWithArabicStubTranslations({
      layoutPages,
      targetLanguage: manifest.targetLanguage,
      translatorType: manifest.translatorType,
    });
    const allBlocks = Object.entries(mergedPages).flatMap(([pageKey, page]) =>
      page.blocks.map((block) => ({
        ...block,
        pageKey,
      }))
    );
    const translatableBlocks = allBlocks.filter(
      (block) => block.renderMode !== 'mask_only'
    );
    const maskOnlyBlocks = allBlocks.filter(
      (block) => block.renderMode === 'mask_only'
    );

    expect(expectedChineseTexts).not.toEqual([]);

    for (const expectedText of expectedChineseTexts) {
      expect(
        translatableBlocks.some(
          (block) =>
            normalizeOcrText(block.text) === normalizeOcrText(expectedText)
        )
      ).toBe(true);
      expect(
        maskOnlyBlocks.some(
          (block) =>
            normalizeOcrText(block.text) === normalizeOcrText(expectedText)
        )
      ).toBe(false);
    }

    for (const block of translatableBlocks) {
      expect(block.translation.trim()).not.toBe('');
      expect(block.translation).toMatch(ARABIC_REGEX);
      expect(block.translation).not.toMatch(EAST_ASIAN_REGEX);
    }

    expect(
      maskOnlyBlocks.every((block) => isPublisherWatermarkText(block.text))
    ).toBe(true);
  });
});

function loadChapter128Fixture(): TranslationJobResultManifest {
  const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<
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

function mergeWithArabicStubTranslations(input: {
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
        translationPage: {
          blocks: page.ocrPage.blocks.map((block, index) => ({
            index,
            sourceText: block.text,
            translation:
              block.renderMode === 'mask_only'
                ? ''
                : `ترجمة اختبار ${index + 1}`,
          })),
          pageKey: page.fileName,
        },
        translatorType: input.translatorType,
      }),
    ])
  );
}

function collectExpectedChineseSpeechTexts(
  manifest: TranslationJobResultManifest
) {
  return manifest.pageOrder.flatMap((pageKey) => {
    const page = manifest.pages[pageKey];

    if (!page) {
      return [];
    }

    return page.blocks
      .filter((block) => block.renderMode !== 'mask_only')
      .map((block) => block.text)
      .filter((text) => EAST_ASIAN_REGEX.test(text))
      .filter((text) => !isPublisherWatermarkText(text));
  });
}

function isPublisherWatermarkText(text: string) {
  return PUBLISHER_WATERMARK_TEXTS.has(
    normalizeOcrText(text).replace(/\s+/g, '')
  );
}

function normalizeOcrText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

const EAST_ASIAN_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
const ARABIC_REGEX = /[\u0600-\u06ff]/u;
const PUBLISHER_WATERMARK_TEXTS = new Set([
  '动漫',
  '腾讯',
  '腾讯动漫',
  '騰訊',
  '騰訊動漫',
  '体讯动漫',
  '體讯动漫',
]);
