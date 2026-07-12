import { createHash } from 'node:crypto';
import { z } from 'zod';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';

const manualMangaBlockConfigPrefix = 'content_policy_manual_manga_block:';

export const zContentPolicyMangaIdentity = z
  .object({
    mangaTitle: z.string().trim().min(1).max(500).nullish(),
    mangaUrl: z.string().trim().min(1).max(2048).nullish(),
    sourceId: z.string().trim().min(1).max(200).nullish(),
    sourceName: z.string().trim().min(1).max(255).nullish(),
  })
  .strict()
  .refine((identity) => identity.mangaTitle || identity.mangaUrl, {
    message: 'A manga title or URL is required.',
  });

export type ContentPolicyMangaIdentity = z.infer<
  typeof zContentPolicyMangaIdentity
>;

const zStoredManualMangaBlock = z.object({
  blocked: z.literal(true),
  identity: zContentPolicyMangaIdentity,
});

export interface ManualMangaBlock {
  blocked: boolean;
  identity: ContentPolicyMangaIdentity;
  key: string;
  updatedAt: Date | null;
}

export function normalizeContentPolicyMangaIdentity(
  input: ContentPolicyMangaIdentity
): ContentPolicyMangaIdentity {
  return {
    mangaTitle: normalizeOptionalText(input.mangaTitle),
    mangaUrl: normalizeOptionalUrl(input.mangaUrl),
    sourceId: normalizeOptionalText(input.sourceId),
    sourceName: normalizeOptionalText(input.sourceName),
  };
}

export function buildContentPolicyMangaKey(
  rawIdentity: ContentPolicyMangaIdentity
) {
  const identity = normalizeContentPolicyMangaIdentity(rawIdentity);
  const sourceIdentity = identity.sourceId
    ? { sourceId: identity.sourceId }
    : { sourceName: identity.sourceName };
  const stableIdentity = identity.mangaUrl
    ? {
        mangaUrl: identity.mangaUrl,
        ...sourceIdentity,
      }
    : {
        mangaTitle: identity.mangaTitle?.toLocaleLowerCase() ?? null,
        ...sourceIdentity,
      };

  return createHash('sha256')
    .update(
      JSON.stringify({
        algorithm: '2026-07-12.manga-policy.v1',
        ...stableIdentity,
      })
    )
    .digest('hex');
}

export async function getManualMangaBlock(
  rawIdentity: ContentPolicyMangaIdentity,
  deps?: {
    dbClient?: typeof db;
  }
): Promise<ManualMangaBlock> {
  const dbClient = deps?.dbClient ?? db;
  const identity = zContentPolicyMangaIdentity.parse(rawIdentity);
  const key = buildContentPolicyMangaKey(identity);
  const appConfig = dbClient.appConfig as
    | {
        findUnique: typeof db.appConfig.findUnique;
      }
    | undefined;

  if (!appConfig) {
    return {
      blocked: false,
      identity,
      key,
      updatedAt: null,
    };
  }

  const entry = await appConfig.findUnique({
    select: {
      updatedAt: true,
      value: true,
    },
    where: {
      key: buildConfigKey(key),
    },
  });
  const storedBlock = zStoredManualMangaBlock.safeParse(entry?.value);

  return {
    blocked: storedBlock.success,
    identity: storedBlock.success ? storedBlock.data.identity : identity,
    key,
    updatedAt: storedBlock.success ? (entry?.updatedAt ?? null) : null,
  };
}

export async function updateManualMangaBlock(
  input: {
    blocked: boolean;
    identity: ContentPolicyMangaIdentity;
  },
  deps?: {
    dbClient?: typeof db;
  }
): Promise<ManualMangaBlock> {
  const dbClient = deps?.dbClient ?? db;
  const identity = normalizeContentPolicyMangaIdentity(
    zContentPolicyMangaIdentity.parse(input.identity)
  );
  const key = buildContentPolicyMangaKey(identity);
  const configKey = buildConfigKey(key);

  if (!input.blocked) {
    await dbClient.appConfig.deleteMany({
      where: {
        key: configKey,
      },
    });

    return {
      blocked: false,
      identity,
      key,
      updatedAt: null,
    };
  }

  const value = {
    blocked: true,
    identity,
  } satisfies Prisma.InputJsonObject;
  const entry = await dbClient.appConfig.upsert({
    create: {
      key: configKey,
      value,
    },
    select: {
      updatedAt: true,
    },
    update: {
      value,
    },
    where: {
      key: configKey,
    },
  });

  return {
    blocked: true,
    identity,
    key,
    updatedAt: entry.updatedAt,
  };
}

function buildConfigKey(mangaKey: string) {
  return `${manualMangaBlockConfigPrefix}${mangaKey}`;
}

function normalizeOptionalText(input: string | null | undefined) {
  return input?.trim() || null;
}

function normalizeOptionalUrl(input: string | null | undefined) {
  return input?.trim().replace(/\/+$/, '') || null;
}
