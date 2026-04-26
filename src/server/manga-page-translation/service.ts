import { z } from 'zod';

import { performHostedTranslation } from '@/server/provider-gateway/service';

const MANGA_PAGE_KEY = 'manga_page';
const MANGA_PAGE_ENGLISH_KEY = 'manga_page_english';
const MANGA_PAGE_LOCALIZED_KEY = 'manga_page_localized';
const MAX_CHAPTERS_PER_REQUEST = 500;
const ENGLISH_TARGET_LANGUAGE = 'en';

const zOptionalText = z.string().trim().max(10_000).nullish();

export const zTranslateMangaPageInput = z.object({
  chapters: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(500),
        name: z.string().trim().min(1).max(500),
        url: z.string().trim().max(2_000),
      })
    )
    .max(MAX_CHAPTERS_PER_REQUEST),
  manga: z.object({
    artist: zOptionalText,
    author: zOptionalText,
    description: zOptionalText,
    genres: z.array(z.string().trim().min(1).max(100)).max(50).nullish(),
    title: z.string().trim().min(1).max(500),
    url: z.string().trim().min(1).max(2_000),
  }),
  sourceId: z.string().trim().min(1).max(200),
  sourceLanguage: z.string().trim().min(1).max(32).default('auto'),
  sourceName: z.string().trim().max(200).nullish(),
  targetLanguage: z.string().trim().min(1).max(32),
});

export type TranslateMangaPageInput = z.infer<typeof zTranslateMangaPageInput>;

type HostedTranslationFn = typeof performHostedTranslation;

type MangaPageBlockRef =
  | {
      type: 'chapter';
      key: string;
    }
  | {
      type: 'description' | 'title';
    }
  | {
      index: number;
      type: 'genre';
    };

export async function translateMangaPage(
  rawInput: unknown,
  deps: {
    translate?: HostedTranslationFn;
  } = {}
) {
  const input = zTranslateMangaPageInput.parse(rawInput);
  const translate = deps.translate ?? performHostedTranslation;
  const blockGroups = buildTranslationBlockGroups(input);

  if (blockGroups.length === 0) {
    return {
      chapters: [],
      manga: {},
      targetLanguage: input.targetLanguage,
    };
  }

  const translatedItems = (
    await Promise.all(
      blockGroups.map(
        async (group) =>
          await translateBlockGroup({
            group,
            input,
            translate,
          })
      )
    )
  ).flat();

  return buildResponse({
    input,
    translatedItems,
  });
}

function buildTranslationBlockGroups(input: TranslateMangaPageInput) {
  const targetLanguage = normalizeLanguage(input.targetLanguage);

  if (targetLanguage === ENGLISH_TARGET_LANGUAGE) {
    const group = createBlockGroup(MANGA_PAGE_KEY, ENGLISH_TARGET_LANGUAGE);

    pushBlock(group.blocks, group.refs, { type: 'title' }, input.manga.title);
    pushBlock(
      group.blocks,
      group.refs,
      { type: 'description' },
      input.manga.description
    );

    input.manga.genres?.forEach((genre, index) => {
      pushBlock(group.blocks, group.refs, { index, type: 'genre' }, genre);
    });

    input.chapters.forEach((chapter) => {
      pushBlock(
        group.blocks,
        group.refs,
        { key: chapter.key, type: 'chapter' },
        chapter.name
      );
    });

    return group.blocks.length > 0 ? [group] : [];
  }

  const englishGroup = createBlockGroup(
    MANGA_PAGE_ENGLISH_KEY,
    ENGLISH_TARGET_LANGUAGE
  );
  const localizedGroup = createBlockGroup(
    MANGA_PAGE_LOCALIZED_KEY,
    input.targetLanguage
  );

  pushBlock(
    englishGroup.blocks,
    englishGroup.refs,
    { type: 'title' },
    input.manga.title
  );

  input.chapters.forEach((chapter) => {
    pushBlock(
      englishGroup.blocks,
      englishGroup.refs,
      { key: chapter.key, type: 'chapter' },
      chapter.name
    );
  });

  pushBlock(
    localizedGroup.blocks,
    localizedGroup.refs,
    { type: 'description' },
    input.manga.description
  );

  input.manga.genres?.forEach((genre, index) => {
    pushBlock(
      localizedGroup.blocks,
      localizedGroup.refs,
      { index, type: 'genre' },
      genre
    );
  });

  return [englishGroup, localizedGroup].filter(
    (group) => group.blocks.length > 0
  );
}

