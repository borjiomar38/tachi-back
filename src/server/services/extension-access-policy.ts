import { z } from 'zod';

import { db } from '@/server/db';

export const zExtensionAccessIdentity = z.object({
  extensionName: z.string().trim().min(1).max(200).optional(),
  packageName: z.string().trim().min(1).max(300),
});

export const zSetExtensionBlockInput = zExtensionAccessIdentity.extend({
  blocked: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export type ExtensionAccessDecision = {
  allowed: boolean;
  blockedAt: Date | null;
  packageName: string;
  reason: string | null;
};

export const resolveExtensionAccess = async (
  rawIdentity: unknown,
  dependencies: { dbClient?: typeof db } = {}
): Promise<ExtensionAccessDecision> => {
  const identity = zExtensionAccessIdentity.parse(rawIdentity);
  const dbClient = dependencies.dbClient ?? db;
  const block = await dbClient.extensionBlock.findUnique({
    where: {
      packageName: identity.packageName,
    },
    select: {
      blockedAt: true,
      packageName: true,
      reason: true,
    },
  });

  return {
    allowed: !block,
    blockedAt: block?.blockedAt ?? null,
    packageName: identity.packageName,
    reason: block?.reason ?? null,
  };
};

export const setExtensionBlocked = async (
  rawInput: unknown,
  dependencies: { dbClient?: typeof db; now?: Date } = {}
) => {
  const input = zSetExtensionBlockInput.parse(rawInput);
  const dbClient = dependencies.dbClient ?? db;
  const now = dependencies.now ?? new Date();

  if (!input.blocked) {
    const removed = await dbClient.extensionBlock.deleteMany({
      where: {
        packageName: input.packageName,
      },
    });

    return {
      blocked: false as const,
      packageName: input.packageName,
      removed: removed.count > 0,
    };
  }

  const block = await dbClient.extensionBlock.upsert({
    where: {
      packageName: input.packageName,
    },
    create: {
      blockedAt: now,
      extensionName: input.extensionName,
      packageName: input.packageName,
      reason: input.reason,
    },
    update: {
      blockedAt: now,
      extensionName: input.extensionName,
      reason: input.reason,
    },
    select: {
      blockedAt: true,
      extensionName: true,
      packageName: true,
      reason: true,
    },
  });

  return {
    ...block,
    blocked: true as const,
    removed: false,
  };
};

export const listBlockedExtensions = async (
  dependencies: { dbClient?: typeof db } = {}
) => {
  const dbClient = dependencies.dbClient ?? db;

  return await dbClient.extensionBlock.findMany({
    orderBy: {
      blockedAt: 'desc',
    },
    select: {
      blockedAt: true,
      extensionName: true,
      packageName: true,
      reason: true,
    },
  });
};
