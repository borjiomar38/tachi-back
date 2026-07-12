import { z } from 'zod';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';

export const contentMetadataPolicyConfigKey =
  'content_metadata_translation_block_policy';

export const contentMetadataFields = [
  'genres',
  'tags',
  'categories',
  'rating',
  'contentRating',
] as const;

export type ContentMetadataField = (typeof contentMetadataFields)[number];

export interface BlockedContentMetadataValue {
  field: ContentMetadataField;
  normalizedValue: string;
  value: string;
}

export interface DiscoveredContentMetadataValue extends BlockedContentMetadataValue {
  count: number;
  examples: string[];
  isBlocked: boolean;
}

export interface ContentMetadataPolicy {
  blockedValues: BlockedContentMetadataValue[];
  mode: 'default' | 'saved';
  updatedAt: Date | null;
}

const zContentMetadataField = z.enum(contentMetadataFields);

export const zBlockedContentMetadataValue = z
  .object({
    field: zContentMetadataField,
    normalizedValue: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(255),
  })
  .strict();

export const zContentMetadataPolicyInput = z
  .object({
    blockedValues: z.array(zBlockedContentMetadataValue).max(500),
  })
  .strict();

const zStoredContentMetadataPolicy = zContentMetadataPolicyInput.partial();

export function getDefaultExplicitAdultBlockedMetadataValues(): BlockedContentMetadataValue[] {
  const defaultValues = [
    { field: 'genres', value: 'Hentai' },
    { field: 'tags', value: 'Hentai' },
    { field: 'tags', value: 'Pornographic' },
    { field: 'tags', value: 'Pornography' },
    { field: 'tags', value: 'Explicit sex' },
    { field: 'tags', value: 'Adult explicit' },
    { field: 'tags', value: 'Explicit adult' },
    { field: 'tags', value: 'Hardcore' },
    { field: 'categories', value: 'Hentai' },
    { field: 'categories', value: 'Pornographic' },
    { field: 'rating', value: 'Explicit' },
    { field: 'rating', value: 'Explicit adult' },
    { field: 'rating', value: 'Adult' },
    { field: 'rating', value: '18+ explicit' },
    { field: 'contentRating', value: 'Explicit' },
    { field: 'contentRating', value: 'Explicit adult' },
    { field: 'contentRating', value: 'Adult' },
    { field: 'contentRating', value: '18+ explicit' },
  ] satisfies Array<{
    field: ContentMetadataField;
    value: string;
  }>;

  return defaultValues.map((item) => ({
    ...item,
    normalizedValue: normalizeContentMetadataValue(item.value),
  }));
}

export async function getContentMetadataPolicy(deps?: {
  dbClient?: typeof db;
}): Promise<ContentMetadataPolicy> {
  const dbClient = deps?.dbClient ?? db;
  const appConfig = dbClient.appConfig as
    | {
        findUnique: typeof db.appConfig.findUnique;
      }
    | undefined;

  if (!appConfig) {
    return {
      blockedValues: getDefaultExplicitAdultBlockedMetadataValues(),
      mode: 'default',
      updatedAt: null,
    };
  }

  const entry = await appConfig.findUnique({
    select: {
      updatedAt: true,
      value: true,
    },
    where: {
      key: contentMetadataPolicyConfigKey,
    },
  });
  const parsedValue = zStoredContentMetadataPolicy.safeParse(entry?.value);

  if (!entry || !parsedValue.success || !parsedValue.data.blockedValues) {
    return {
      blockedValues: getDefaultExplicitAdultBlockedMetadataValues(),
      mode: 'default',
      updatedAt: null,
    };
  }

  return {
    blockedValues: normalizeBlockedMetadataValues(
      parsedValue.data.blockedValues
    ),
    mode: 'saved',
    updatedAt: entry.updatedAt,
  };
}

export async function updateContentMetadataPolicy(
  input: z.infer<typeof zContentMetadataPolicyInput>,
  deps?: {
    dbClient?: typeof db;
  }
): Promise<ContentMetadataPolicy> {
  const dbClient = deps?.dbClient ?? db;
  const parsed = zContentMetadataPolicyInput.parse(input);
  const blockedValues = normalizeBlockedMetadataValues(parsed.blockedValues);
  const value = {
    blockedValues: blockedValues.map((blockedValue) => ({
      field: blockedValue.field,
      normalizedValue: blockedValue.normalizedValue,
      value: blockedValue.value,
    })),
  } satisfies Prisma.InputJsonObject;
  const entry = await dbClient.appConfig.upsert({
    create: {
      key: contentMetadataPolicyConfigKey,
      value,
    },
    select: {
      updatedAt: true,
      value: true,
    },
    update: {
      value,
    },
    where: {
      key: contentMetadataPolicyConfigKey,
    },
  });
  const saved = zContentMetadataPolicyInput.parse(entry.value);

  return {
    blockedValues: saved.blockedValues,
    mode: 'saved',
    updatedAt: entry.updatedAt,
  };
}

export async function updateContentMetadataValueBlock(
  input: {
    blocked: boolean;
    value: BlockedContentMetadataValue;
  },
  deps?: {
    dbClient?: typeof db;
  }
) {
  const dbClient = deps?.dbClient ?? db;
  const policy = await getContentMetadataPolicy({ dbClient });
  const value = zBlockedContentMetadataValue.parse(input.value);
  const valueKey = buildMetadataKey(value);
  const remainingValues = policy.blockedValues.filter(
    (blockedValue) => buildMetadataKey(blockedValue) !== valueKey
  );
  const blockedValues = input.blocked
    ? [...remainingValues, value]
    : remainingValues;

  return await updateContentMetadataPolicy(
    {
      blockedValues,
    },
    {
      dbClient,
    }
  );
}

