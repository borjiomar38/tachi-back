import { z } from 'zod';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';

const FREE_ACCESS_IP_BLOCKS_CONFIG_KEY = 'free_access_ip_blocks';

export const FREE_ACCESS_PRICING_URL = '/pricing';
export const FREE_ACCESS_BLOCKED_MESSAGE =
  'The free trial is no longer available. To continue, buy a subscription.';
export const FREE_ACCESS_UNAVAILABLE_ERROR_CODE = 'free_access_unavailable';

const zStoredFreeAccessIpBlock = z.object({
  blockedAt: z.string().trim().min(1),
  ipAddress: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(300).nullable().optional(),
  pricingUrl: z.string().trim().min(1).max(300).nullable().optional(),
  reason: z.string().trim().min(1).max(300).nullable().optional(),
  updatedAt: z.string().trim().min(1).nullable().optional(),
});

const zStoredFreeAccessIpBlocks = z.array(zStoredFreeAccessIpBlock);

type FreeAccessIpBlockDbClient = Pick<typeof db, 'appConfig'>;

export type FreeAccessIpBlock = {
  blockedAt: string;
  ipAddress: string;
  message: string;
  pricingUrl: string;
  reason: string | null;
  updatedAt: string | null;
};

export class FreeAccessIpBlockedError extends Error {
  readonly code = FREE_ACCESS_UNAVAILABLE_ERROR_CODE;
  readonly pricingUrl: string;
  readonly statusCode = 402;

  constructor(readonly block: FreeAccessIpBlock) {
    super(block.message);
    this.name = 'FreeAccessIpBlockedError';
    this.pricingUrl = block.pricingUrl;
  }
}

export async function listFreeAccessIpBlocks(deps?: {
  dbClient?: FreeAccessIpBlockDbClient;
}) {
  const dbClient = deps?.dbClient ?? db;
  const entry = await dbClient.appConfig.findUnique({
    where: {
      key: FREE_ACCESS_IP_BLOCKS_CONFIG_KEY,
    },
    select: {
      value: true,
    },
  });

  const parsed = zStoredFreeAccessIpBlocks.safeParse(entry?.value);
  if (!parsed.success) {
    return [];
  }

  return parsed.data
    .map((block) => normalizeStoredBlock(block))
    .filter((block): block is FreeAccessIpBlock => Boolean(block));
}

export async function getFreeAccessIpBlock(
  ipAddress: string | null | undefined,
  deps?: {
    dbClient?: FreeAccessIpBlockDbClient;
  }
) {
  const normalizedIpAddress = normalizeIpAddress(ipAddress);
  if (!normalizedIpAddress) {
    return null;
  }

  const blocks = await listFreeAccessIpBlocks(deps);
  return (
    blocks.find((block) => block.ipAddress === normalizedIpAddress) ?? null
  );
}

export async function upsertFreeAccessIpBlock(
  input: {
    ipAddress: string;
    reason?: string | null;
  },
  deps?: {
    dbClient?: FreeAccessIpBlockDbClient;
    now?: Date;
  }
) {
  const ipAddress = normalizeIpAddress(input.ipAddress);
  if (!ipAddress) {
    throw new Error('invalid_ip_address');
  }

  const dbClient = deps?.dbClient ?? db;
  const now = deps?.now ?? new Date();
  const nowIso = now.toISOString();
  const reason = normalizeOptionalText(input.reason);
  const currentBlocks = await listFreeAccessIpBlocks({ dbClient });
  const existing = currentBlocks.find((block) => block.ipAddress === ipAddress);
  const nextBlock: FreeAccessIpBlock = {
    blockedAt: existing?.blockedAt ?? nowIso,
    ipAddress,
    message: FREE_ACCESS_BLOCKED_MESSAGE,
    pricingUrl: FREE_ACCESS_PRICING_URL,
    reason,
    updatedAt: existing ? nowIso : null,
  };
  const nextBlocks = [
    nextBlock,
    ...currentBlocks.filter((block) => block.ipAddress !== ipAddress),
  ];

  await dbClient.appConfig.upsert({
    where: {
      key: FREE_ACCESS_IP_BLOCKS_CONFIG_KEY,
    },
    create: {
      key: FREE_ACCESS_IP_BLOCKS_CONFIG_KEY,
      value: serializeBlocks(nextBlocks),
    },
    update: {
      value: serializeBlocks(nextBlocks),
    },
  });

  return nextBlock;
}

