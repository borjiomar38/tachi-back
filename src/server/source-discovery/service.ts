import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { GENERATED_SOURCE_THEME_HINTS } from './theme-hints.generated';

const KEIYOUSHI_INDEX_URL =
  'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json';
const KEIYOUSHI_REPO_URL =
  'https://raw.githubusercontent.com/keiyoushi/extensions/repo';
const INDEX_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_ALIASES = 12;
const SUPPORTED_DISCOVERY_ADAPTERS = new Set([
  'asurascans',
  'flamecomics',
  'madara',
  'mangadex',
  'mangathemesia',
  'manhwaz',
  'zeistmanga',
]);

export const zSourceDiscoveryPlanInput = z.object({
  includeNsfw: z.boolean().default(false),
  maxCandidates: z.number().int().min(5).max(100).default(60),
  preferredLanguages: z
    .array(z.string().trim().min(1).max(32))
    .max(20)
    .optional()
    .default([]),
  query: z.string().trim().min(1).max(200),
  targetChapter: z.number().int().positive().optional(),
});

const zExtensionIndexSource = z.object({
  baseUrl: z.string().trim().min(1),
  id: z.union([z.string(), z.number()]).transform(String),
  lang: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const zExtensionIndexItem = z.object({
  apk: z.string().trim().min(1),
  code: z.number().int(),
  lang: z.string().trim().min(1),
  name: z.string().trim().min(1),
  nsfw: z.union([z.literal(0), z.literal(1)]),
  pkg: z.string().trim().min(1),
  sources: z.array(zExtensionIndexSource).nullish(),
  version: z.string().trim().min(1),
});

const zExtensionIndex = z.array(zExtensionIndexItem);

export type SourceDiscoveryPlanInput = z.infer<
  typeof zSourceDiscoveryPlanInput
>;

export type SourceDiscoveryAdapterKey =
  | 'asurascans'
  | 'flamecomics'
  | 'generic'
  | 'madara'
  | 'mangadex'
  | 'mangathemesia'
  | 'manhwaz'
  | 'zeistmanga';

export type SourceDiscoveryPlanCandidate = {
  adapterKey: SourceDiscoveryAdapterKey;
  apkName: string;
  baseUrl: string;
  extensionLang: string;
  extensionName: string;
  iconUrl: string;
  isNsfw: boolean;
  packageName: string;
  priority: number;
  reasonCodes: string[];
  repoUrl: string;
  searchQueries: string[];
  sourceId: string;
  sourceLanguage: string;
  sourceName: string;
  themeKey: string | null;
};

type ExtensionIndex = z.infer<typeof zExtensionIndex>;
type ExtensionIndexSource = z.infer<typeof zExtensionIndexSource>;

type SourceThemeHint = {
  baseUrl: string;
  extensionName?: string | null;
  themeKey: string;
};

let indexCache:
  | {
      expiresAt: number;
      items: ExtensionIndex;
    }
  | undefined;

export async function buildSourceDiscoveryPlan(
  rawInput: unknown,
  deps: {
    extensionIndexItems?: ExtensionIndex;
    fetchFn?: typeof fetch;
    now?: () => Date;
    sourceThemeHints?: SourceThemeHint[];
  } = {}
) {
  const input = zSourceDiscoveryPlanInput.parse(rawInput);
  const now = deps.now?.() ?? new Date();
  const aliases = buildSearchAliases(input.query);
  const sourceThemeHints =
    deps.sourceThemeHints ?? (await loadSourceThemeHints());
  const themeByBaseUrl = buildThemeHintMap(sourceThemeHints);
  const items =
    deps.extensionIndexItems ??
    (await fetchExtensionIndex({
      fetchFn: deps.fetchFn ?? fetch,
      now,
    }));

  const candidates = items
    .filter((extension) => input.includeNsfw || extension.nsfw !== 1)
    .flatMap((extension) =>
      (extension.sources ?? []).map((source) =>
        buildCandidate({
          aliases,
          extension,
          input,
          source,
          themeKey:
            themeByBaseUrl.get(normalizeBaseUrl(source.baseUrl)) ?? null,
        })
      )
    )
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return `${left.extensionName}:${left.sourceName}`.localeCompare(
        `${right.extensionName}:${right.sourceName}`
      );
    })
    .slice(0, input.maxCandidates);

  return {
    aliasStrategy: 'deterministic',
    aliases,
    candidates,
    generatedAt: now.toISOString(),
    indexSourceUrl: KEIYOUSHI_INDEX_URL,
    query: input.query,
    targetChapter: input.targetChapter ?? null,
  };
}

