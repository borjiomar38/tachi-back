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
  /\b(?:acl|colamanga|scanlations?|scanlator|discord|telegram|newtoki|manatoki)\b/gi;

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
  sourceText: string;
  translation: string;
}) {
  const translation = input.translation.trim();

  if (isNoTranslationPlaceholder(translation)) {
    return true;
  }

  if (cleanProviderTranslationText(translation)) {
    return false;
  }

  return (
    WATERMARK_MARKER_TEST_REGEX.test(translation) ||
    isLikelyStandaloneWatermarkSource(input.sourceText)
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