export async function removeFreeAccessIpBlock(
  input: {
    ipAddress: string;
  },
  deps?: {
    dbClient?: FreeAccessIpBlockDbClient;
  }
) {
  const ipAddress = normalizeIpAddress(input.ipAddress);
  if (!ipAddress) {
    throw new Error('invalid_ip_address');
  }

  const dbClient = deps?.dbClient ?? db;
  const currentBlocks = await listFreeAccessIpBlocks({ dbClient });
  const nextBlocks = currentBlocks.filter(
    (block) => block.ipAddress !== ipAddress
  );

  await dbClient.appConfig.upsert({
    where: {
      key: FREE_ACCESS_IP_BLOCKS_CONFIG_KEY,
    },
    create: {
      key: FREE_ACCESS_IP_BLOCKS_CONFIG_KEY,
      value: serializeBlocks(nextBlocks),
    },
    update: {
      value: serializeBlocks(nextBlocks),
    },
  });

  return {
    ipAddress,
    removed: currentBlocks.length !== nextBlocks.length,
  };
}

export function buildFreeAccessIpBlockedErrorBody(
  input: FreeAccessIpBlock | FreeAccessIpBlockedError
) {
  const block = input instanceof FreeAccessIpBlockedError ? input.block : input;

  return {
    code: FREE_ACCESS_UNAVAILABLE_ERROR_CODE,
    message: FREE_ACCESS_BLOCKED_MESSAGE,
    pricingUrl: block.pricingUrl,
  };
}

export function isFreeAccessIpBlockedError(
  error: unknown
): error is FreeAccessIpBlockedError {
  return error instanceof FreeAccessIpBlockedError;
}

export function buildFreeAccessIpClaimBlock(input: {
  ipAddress: string;
  now?: Date;
  reason?: string | null;
}) {
  const ipAddress = normalizeFreeAccessIpAddress(input.ipAddress);
  if (!ipAddress) {
    throw new Error('invalid_ip_address');
  }

  return {
    blockedAt: (input.now ?? new Date()).toISOString(),
    ipAddress,
    message: FREE_ACCESS_BLOCKED_MESSAGE,
    pricingUrl: FREE_ACCESS_PRICING_URL,
    reason: normalizeOptionalText(input.reason),
    updatedAt: null,
  } satisfies FreeAccessIpBlock;
}

export function normalizeFreeAccessIpAddress(
  ipAddress: string | null | undefined
) {
  return normalizeIpAddress(ipAddress);
}

function normalizeStoredBlock(
  block: z.infer<typeof zStoredFreeAccessIpBlock>
): FreeAccessIpBlock | null {
  const ipAddress = normalizeIpAddress(block.ipAddress);
  if (!ipAddress) {
    return null;
  }

  return {
    blockedAt: block.blockedAt,
    ipAddress,
    message: block.message?.trim() || FREE_ACCESS_BLOCKED_MESSAGE,
    pricingUrl: block.pricingUrl?.trim() || FREE_ACCESS_PRICING_URL,
    reason: normalizeOptionalText(block.reason),
    updatedAt: normalizeOptionalText(block.updatedAt),
  };
}

function serializeBlocks(blocks: FreeAccessIpBlock[]): Prisma.InputJsonArray {
  return blocks.map((block) => ({
    blockedAt: block.blockedAt,
    ipAddress: block.ipAddress,
    message: block.message,
    pricingUrl: block.pricingUrl,
    reason: block.reason,
    updatedAt: block.updatedAt,
  }));
}

function normalizeIpAddress(ipAddress: string | null | undefined) {
  const normalized = ipAddress?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
