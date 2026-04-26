import { z } from 'zod';

import { performHostedTranslation } from '@/server/provider-gateway/service';

const MANGA_PAGE_KEY = 'manga_page';
const MAX_CHAPTERS_PER_REQUEST = 500;

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
  const { blocks, refs } = buildTranslationBlocks(input);

  if (blocks.length === 0) {
    return {
      chapters: [],
      manga: {},
      targetLanguage: input.targetLanguage,
    };
  }

  const translated = await translate({
    mangaContext: buildMangaContext(input),
    pages: [
      {
        blocks,
        pageKey: MANGA_PAGE_KEY,
      },
    ],
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });

  const page = translated.pages.find(
    (candidate) => candidate.pageKey === MANGA_PAGE_KEY
  );
  const translations = page?.blocks ?? [];

  return buildResponse({
    input,
    refs,
    translations,
  });
}

function buildTranslationBlocks(input: TranslateMangaPageInput) {
  const blocks: Array<{ text: string }> = [];
  const refs: MangaPageBlockRef[] = [];

  pushBlock(blocks, refs, { type: 'title' }, input.manga.title);
  pushBlock(blocks, refs, { type: 'description' }, input.manga.description);

  input.manga.genres?.forEach((genre, index) => {
    pushBlock(blocks, refs, { index, type: 'genre' }, genre);
  });

  input.chapters.forEach((chapter) => {
    pushBlock(
      blocks,
      refs,
      { key: chapter.key, type: 'chapter' },
      chapter.name
    );
  });

  return { blocks, refs };
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
  refs: MangaPageBlockRef[];
  translations: Array<{
    index: number;
    translation: string;
  }>;
}) {
  const translatedByIndex = new Map(
    input.translations.map((block) => [
      block.index,
      sanitizeTranslation(block.translation),
    ])
  );
  const manga: {
    description?: string;
    genres?: string[];
    title?: string;
  } = {};
  const genreTranslations = input.input.manga.genres
    ? [...input.input.manga.genres]
    : undefined;
  const chapters: Array<{ key: string; name: string }> = [];

  input.refs.forEach((ref, index) => {
    const translation = translatedByIndex.get(index);

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

function buildMangaContext(input: TranslateMangaPageInput) {
  return [
    'Translate manga detail page metadata and chapter labels, not dialogue.',
    `Manga title: ${input.manga.title}`,
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
