export type BlogWorkType = 'manga' | 'manhua' | 'manhwa';

export interface ExistingBlogTopic {
  aliases?: readonly string[];
  manhwaTitle: string;
  slug?: string | null;
  title: string;
}

export interface BlogTopicIdentity {
  aliases?: readonly string[];
  manhwaTitle: string;
  slugBase?: string | null;
  title: string;
}

export interface BlogTopicDuplicateMatch {
  existing: ExistingBlogTopic;
  existingAlias: string;
  selectedAlias: string;
}

const LEADING_ARTICLES_PATTERN =
  /\b(a|an|the|de|du|des|la|le|les|l|un|une)\b/gu;
const DATE_SUFFIX_PATTERN = /\b20\d{2}(?:\s+\d{2}\s+\d{2})?\b/gu;

export const normalizeBlogTopicName = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['’]/gu, '')
    .replace(DATE_SUFFIX_PATTERN, ' ')
    .replace(LEADING_ARTICLES_PATTERN, ' ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ');

export const buildBlogTopicAliases = (
  values: readonly (string | null | undefined)[]
): string[] => {
  const aliases = new Set<string>();

  for (const value of values) {
    const normalized = normalizeBlogTopicName(value ?? '');

    if (normalized) {
      aliases.add(normalized);
    }
  }

  return [...aliases];
};

export const buildBlogTopicIdentityAliases = (
  input: BlogTopicIdentity
): string[] =>
  buildBlogTopicAliases([
    input.manhwaTitle,
    input.title,
    input.slugBase,
    ...(input.aliases ?? []),
  ]);

export const findDuplicateBlogTopic = (
  selectedTopic: BlogTopicIdentity,
  existingTopics: readonly ExistingBlogTopic[]
): ExistingBlogTopic | null =>
  findDuplicateBlogTopicMatch(selectedTopic, existingTopics)?.existing ?? null;

export const findDuplicateBlogTopicMatch = (
  selectedTopic: BlogTopicIdentity,
  existingTopics: readonly ExistingBlogTopic[]
): BlogTopicDuplicateMatch | null => {
  const selectedAliases = buildBlogTopicIdentityAliases(selectedTopic);

  for (const existing of existingTopics) {
    const existingAliases = buildBlogTopicIdentityAliases({
      aliases: existing.aliases,
      manhwaTitle: existing.manhwaTitle,
      slugBase: existing.slug,
      title: existing.title,
    });
    const match = findAliasMatch(selectedAliases, existingAliases);

    if (match) {
      return {
        existing,
        existingAlias: match.right,
        selectedAlias: match.left,
      };
    }
  }

  return null;
};

export const hasBlogTopicAliasOverlap = (
  leftValues: readonly string[],
  rightValues: readonly string[]
): boolean => findAliasMatch(leftValues, rightValues) !== null;

function findAliasMatch(
  leftAliases: readonly string[],
  rightAliases: readonly string[]
): { left: string; right: string } | null {
  for (const leftAlias of leftAliases) {
    for (const rightAlias of rightAliases) {
      if (isSameOrNestedTopic(leftAlias, rightAlias)) {
        return {
          left: leftAlias,
          right: rightAlias,
        };
      }
    }
  }

  return null;
}

function isSameOrNestedTopic(leftAlias: string, rightAlias: string): boolean {
  if (!leftAlias || !rightAlias) {
    return false;
  }

  if (leftAlias === rightAlias) {
    return true;
  }

  if (leftAlias.length < 4 || rightAlias.length < 4) {
    return false;
  }

  return (
    containsAlias(leftAlias, rightAlias) || containsAlias(rightAlias, leftAlias)
  );
}

function containsAlias(haystack: string, needle: string): boolean {
  if (!haystack.includes(' ') && !needle.includes(' ')) {
    return haystack.includes(needle);
  }

  return ` ${haystack} `.includes(` ${needle} `);
}
