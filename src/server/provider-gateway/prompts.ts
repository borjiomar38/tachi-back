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
    blocks: Array<{ text: string }>;
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
    blocks: Array<{ text: string }>;
    pageKey: string;
  }>
) {
  return Object.fromEntries(
    pages.map((page) => [page.pageKey, page.blocks.map((block) => block.text)])
  );
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
    'Return only valid JSON with the exact same keys and array lengths as the input.',
    'Do not add notes, speaker labels, markdown, code fences, or explanations.',
    'Keep translations concise enough to fit speech bubbles.',
    'Preserve tone, honorific nuance, and emotional intent where it matters.',
  ];

  const profileRule = (() => {
    switch (input.promptProfile) {
      case 'arabic_target':
        return 'Use natural modern Arabic, keep dialogue readable in bubbles, and avoid over-literal phrasing.';
      case 'chinese_to_english':
        return 'Treat this as manhua dialogue and preserve cultivation, fantasy, or wuxia terminology consistently.';
      case 'japanese_to_english':
        return 'Treat this as manga dialogue and preserve honorific nuance or speech quirks when useful for tone.';
      case 'korean_to_english':
        return 'Treat this as manhwa dialogue and keep relationship hierarchy and tone shifts clear.';
      case 'latin_source_to_english':
        return 'Prefer fluent natural English over literal wording for Latin-alphabet source languages.';
      case 'generic':
      default:
        return 'Prefer faithful but readable translation over word-for-word output.';
    }
  })();

  return [...commonRules, profileRule].join('\n');
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

export function parseTranslationPagesInput(rawPages: unknown) {
  return zTranslationGatewayPageInput.array().min(1).parse(rawPages);
}