export function buildSearchAliases(query: string) {
  const normalized = query.trim().replace(/\s+/g, ' ');
  const withoutBracketText = normalized
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const punctuationAsSpace = withoutBracketText
    .replace(/['’]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const titleParts = withoutBracketText
    .split(/\s*[:|/-]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const compactKeywords = punctuationAsSpace
    .split(' ')
    .filter(
      (word) => !['a', 'an', 'and', 'of', 'the'].includes(word.toLowerCase())
    )
    .join(' ');

  return uniqueNonEmpty([
    normalized,
    withoutBracketText,
    punctuationAsSpace,
    ...titleParts,
    compactKeywords,
    punctuationAsSpace.toLowerCase(),
  ]).slice(0, MAX_ALIASES);
}

async function fetchExtensionIndex(input: {
  fetchFn: typeof fetch;
  now: Date;
}): Promise<ExtensionIndex> {
  if (indexCache && indexCache.expiresAt > input.now.getTime()) {
    return indexCache.items;
  }

  const response = await input.fetchFn(KEIYOUSHI_INDEX_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'TachiyomiAT-Back/source-discovery',
    },
  });

  if (!response.ok) {
    throw new SourceDiscoveryError(
      'extension_index_unavailable',
      `Keiyoushi extension index returned HTTP ${response.status}`,
      502
    );
  }

  const parsed = zExtensionIndex.safeParse(await response.json());

  if (!parsed.success) {
    throw new SourceDiscoveryError(
      'extension_index_invalid',
      'Keiyoushi extension index has an unexpected shape',
      502
    );
  }

  indexCache = {
    expiresAt: input.now.getTime() + INDEX_CACHE_TTL_MS,
    items: parsed.data,
  };

  return parsed.data;
}

function buildCandidate(input: {
  aliases: string[];
  extension: ExtensionIndex[number];
  input: SourceDiscoveryPlanInput;
  source: ExtensionIndexSource;
  themeKey: string | null;
}): SourceDiscoveryPlanCandidate {
  const adapterKey = resolveAdapterKey({
    baseUrl: input.source.baseUrl,
    sourceName: input.source.name,
    themeKey: input.themeKey,
  });
  const { priority, reasonCodes } = scoreCandidate({
    adapterKey,
    baseUrl: input.source.baseUrl,
    extensionLang: input.extension.lang,
    extensionName: input.extension.name,
    preferredLanguages: input.input.preferredLanguages,
    sourceLanguage: input.source.lang,
    sourceName: input.source.name,
    themeKey: input.themeKey,
  });

  return {
    adapterKey,
    apkName: input.extension.apk,
    baseUrl: input.source.baseUrl,
    extensionLang: input.extension.lang,
    extensionName: input.extension.name,
    iconUrl: `${KEIYOUSHI_REPO_URL}/icon/${input.extension.pkg}.png`,
    isNsfw: input.extension.nsfw === 1,
    packageName: input.extension.pkg,
    priority,
    reasonCodes,
    repoUrl: KEIYOUSHI_REPO_URL,
    searchQueries: input.aliases,
    sourceId: input.source.id,
    sourceLanguage: input.source.lang,
    sourceName: input.source.name,
    themeKey: input.themeKey,
  };
}

function scoreCandidate(input: {
  adapterKey: SourceDiscoveryAdapterKey;
  baseUrl: string;
  extensionLang: string;
  extensionName: string;
  preferredLanguages: string[];
  sourceLanguage: string;
  sourceName: string;
  themeKey: string | null;
}) {
  const haystack = `${input.extensionName} ${input.sourceName} ${input.baseUrl}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  const preferredLanguages = new Set(
    input.preferredLanguages.map((language) => language.toLowerCase())
  );
  const reasonCodes: string[] = [];
  let priority = 0;

  if (input.adapterKey !== 'generic') {
    priority += 30;
    reasonCodes.push('supported_adapter');
  } else if (input.themeKey) {
    priority += 10;
    reasonCodes.push('known_theme');
  }

  for (const [keyword, score] of [
    ['manhwa', 24],
    ['webtoon', 20],
    ['asura', 18],
    ['flame', 16],
    ['toon', 12],
    ['scan', 10],
    ['manga', 8],
    ['comic', 6],
  ] as const) {
    if (haystack.includes(keyword)) {
      priority += score;
      reasonCodes.push(`keyword_${keyword}`);
    }
  }

  if (
    preferredLanguages.has(input.sourceLanguage.toLowerCase()) ||
    preferredLanguages.has(input.extensionLang.toLowerCase())
  ) {
    priority += 8;
    reasonCodes.push('preferred_language');
  }

  if (input.sourceLanguage === 'all' || input.extensionLang === 'all') {
    priority += 4;
    reasonCodes.push('all_language');
  }

  return {
    priority,
    reasonCodes: uniqueNonEmpty(reasonCodes),
  };
}

function resolveAdapterKey(input: {
  baseUrl: string;
  sourceName: string;
  themeKey: string | null;
}): SourceDiscoveryAdapterKey {
  const sourceKey = `${input.sourceName} ${input.baseUrl}`.toLowerCase();

  if (sourceKey.includes('asura')) return 'asurascans';
  if (sourceKey.includes('flame')) return 'flamecomics';
  if (sourceKey.includes('mangadex')) return 'mangadex';
  if (
    input.themeKey &&
    SUPPORTED_DISCOVERY_ADAPTERS.has(input.themeKey.toLowerCase())
  ) {
    return input.themeKey.toLowerCase() as SourceDiscoveryAdapterKey;
  }

  return 'generic';
}

async function loadSourceThemeHints(): Promise<SourceThemeHint[]> {
  const generatedHints = GENERATED_SOURCE_THEME_HINTS.map((hint) => ({
    baseUrl: hint.baseUrl,
    extensionName: hint.extensionName,
    themeKey: hint.themeKey,
  }));
  const sourceRoot = path.resolve(process.cwd(), '../extensions-source');

  try {
    const localHints = await readLocalSourceThemeHints(
      path.join(sourceRoot, 'src')
    );
    return [...generatedHints, ...localHints];
  } catch {
    return generatedHints;
  }
}

async function readLocalSourceThemeHints(
  root: string
): Promise<SourceThemeHint[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nestedHints = await Promise.all(
    entries.map(async (entry) => {
      const itemPath = path.join(root, entry.name);

      if (entry.isDirectory()) {
        return await readLocalSourceThemeHints(itemPath);
      }

      if (entry.name !== 'build.gradle') {
        return [];
      }

      const gradle = await readFile(itemPath, 'utf8');
      const baseUrl = readGradleStringValue(gradle, 'baseUrl');
      const themeKey = readGradleStringValue(gradle, 'themePkg');
      const extensionName = readGradleStringValue(gradle, 'extName');

      if (!baseUrl || !themeKey) {
        return [];
      }

      return [
        {
          baseUrl,
          extensionName,
          themeKey,
        },
      ];
    })
  );

  return nestedHints.flat();
}

function readGradleStringValue(text: string, key: string) {
  return (
    text.match(new RegExp(`${key}\\s*=\\s*['"]([^'"]+)['"]`))?.[1]?.trim() ??
    null
  );
}

function buildThemeHintMap(hints: SourceThemeHint[]) {
  const map = new Map<string, string>();

  for (const hint of hints) {
    map.set(normalizeBaseUrl(hint.baseUrl), hint.themeKey.toLowerCase());
  }

  return map;
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export class SourceDiscoveryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}
