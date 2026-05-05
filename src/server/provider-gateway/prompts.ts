import { createHash } from 'node:crypto';

import { envServer } from '@/env/server';
import { zTranslationGatewayPageInput } from '@/server/provider-gateway/schema';

type PromptProfile =
  | 'arabic_target'
  | 'chinese_to_english'
  | 'generic'
  | 'japanese_to_english'
  | 'korean_to_english'
  | 'latin_source_to_english';

const LATIN_SOURCE_LANGUAGES = new Set([
  'de',
  'en',
  'es',
  'fr',
  'id',
  'it',
  'ms',
  'pt',
  'tr',
  'vi',
]);

export function buildTranslationPrompt(input: {
  mangaContext?: string;
  pages: Array<{
    blocks: TranslationPromptBlock[];
    pageKey: string;
  }>;
  sourceLanguage: string;
  targetLanguage: string;
}) {
  const promptProfile = selectPromptProfile({
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });

  const payload = buildTranslationJsonPayload(input.pages);
  const compactContext = compactMangaContext(input.mangaContext ?? '');

  const userPrompt = [
    compactContext ? `Story context:\n${compactContext}` : null,
    'OCR block JSON:',
    JSON.stringify(payload),
    'Return only the translated JSON object.',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    promptProfile,
    promptVersion: envServer.TRANSLATION_PROMPT_VERSION,
    systemPrompt: buildSystemPrompt({
      promptProfile,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
    }),
    userPrompt,
  };
}

export function buildTranslationJsonPayload(
  pages: Array<{
    blocks: TranslationPromptBlock[];
    pageKey: string;
  }>
) {
  return Object.fromEntries(
    pages.map((page) => [
      page.pageKey,
      Object.fromEntries(
        page.blocks.map((block, index) => [
          buildBlockTranslationKey(index),
          buildBlockPayload(block),
        ])
      ),
    ])
  );
}

type TranslationPromptBlock = {
  angle?: number;
  height?: number;
  symHeight?: number;
  symWidth?: number;
  text: string;
  width?: number;
  x?: number;
  y?: number;
};

function buildBlockPayload(block: TranslationPromptBlock) {
  const layout = buildBlockLayout(block);

  return {
    sourceHash: buildBlockSourceHash(block.text),
    sourceText: normalizePromptSourceText(block.text),
    ...(layout ? { layout } : {}),
  };
}

