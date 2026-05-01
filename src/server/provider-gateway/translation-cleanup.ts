const WATERMARK_MARKER_REPLACE_REGEX = /\bRTMTH\b/gi;
const WATERMARK_MARKER_TEST_REGEX = /\bRTMTH\b/i;
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
    .replace(/\s+/g, ' ')
    .replace(SPACE_BEFORE_PUNCTUATION_REGEX, '$1')
    .trim();
}

export function shouldDropProviderTranslationBlock(input: {
  sourceText: string;
  translation: string;
}) {
  const translation = input.translation.trim();

  if (cleanProviderTranslationText(translation)) {
    return false;
  }

  return (
    WATERMARK_MARKER_TEST_REGEX.test(translation) ||
    isLikelyStandaloneWatermarkSource(input.sourceText)
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