export async function discoverContentMetadataValues(deps?: {
  dbClient?: typeof db;
  policy?: ContentMetadataPolicy;
}): Promise<DiscoveredContentMetadataValue[]> {
  const dbClient = deps?.dbClient ?? db;
  const policy = deps?.policy ?? (await getContentMetadataPolicy({ dbClient }));
  const [jobRows, cacheRows, discoveryRows] = await Promise.all([
    dbClient.translationJob.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        chapterIdentity: true,
      },
      take: 5000,
    }),
    dbClient.translationResultCache.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        chapterIdentity: true,
      },
      take: 5000,
    }),
    dbClient.sourceDiscoveryResult.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        metadata: true,
      },
      take: 5000,
    }),
  ]);
  const accumulator = new Map<string, DiscoveredContentMetadataValue>();

  for (const item of getDefaultExplicitAdultBlockedMetadataValues()) {
    addDiscoveredMetadataValue(accumulator, item);
  }

  for (const item of policy.blockedValues) {
    addDiscoveredMetadataValue(accumulator, item);
  }

  for (const row of jobRows) {
    addMetadataRecord(accumulator, row.chapterIdentity);
  }

  for (const row of cacheRows) {
    addMetadataRecord(accumulator, row.chapterIdentity);
  }

  for (const row of discoveryRows) {
    addMetadataRecord(accumulator, row.metadata);
  }

  const blockedKeys = new Set(
    policy.blockedValues.map((value) => buildMetadataKey(value))
  );

  return [...accumulator.values()]
    .map((item) => ({
      ...item,
      isBlocked: blockedKeys.has(buildMetadataKey(item)),
    }))
    .sort((first, second) => {
      const fieldOrder =
        contentMetadataFields.indexOf(first.field) -
        contentMetadataFields.indexOf(second.field);

      if (fieldOrder !== 0) {
        return fieldOrder;
      }

      return first.value.localeCompare(second.value);
    });
}

export function discoverContentMetadataValuesFromRecords(
  records: readonly unknown[],
  policy: ContentMetadataPolicy
): DiscoveredContentMetadataValue[] {
  const accumulator = new Map<string, DiscoveredContentMetadataValue>();

  for (const record of records) {
    addMetadataRecord(accumulator, record);
  }

  const blockedKeys = new Set(
    policy.blockedValues.map((value) => buildMetadataKey(value))
  );

  return [...accumulator.values()]
    .map((item) => ({
      ...item,
      isBlocked: blockedKeys.has(buildMetadataKey(item)),
    }))
    .sort((first, second) => {
      const fieldOrder =
        contentMetadataFields.indexOf(first.field) -
        contentMetadataFields.indexOf(second.field);

      if (fieldOrder !== 0) {
        return fieldOrder;
      }

      return first.value.localeCompare(second.value);
    });
}

export function normalizeBlockedMetadataValues(
  input: readonly Omit<BlockedContentMetadataValue, 'normalizedValue'>[]
): BlockedContentMetadataValue[] {
  const values = input
    .map((item) => ({
      field: item.field,
      normalizedValue: normalizeContentMetadataValue(item.value),
      value: item.value.trim(),
    }))
    .filter((item) => item.normalizedValue.length > 0);
  const deduped = new Map<string, BlockedContentMetadataValue>();

  for (const value of values) {
    const key = buildMetadataKey(value);
    const current = deduped.get(key);

    if (!current || value.value.length < current.value.length) {
      deduped.set(key, value);
    }
  }

  return [...deduped.values()];
}

export function normalizeContentMetadataValue(input: string) {
  return input
    .normalize('NFKC')
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function addMetadataRecord(
  accumulator: Map<string, DiscoveredContentMetadataValue>,
  input: unknown
) {
  const record = asRecord(input);

  if (!record) {
    return;
  }

  addMetadataList(accumulator, 'genres', record.genres);
  addMetadataList(accumulator, 'tags', record.tags);
  addMetadataList(accumulator, 'categories', record.categories);
  addMetadataText(accumulator, 'rating', record.rating);
  addMetadataText(accumulator, 'contentRating', record.contentRating);
  addMetadataText(accumulator, 'contentRating', record.content_rating);
}

function addMetadataList(
  accumulator: Map<string, DiscoveredContentMetadataValue>,
  field: ContentMetadataField,
  input: unknown
) {
  if (Array.isArray(input)) {
    for (const item of input) {
      addMetadataText(accumulator, field, item);
    }
    return;
  }

  addMetadataText(accumulator, field, input);
}

function addMetadataText(
  accumulator: Map<string, DiscoveredContentMetadataValue>,
  field: ContentMetadataField,
  input: unknown
) {
  if (typeof input !== 'string') {
    return;
  }

  addDiscoveredMetadataValue(accumulator, {
    field,
    normalizedValue: normalizeContentMetadataValue(input),
    value: input.trim(),
  });
}

function addDiscoveredMetadataValue(
  accumulator: Map<string, DiscoveredContentMetadataValue>,
  input: BlockedContentMetadataValue
) {
  if (!input.normalizedValue) {
    return;
  }

  const key = buildMetadataKey(input);
  const current = accumulator.get(key);

  if (current) {
    current.count += 1;
    if (!current.examples.includes(input.value)) {
      current.examples = [...current.examples, input.value].slice(0, 4);
    }
    return;
  }

  accumulator.set(key, {
    ...input,
    count: 1,
    examples: [input.value],
    isBlocked: false,
  });
}

function buildMetadataKey(input: {
  field: ContentMetadataField;
  normalizedValue: string;
}) {
  return `${input.field}:${input.normalizedValue}`;
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  return input as Record<string, unknown>;
}
