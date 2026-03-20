import { z } from 'zod';

import { db } from '@/server/db';
import {
  Prisma,
  ProviderType,
  ProviderUsageStage,
} from '@/server/db/generated/client';
import { logger } from '@/server/logger';

const zPersistProviderUsageInput = z.object({
  costMicros: z.bigint().optional(),
  errorCode: z.string().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  jobId: z.string().trim().min(1),
  latencyMs: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  modelName: z.string().trim().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  pageCount: z.number().int().nonnegative().default(1),
  provider: z.nativeEnum(ProviderType),
  requestCount: z.number().int().positive().default(1),
  stage: z.nativeEnum(ProviderUsageStage),
  success: z.boolean().default(true),
});

export async function persistProviderUsageSnapshot(
  rawInput: unknown,
  deps: {
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info'>;
  } = {}
) {
  const input = zPersistProviderUsageInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;

  const record = await dbClient.providerUsage.create({
    data: {
      costMicros: input.costMicros,
      errorCode: input.errorCode,
      inputTokens: input.inputTokens,
      jobId: input.jobId,
      latencyMs: input.latencyMs,
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      modelName: input.modelName,
      outputTokens: input.outputTokens,
      pageCount: input.pageCount,
      provider: input.provider,
      requestCount: input.requestCount,
      stage: input.stage,
      success: input.success,
    },
  });

  (deps.log ?? logger).info({
    jobId: record.jobId,
    provider: record.provider,
    scope: 'provider_gateway',
    stage: record.stage,
  });

  return record;
}