function createBlockGroup(pageKey: string, targetLanguage: string) {
  return {
    blocks: [] as Array<{ text: string }>,
    pageKey,
    refs: [] as MangaPageBlockRef[],
    targetLanguage,
  };
}

async function translateBlockGroup(input: {
  group: ReturnType<typeof createBlockGroup>;
  input: TranslateMangaPageInput;
  translate: HostedTranslationFn;
}) {
  const translated = await input.translate({
    mangaContext: buildMangaContext(input.input, input.group.targetLanguage),
    pages: [
      {
        blocks: input.group.blocks,
        pageKey: input.group.pageKey,
      },
    ],
    sourceLanguage: input.input.sourceLanguage,
    targetLanguage: input.group.targetLanguage,
  });

  const page = translated.pages.find(
    (candidate) => candidate.pageKey === input.group.pageKey
  );
  const translatedByIndex = new Map(
    (page?.blocks ?? []).map((block) => [
      block.index,
      sanitizeTranslation(block.translation),
    ])
  );

  return input.group.refs.map((ref, index) => ({
    ref,
    translation: translatedByIndex.get(index) ?? '',
  }));
}

function pushBlock(
  blocks: Array<{ text: string }>,
  refs: MangaPageBlockRef[],
  ref: MangaPageBlockRef,
  rawText: string | null | undefined
) {
  const text = rawText?.trim();

  if (!text) {
    return;
  }

  blocks.push({ text });
  refs.push(ref);
}

function buildResponse(input: {
  input: TranslateMangaPageInput;
  translatedItems: Array<{
    ref: MangaPageBlockRef;
    translation: string;
  }>;
}) {
  const manga: {
    description?: string;
    genres?: string[];
    title?: string;
  } = {};
  const genreTranslations = input.input.manga.genres
    ? [...input.input.manga.genres]
    : undefined;
  const chapters: Array<{ key: string; name: string }> = [];

  input.translatedItems.forEach(({ ref, translation }) => {
    if (!translation) {
      return;
    }

    switch (ref.type) {
      case 'title':
        manga.title = translation;
        break;
      case 'description':
        manga.description = translation;
        break;
      case 'genre':
        if (genreTranslations) {
          genreTranslations[ref.index] = translation;
        }
        break;
      case 'chapter':
        chapters.push({
          key: ref.key,
          name: translation,
        });
        break;
    }
  });

  if (
    genreTranslations?.some(
      (genre, index) => genre !== input.input.manga.genres?.[index]
    )
  ) {
    manga.genres = genreTranslations;
  }

  return {
    chapters,
    manga,
    targetLanguage: input.input.targetLanguage,
  };
}

function sanitizeTranslation(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === 'RTMTH') {
    return '';
  }

  return trimmed;
}

function buildMangaContext(
  input: TranslateMangaPageInput,
  targetLanguage: string
) {
  return [
    'Translate manga detail page metadata and chapter labels, not dialogue.',
    `Manga title: ${input.manga.title}`,
    normalizeLanguage(targetLanguage) === ENGLISH_TARGET_LANGUAGE
      ? 'For this request, manga title and chapter labels must be translated into English even when the app page target language is different.'
      : null,
    input.sourceName ? `Source: ${input.sourceName}` : null,
    input.manga.author ? `Author: ${input.manga.author}` : null,
    input.manga.artist ? `Artist: ${input.manga.artist}` : null,
    input.manga.genres?.length
      ? `Genres: ${input.manga.genres.join(', ')}`
      : null,
    'Keep proper names as names. Translate chapter labels naturally, for example "第123话" as "Chapter 123" in English.',
  ]
    .filter(Boolean)
    .join('\n');
}

function normalizeLanguage(language: string) {
  return language.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}
