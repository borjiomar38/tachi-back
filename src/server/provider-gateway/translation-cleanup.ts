const WATERMARK_MARKER_REPLACE_REGEX = /\bRTMTH\b/gi;
const WATERMARK_MARKER_TEST_REGEX = /\bRTMTH\b/i;
const HORIZONTAL_WHITESPACE_REGEX = /[^\S\r\n]+/g;
const LINE_BREAK_REGEX = /\r\n?/g;
const MULTIPLE_LINE_BREAKS_REGEX = /\n{2,}/g;
const SPACE_BEFORE_PUNCTUATION_REGEX = /\s+([,.;:!?،؛؟…])/g;
const URL_OR_DOMAIN_TEST_REGEX =
  /(?:https?:\/\/|www\.|(?:[a-z0-9][a-z0-9-]*\.)+(?:com|net|org|io|co|me|xyz|top|site|vip|cc|tv)\b)/i;
const URL_OR_DOMAIN_REGEX =
  /(?:https?:\/\/|www\.|(?:[a-z0-9][a-z0-9-]*\.)+(?:com|net|org|io|co|me|xyz|top|site|vip|cc|tv)\b)/gi;
const WATERMARK_WORD_REGEX =
  /\b(?:acl|colamanga|hipmh|scanlations?|scanlator|discord|telegram|newtoki|manatoki)\b/gi;

type ProviderTranslationCleanupMode =
  | 'cached_ocr_source'
  | 'translated_manifest';

export function cleanProviderTranslationText(value: string) {
  return value
    .replace(WATERMARK_MARKER_REPLACE_REGEX, ' ')
    .replace(LINE_BREAK_REGEX, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(HORIZONTAL_WHITESPACE_REGEX, ' ')
        .replace(SPACE_BEFORE_PUNCTUATION_REGEX, '$1')
        .trim()
    )
    .join('\n')
    .replace(MULTIPLE_LINE_BREAKS_REGEX, '\n')
    .trim();
}

export function shouldDropProviderTranslationBlock(input: {
  mode?: ProviderTranslationCleanupMode;
  sourceText: string;
  sourceLanguage?: string;
  translation: string;
}) {
  const translation = input.translation.trim();

  if (isNoTranslationPlaceholder(translation)) {
    return true;
  }

  if (cleanProviderTranslationText(translation)) {
    return false;
  }

  if (WATERMARK_MARKER_TEST_REGEX.test(translation)) {
    return !shouldKeepEmptyAsianSourceTranslationBlock(input);
  }

  return isLikelyStandaloneWatermarkSource(input.sourceText);
}

function shouldKeepEmptyAsianSourceTranslationBlock(input: {
  mode?: ProviderTranslationCleanupMode;
  sourceLanguage?: string;
  sourceText: string;
}) {
  return (
    input.mode === 'cached_ocr_source' &&
    isAsianSourceLanguage(input.sourceLanguage ?? '') &&
    EAST_ASIAN_TEXT_REGEX.test(input.sourceText) &&
    usefulLetterOrNumberCount(input.sourceText) >= 2 &&
    !isLikelyStandaloneWatermarkSource(input.sourceText) &&
    !isKnownStandaloneAsianWatermarkSource(input.sourceText)
  );
}

function isNoTranslationPlaceholder(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(NO_TRANSLATION_PUNCTUATION_REGEX, ' ')
    .replace(HORIZONTAL_WHITESPACE_REGEX, ' ')
    .trim();

  if (!normalized) {
    return false;
  }

  return NO_TRANSLATION_PLACEHOLDER_REGEXES.some((regex) =>
    regex.test(normalized)
  );
}

function isLikelyStandaloneWatermarkSource(value: string) {
  const source = value.trim();

  if (!source || !URL_OR_DOMAIN_TEST_REGEX.test(source)) {
    return false;
  }

  const remainder = source
    .replace(URL_OR_DOMAIN_REGEX, ' ')
    .replace(WATERMARK_WORD_REGEX, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

  return remainder.length <= 3;
}

function isKnownStandaloneAsianWatermarkSource(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();

  if (!normalized) {
    return false;
  }

  return (
    ASIAN_WATERMARK_SOURCE_TEXTS.has(normalized) ||
    normalized.includes('acloudmerol') ||
    normalized.includes('colamanga') ||
    normalized.includes('hipmh')
  );
}

function isAsianSourceLanguage(sourceLanguage: string) {
  return /^(?:zh|zho|chi|cmn|yue|ja|jpn|ko|kor)(?:\b|[-_])/i.test(
    sourceLanguage.trim()
  );
}

function usefulLetterOrNumberCount(text: string) {
  return Array.from(text.matchAll(/[\p{Letter}\p{Number}]/gu)).length;
}

const NO_TRANSLATION_PUNCTUATION_REGEX = /[()[\]{}<>"'`_*:;,.!?،؛؟\-–—]+/g;
const NO_TRANSLATION_PLACEHOLDER_REGEXES = [
  /\b(?:no|not|without)\s+(?:translation|translated)\b/,
  /\b(?:untranslated|non\s+translatable|not\s+translatable|cannot\s+translate|can\s+t\s+translate)\b/,
  /\b(?:chinese|korean|japanese|cjk)\s+text\b/,
  /\btexte\s+(?:chinois|coreen|coréen|japonais)\b/,
  /\b(?:sin\s+traducci[oó]n|sans\s+traduction|pas\s+de\s+traduction)\b/,
  /(?:لا|بدون|غير|عدم)\s+ترجم\p{L}*/u,
  /نص\s+(?:صيني|كوري|ياباني)/u,
];
const EAST_ASIAN_TEXT_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
const ASIAN_WATERMARK_SOURCE_TEXTS = new Set([
  'com',
  '漫画',
  '看漫画',
  '看漫',
  '快看漫画',
  '优良漫画',
  '優良漫画',
  '动漫',
  '動漫',
  '腾讯动漫',
  '騰訊動漫',
  '体讯动漫',
  '體讯动漫',
  '體訊動漫',
]);
