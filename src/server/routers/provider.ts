import { ORPCError } from '@orpc/server';
import { z } from 'zod';

import { ProviderType, ProviderUsageStage } from '@/server/db/generated/client';
import {
  zProviderOpsInput,
  zProviderOpsSummary,
  zProviderRoutingConfigInput,
  zProviderRoutingConfigResponse,
} from '@/server/jobs/backoffice-schema';
import { protectedProcedure } from '@/server/orpc';
import { getProviderGatewayManifestWithRuntimeConfig } from '@/server/provider-gateway/manifest';
import {
  getProviderGatewayRuntimeConfig,
  getProviderGatewayRuntimeState,
  getProviderGatewayRuntimeStateWithDynamicModels,
  updateProviderGatewayRuntimeConfig,
} from '@/server/provider-gateway/runtime-config';
import { zProviderGatewayManifest } from '@/server/provider-gateway/schema';

const tags = ['providers'];

export default {
  manifest: protectedProcedure({
    permissions: {
      provider: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/providers/manifest',
      tags,
    })
    .input(z.void())
    .output(zProviderGatewayManifest)
    .handler(async ({ context }) => {
      return await getProviderGatewayManifestWithRuntimeConfig({
        dbClient: context.db,
      });
    }),

  routingConfig: protectedProcedure({
    permissions: {
      provider: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/providers/routing-config',
      tags,
    })
    .input(z.void())
    .output(zProviderRoutingConfigResponse)
    .handler(async ({ context }) => {
      const config = await getProviderGatewayRuntimeConfig({
        dbClient: context.db,
      });
      const runtimeState =
        await getProviderGatewayRuntimeStateWithDynamicModels({
          config: config.current,
        });

      return zProviderRoutingConfigResponse.parse({
        ...config,
        ...runtimeState,
      });
    }),

  updateRoutingConfig: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/providers/routing-config',
      tags,
    })
    .input(zProviderRoutingConfigInput)
    .output(zProviderRoutingConfigResponse)
    .handler(async ({ context, input }) => {
      const nextState = getProviderGatewayRuntimeState({
        config: input,
      });
      const selectedProvider = nextState.translationProviders.find(
        (provider) => provider.provider === input.translationProviderPrimary
      );

      if (!nextState.ocr.enabled) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'GOOGLE_CLOUD_VISION_API_KEY is not configured.',
        });
      }

      if (!selectedProvider?.enabled) {
        throw new ORPCError('BAD_REQUEST', {
          message:
            selectedProvider?.reason ??
            'The selected translation provider is not configured.',
        });
      }

      const config = await updateProviderGatewayRuntimeConfig(input, {
        dbClient: context.db,
      });
      const runtimeState =
        await getProviderGatewayRuntimeStateWithDynamicModels({
          config: config.current,
        });

      context.logger.info({
        provider: config.current.translationProviderPrimary,
        scope: 'provider',
        type: 'mutation',
      });

      return zProviderRoutingConfigResponse.parse({
        ...config,
        ...runtimeState,
      });
    }),

  opsSummary: protectedProcedure({
    permissions: {
      provider: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/providers/ops-summary',
      tags,
    })
    .input(zProviderOpsInput)
    .output(zProviderOpsSummary)
    .handler(async ({ context, input }) => {
      const generatedAt = new Date();
      const windowStart = new Date(
        generatedAt.getTime() - input.windowHours * 60 * 60 * 1000
      );
      const manifest = await getProviderGatewayManifestWithRuntimeConfig({
        dbClient: context.db,
      });

      const [recentUsages, recentFailures, jobStatusCounts] = await Promise.all(
        [
          context.db.providerUsage.findMany({
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              costMicros: true,
              createdAt: true,
              errorCode: true,
              inputTokens: true,
              latencyMs: true,
              modelName: true,
              outputTokens: true,
              pageCount: true,
              provider: true,
              requestCount: true,
              stage: true,
              success: true,
            },
            where: {
              createdAt: {
                gte: windowStart,
              },
            },
          }),
          context.db.providerUsage.findMany({
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              createdAt: true,
              errorCode: true,
              job: {
                select: {
                  device: {
                    select: {
                      installationId: true,
                    },
                  },
                  id: true,
                  license: {
                    select: {
                      key: true,
                    },
                  },
                  status: true,
                },
              },
              modelName: true,
              provider: true,
              stage: true,
            },
            take: 10,
            where: {
              createdAt: {
                gte: windowStart,
              },
              success: false,
            },
          }),
          context.db.translationJob.groupBy({
            _count: {
              _all: true,
            },
            by: ['status'],
            where: {
              createdAt: {
                gte: windowStart,
              },
            },
          }),
        ]
      );

      const manifestByProvider = new Map(
        [...manifest.ocr.providers, ...manifest.translation.providers].map(
          (item) => [item.provider, item]
        )
      );

      const aggregates = new Map<
        ProviderType,
        {
          avgLatencySource: { count: number; totalMs: number };
          enabled: boolean;
          failureCount: number;
          isDefault: boolean;
          lastUsedAt: Date | null;
          launchStage: 'compatibility' | 'primary';
          modelName: string | null;
          stageMap: Map<
            ProviderUsageStage,
            {
              avgLatencySource: { count: number; totalMs: number };
              errorCounts: Map<string, number>;
              failureCount: number;
              lastUsedAt: Date | null;
              successCount: number;
              totalCostMicros: bigint;
              totalPageCount: number;
              totalRequestCount: number;
              totalUsageCount: number;
            }
          >;
          supportedByGateway: boolean;
          totalCostMicros: bigint;
          totalFailureCount: number;
          totalPageCount: number;
          totalRequestCount: number;
          totalUsageCount: number;
        }
      >();

      for (const usage of recentUsages) {
        const manifestItem = manifestByProvider.get(usage.provider);
        const providerAggregate = aggregates.get(usage.provider) ?? {
          avgLatencySource: { count: 0, totalMs: 0 },
          enabled: manifestItem?.enabled ?? false,
          failureCount: 0,
          isDefault: manifestItem?.isDefault ?? false,
          lastUsedAt: null,
          launchStage: manifestItem?.launchStage ?? 'compatibility',
          modelName: manifestItem?.modelName ?? usage.modelName ?? null,
          stageMap: new Map(),
          supportedByGateway: manifestItem?.supportedByGateway ?? false,
          totalCostMicros: 0n,
          totalFailureCount: 0,
          totalPageCount: 0,
          totalRequestCount: 0,
          totalUsageCount: 0,
        };

        providerAggregate.totalUsageCount += 1;
        providerAggregate.totalRequestCount += usage.requestCount;
        providerAggregate.totalPageCount += usage.pageCount;
        providerAggregate.totalCostMicros += usage.costMicros ?? 0n;
        providerAggregate.lastUsedAt =
          !providerAggregate.lastUsedAt ||
          providerAggregate.lastUsedAt < usage.createdAt
            ? usage.createdAt
            : providerAggregate.lastUsedAt;

        if (usage.latencyMs !== null) {
          providerAggregate.avgLatencySource.count += 1;
          providerAggregate.avgLatencySource.totalMs += usage.latencyMs;
        }

        if (!usage.success) {
          providerAggregate.totalFailureCount += 1;
        }

        const stageAggregate = providerAggregate.stageMap.get(usage.stage) ?? {
          avgLatencySource: { count: 0, totalMs: 0 },
          errorCounts: new Map<string, number>(),
          failureCount: 0,
          lastUsedAt: null,
          successCount: 0,
          totalCostMicros: 0n,
          totalPageCount: 0,
          totalRequestCount: 0,
          totalUsageCount: 0,
        };

        stageAggregate.totalUsageCount += 1;
        stageAggregate.totalRequestCount += usage.requestCount;
        stageAggregate.totalPageCount += usage.pageCount;
        stageAggregate.totalCostMicros += usage.costMicros ?? 0n;
        stageAggregate.lastUsedAt =
          !stageAggregate.lastUsedAt ||
          stageAggregate.lastUsedAt < usage.createdAt
            ? usage.createdAt
            : stageAggregate.lastUsedAt;

        if (usage.latencyMs !== null) {
          stageAggregate.avgLatencySource.count += 1;
          stageAggregate.avgLatencySource.totalMs += usage.latencyMs;
        }

        if (usage.success) {
          stageAggregate.successCount += 1;
        } else {
          stageAggregate.failureCount += 1;
          if (usage.errorCode) {
            stageAggregate.errorCounts.set(
              usage.errorCode,
              (stageAggregate.errorCounts.get(usage.errorCode) ?? 0) + 1
            );
          }
        }

        providerAggregate.stageMap.set(usage.stage, stageAggregate);
        aggregates.set(usage.provider, providerAggregate);
      }

      for (const manifestItem of [
        ...manifest.ocr.providers,
        ...manifest.translation.providers,
      ]) {
        if (!aggregates.has(manifestItem.provider)) {
          aggregates.set(manifestItem.provider, {
            avgLatencySource: { count: 0, totalMs: 0 },
            enabled: manifestItem.enabled,
            failureCount: 0,
            isDefault: manifestItem.isDefault,
            lastUsedAt: null,
            launchStage: manifestItem.launchStage,
            modelName: manifestItem.modelName ?? null,
            stageMap: new Map(),
            supportedByGateway: manifestItem.supportedByGateway,
            totalCostMicros: 0n,
            totalFailureCount: 0,
            totalPageCount: 0,
            totalRequestCount: 0,
            totalUsageCount: 0,
          });
        }
      }

      return {
        generatedAt,
        jobStatusCounts: jobStatusCounts.map((item) => ({
          count: item._count._all,
          status: item.status,
        })),
        manifest,
        providers: Array.from(aggregates.entries())
          .map(([provider, aggregate]) => {
            const totalSuccessCount = Math.max(
              0,
              aggregate.totalUsageCount - aggregate.totalFailureCount
            );

            return {
              enabled: aggregate.enabled,
              health: getHealthStatus({
                enabled: aggregate.enabled,
                failureCount: aggregate.totalFailureCount,
                successCount: totalSuccessCount,
              }),
              isDefault: aggregate.isDefault,
              lastUsedAt: aggregate.lastUsedAt,
              launchStage: aggregate.launchStage,
              modelName: aggregate.modelName,
              provider,
              stages: Array.from(aggregate.stageMap.entries())
                .map(([stage, stageAggregate]) => ({
                  avgLatencyMs:
                    stageAggregate.avgLatencySource.count > 0
                      ? Math.round(
                          stageAggregate.avgLatencySource.totalMs /
                            stageAggregate.avgLatencySource.count
                        )
                      : null,
                  failureCount: stageAggregate.failureCount,
                  health: getHealthStatus({
                    enabled: aggregate.enabled,
                    failureCount: stageAggregate.failureCount,
                    successCount: stageAggregate.successCount,
                  }),
                  lastUsedAt: stageAggregate.lastUsedAt,
                  stage,
                  successCount: stageAggregate.successCount,
                  successRatePercent: getSuccessRatePercent({
                    failureCount: stageAggregate.failureCount,
                    successCount: stageAggregate.successCount,
                  }),
                  topErrorCodes: Array.from(
                    stageAggregate.errorCounts.entries()
                  )
                    .sort((left, right) => right[1] - left[1])
                    .slice(0, 3)
                    .map(([errorCode, count]) => ({
                      count,
                      errorCode,
                    })),
                  totalCostMicros: stageAggregate.totalCostMicros.toString(),
                  totalPageCount: stageAggregate.totalPageCount,
                  totalRequestCount: stageAggregate.totalRequestCount,
                  totalUsageCount: stageAggregate.totalUsageCount,
                }))
                .sort((left, right) => left.stage.localeCompare(right.stage)),
              successRatePercent: getSuccessRatePercent({
                failureCount: aggregate.totalFailureCount,
                successCount: totalSuccessCount,
              }),
              supportedByGateway: aggregate.supportedByGateway,
              totalCostMicros: aggregate.totalCostMicros.toString(),
              totalFailureCount: aggregate.totalFailureCount,
              totalPageCount: aggregate.totalPageCount,
              totalRequestCount: aggregate.totalRequestCount,
              totalUsageCount: aggregate.totalUsageCount,
            };
          })
          .sort((left, right) => left.provider.localeCompare(right.provider)),
        recentFailures: recentFailures.map((failure) => ({
          createdAt: failure.createdAt,
          errorCode: failure.errorCode,
          installationId: failure.job.device.installationId,
          jobId: failure.job.id,
          jobStatus: failure.job.status,
          licenseKey: failure.job.license.key,
          modelName: failure.modelName,
          provider: failure.provider,
          stage: failure.stage,
        })),
        windowHours: input.windowHours,
      };
    }),
};

function getSuccessRatePercent(input: {
  failureCount: number;
  successCount: number;
}) {
  const total = input.failureCount + input.successCount;

  if (total === 0) {
    return 100;
  }

  return Math.round((input.successCount / total) * 100);
}

function getHealthStatus(input: {
  enabled: boolean;
  failureCount: number;
  successCount: number;
}) {
  if (!input.enabled) {
    return 'inactive' as const;
  }

  if (input.failureCount === 0) {
    return 'healthy' as const;
  }

  if (input.successCount === 0) {
    return 'down' as const;
  }

  return 'degraded' as const;
}