function buildBlockLayout(block: TranslationPromptBlock) {
  const layout = {
    angle: block.angle,
    height: block.height,
    symHeight: block.symHeight,
    symWidth: block.symWidth,
    width: block.width,
    x: block.x,
    y: block.y,
  };
  const entries = Object.entries(layout).filter(
    (entry): entry is [keyof typeof layout, number] =>
      typeof entry[1] === 'number' && Number.isFinite(entry[1])
  );

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export function buildBlockTranslationKey(index: number) {
  return `block_${String(index).padStart(4, '0')}`;
}

export function buildBlockSourceHash(text: string) {
  return createHash('sha256')
    .update(normalizePromptSourceText(text))
    .digest('hex')
    .slice(0, 12);
}

export function selectPromptProfile(input: {
  sourceLanguage: string;
  targetLanguage: string;
}): PromptProfile {
  const sourceLanguage = normalizeLanguage(input.sourceLanguage);
  const targetLanguage = normalizeLanguage(input.targetLanguage);

  if (targetLanguage === 'ar') {
    return 'arabic_target';
  }

  if (sourceLanguage === 'ko' && targetLanguage === 'en') {
    return 'korean_to_english';
  }

  if (sourceLanguage === 'ja' && targetLanguage === 'en') {
    return 'japanese_to_english';
  }

  if (sourceLanguage === 'zh' && targetLanguage === 'en') {
    return 'chinese_to_english';
  }

  if (LATIN_SOURCE_LANGUAGES.has(sourceLanguage) && targetLanguage === 'en') {
    return 'latin_source_to_english';
  }

  return 'generic';
}

function buildSystemPrompt(input: {
  promptProfile: PromptProfile;
  sourceLanguage: string;
  targetLanguage: string;
}) {
  const commonRules = [
    `Translate OCR text from ${input.sourceLanguage} to ${input.targetLanguage} for manga or comic dialogue.`,
    'The input is a JSON object keyed by page filename, then by stable OCR block id. Each block value is an object with sourceHash and sourceText.',
    'sourceText is whitespace-normalized OCR text; OCR line breaks and spacing are noisy extraction artifacts, not layout instructions.',
    'When present, layout contains approximate OCR block geometry in source-image pixels: x, y, width, height, angle, symWidth, and symHeight.',
    'Return only valid JSON with the exact same page keys and block id keys as the input.',
    'Return each block as an object at the same block id key: keep sourceHash unchanged and add translation as a string.',
    'Do not echo sourceText in the response.',
    'Never put a translation under a block id unless the sourceHash and sourceText for that block id match the input block.',
    'Never merge, drop, reorder, rename, or split block ids, even when multiple blocks look like one sentence.',
    'Do not add notes, speaker labels, markdown, code fences, or explanations.',
    'Keep translations concise enough to fit speech bubbles.',
    'Choose line breaks inside each translation yourself based on target-language readability, bubble rhythm, and visual layout metadata when available.',
    'Use "\\n" in a translation only where it improves visual fit; otherwise return the translation as one line.',
    'Do not preserve, copy, or recreate OCR line breaks just because they appeared in source text.',
    'Translate like a premium scanlation localizer, not a literal subtitle engine.',
    'Preserve tone, honorific nuance, hierarchy, subtext, and emotional intent where it matters.',
    'Use polished target-language phrasing with rhythm, weight, and natural bubble flow.',
    'Prefer compact, vivid lines over word-for-word phrasing when literal translation weakens the scene.',
    'Keep character voices distinct: elders sound measured, rulers authoritative, strategists controlled, and angry characters sharp without becoming crude.',
    'Preserve dramatic pauses, ellipses, and quiet menace when the original uses tension or restraint.',
    'Remove watermarks, scan group credits, URLs, and unrelated site text by translating that block as "RTMTH".',
  ];

  const profileRules = (() => {
    switch (input.promptProfile) {
      case 'arabic_target':
        return [
          'Arabic style: use elevated Modern Standard Arabic (فصحى جزلة), refined, solemn, and literary.',
          'Do not use casual dialect. Avoid flat modern phrasing unless the character voice clearly requires simplicity.',
          'For historical, murim, martial arts, fantasy, royal, or sect dialogue, make the Arabic feel dignified and almost poetic, with restrained grandeur.',
          'Shape lines like Arabic scanlation bubbles: short, balanced, readable, and charged with meaning.',
          'Use strong Arabic diction when suitable: العظمة، الهيبة، القدر، الريبة، الولاء، البصيرة، الحزم، المكر، السمو، الجحود، الارتياب.',
          'Prefer natural Arabic rhetorical turns such as "ما كان لي أن...", "لست ممن...", "إن في ذلك...", "غير أن...", "حسبك...", and "لقد أدركت الآن..." when they fit.',
          'Let threats remain veiled and dignified. Let wisdom sound weighty. Let ambiguity stay alive instead of over-explaining it.',
          'Arabic punctuation and right-to-left flow must feel natural inside speech bubbles.',
        ];
      case 'chinese_to_english':
        return [
          'Treat this as manhua dialogue and preserve cultivation, fantasy, or wuxia terminology consistently.',
          'For wuxia/xianxia scenes, use elevated English with controlled grandeur rather than casual modern phrasing.',
        ];
      case 'japanese_to_english':
        return [
          'Treat this as manga dialogue and preserve honorific nuance or speech quirks when useful for tone.',
          'Use natural English that still carries manga timing: concise reactions, clean pauses, and readable emotional beats.',
        ];
      case 'korean_to_english':
        return [
          'Treat this as manhwa dialogue and keep relationship hierarchy and tone shifts clear.',
          'For martial, historical, regression, or royal-political scenes, keep the English refined, tense, and dramatic without sounding archaic by default.',
        ];
      case 'latin_source_to_english':
        return [
          'Prefer fluent natural English over literal wording for Latin-alphabet source languages.',
          'Keep jokes, insults, and emotional turns idiomatic in English while preserving the panel rhythm.',
        ];
      case 'generic':
      default:
        return [
          'Prefer faithful but readable translation over word-for-word output.',
          'Adapt the style to the target language: literary for solemn fantasy, sharp for action, warm for romance, and clean for comedy.',
        ];
    }
  })();

  return [...commonRules, ...profileRules].join('\n');
}

function compactMangaContext(context: string) {
  if (!context.trim()) {
    return '';
  }

  const trimmed = context.trim();
  if (trimmed.length <= 4000) {
    return trimmed;
  }

  return trimmed.slice(trimmed.length - 4000);
}

function normalizeLanguage(language: string) {
  return language.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

function normalizePromptSourceText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function parseTranslationPagesInput(rawPages: unknown) {
  return zTranslationGatewayPageInput.array().min(1).parse(rawPages);
}
