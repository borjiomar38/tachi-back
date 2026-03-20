import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import { ProviderType, ProviderUsageStage } from '@/server/db/generated/client';
import {
  zBackofficeJobDetail,
  zBackofficeJobListInput,
  zBackofficeJobListResponse,
} from '@/server/jobs/backoffice-schema';
import { protectedProcedure } from '@/server/orpc';

const tags = ['jobs'];

export default {
  list: protectedProcedure({
    permissions: {
      job: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/jobs',
      tags,
    })
    .input(zBackofficeJobListInput)
    .output(zBackofficeJobListResponse)
    .handler(async ({ context, input }) => {
      const searchTerm = input.searchTerm.trim();

      const where = {
        OR: searchTerm
          ? [
              {
                id: {
                  contains: searchTerm,
                },
              },
              {
                license: {
                  key: {
                    contains: searchTerm,
                  },
                },
              },
              {
                license: {
                  ownerEmail: {
                    contains: searchTerm,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                device: {
                  installationId: {
                    contains: searchTerm,
                  },
                },
              },
              {
                errorCode: {
                  contains: searchTerm,
                },
              },
            ]
          : undefined,
        status: input.status === 'all' ? undefined : input.status,
      };

      const [items, total] = await Promise.all([
        context.db.translationJob.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            completedAt: true,
            createdAt: true,
            device: {
              select: {
                installationId: true,
              },
            },
            errorCode: true,
            errorMessage: true,
            failedAt: true,
            id: true,
            license: {
              select: {
                key: true,
              },
            },
            pageCount: true,
            providerUsages: {
              select: {
                id: true,
              },
            },
            queuedAt: true,
            requestedOcrProvider: true,
            requestedTranslationProvider: true,
            reservedTokens: true,
            resolvedOcrProvider: true,
            resolvedTranslationProvider: true,
            sourceLanguage: true,
            spentTokens: true,
            startedAt: true,
            status: true,
            targetLanguage: true,
            uploadCompletedAt: true,
            assets: {
              select: {
                id: true,
                objectKey: true,
              },
              where: {
                kind: 'page_upload',
              },
            },
            updatedAt: true,
          },
          take: input.limit,
          where,
        }),
        context.db.translationJob.count({
          where,
        }),
      ]);

      return {
        items: items.map((job) => ({
          completedAt: job.completedAt,
          createdAt: job.createdAt,
          durationMs: getJobDurationMs(
            job.startedAt,
            job.completedAt ?? job.failedAt
          ),
          errorCode: job.errorCode,
          errorMessage: job.errorMessage,
          failedAt: job.failedAt,
          id: job.id,
          installationId: job.device.installationId,
          licenseKey: job.license.key,
          pageCount: job.pageCount,
          providerUsageCount: job.providerUsages.length,
          queuedAt: job.queuedAt,
          requestedOcrProvider: job.requestedOcrProvider,
          requestedTranslationProvider: job.requestedTranslationProvider,
          reservedTokens: job.reservedTokens,
          resolvedOcrProvider: job.resolvedOcrProvider,
          resolvedTranslationProvider: job.resolvedTranslationProvider,
          sourceLanguage: job.sourceLanguage,
          spentTokens: job.spentTokens,
          startedAt: job.startedAt,
          status: job.status,
          targetLanguage: job.targetLanguage,
          uploadedPageCount: job.assets.filter((asset) =>
            Boolean(asset.objectKey)
          ).length,
        })),
        total,
      };
    }),

  getById: protectedProcedure({
    permissions: {
      job: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/jobs/{id}',
      tags,
    })
    .input(z.object({ id: z.string() }))
    .output(zBackofficeJobDetail)
    .handler(async ({ context, input }) => {
      const job = await context.db.translationJob.findUnique({
        where: {
          id: input.id,
        },
        select: {
          assets: {
            orderBy: [
              {
                pageNumber: 'asc',
              },
              {
                createdAt: 'asc',
              },
            ],
            select: {
              bucketName: true,
              createdAt: true,
              id: true,
              kind: true,
              metadata: true,
              mimeType: true,
              objectKey: true,
              originalFileName: true,
              pageNumber: true,
              sizeBytes: true,
            },
          },
          completedAt: true,
          createdAt: true,
          device: {
            select: {
              appBuild: true,
              appVersion: true,
              id: true,
              installationId: true,
              lastSeenAt: true,
              platform: true,
              status: true,
            },
          },
          errorCode: true,
          errorMessage: true,
          failedAt: true,
          id: true,
          ledgerEntries: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              createdAt: true,
              deltaTokens: true,
              description: true,
              id: true,
              status: true,
              type: true,
            },
          },
          license: {
            select: {
              id: true,
              key: true,
              ownerEmail: true,
              status: true,
            },
          },
          pageCount: true,
          providerUsages: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              costMicros: true,
              createdAt: true,
              errorCode: true,
              id: true,
              inputTokens: true,
              latencyMs: true,
              metadata: true,
              modelName: true,
              outputTokens: true,
              pageCount: true,
              provider: true,
              requestCount: true,
              stage: true,
              success: true,
            },
          },
          queuedAt: true,
          requestedOcrProvider: true,
          requestedTranslationProvider: true,
          reservedTokens: true,
          resolvedOcrProvider: true,
          resolvedTranslationProvider: true,
          resultPayloadVersion: true,
          resultSummary: true,
          sourceLanguage: true,
          spentTokens: true,
          startedAt: true,
          status: true,
          targetLanguage: true,
          uploadCompletedAt: true,
          updatedAt: true,
        },
      });

      if (!job) {
        throw new ORPCError('NOT_FOUND');
      }

      const uploadedPageCount = job.assets.filter(
        (asset) => asset.kind === 'page_upload' && Boolean(asset.objectKey)
      ).length;

      return {
        assets: job.assets.map((asset) => ({
          bucketName: asset.bucketName,
          createdAt: asset.createdAt,
          id: asset.id,
          kind: asset.kind,
          metadata: asset.metadata,
          mimeType: asset.mimeType,
          objectKey: asset.objectKey,
          originalFileName: asset.originalFileName,
          pageNumber: asset.pageNumber,
          sizeBytes: asset.sizeBytes,
        })),
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        device: {
          appBuild: job.device.appBuild,
          appVersion: job.device.appVersion,
          id: job.device.id,
          installationId: job.device.installationId,
          lastSeenAt: job.device.lastSeenAt,
          platform: job.device.platform,
          status: job.device.status,
        },
        durationMs: getJobDurationMs(
          job.startedAt,
          job.completedAt ?? job.failedAt
        ),
        errorCode: job.errorCode,
        errorMessage: job.errorMessage,
        failedAt: job.failedAt,
        id: job.id,
        ledgerEntries: job.ledgerEntries,
        license: job.license,
        lifecycleEvents: buildLifecycleEvents(job),
        pageCount: job.pageCount,
        providerUsages: job.providerUsages.map((usage) => ({
          costMicros: usage.costMicros?.toString() ?? null,
          createdAt: usage.createdAt,
          errorCode: usage.errorCode,
          id: usage.id,
          inputTokens: usage.inputTokens,
          latencyMs: usage.latencyMs,
          metadata: usage.metadata,
          modelName: usage.modelName,
          outputTokens: usage.outputTokens,
          pageCount: usage.pageCount,
          provider: usage.provider,
          requestCount: usage.requestCount,
          stage: usage.stage,
          success: usage.success,
        })),
        queuedAt: job.queuedAt,
        requestedOcrProvider: job.requestedOcrProvider,
        requestedTranslationProvider: job.requestedTranslationProvider,
        reservedTokens: job.reservedTokens,
        resolvedOcrProvider: job.resolvedOcrProvider,
        resolvedTranslationProvider: job.resolvedTranslationProvider,
        resultPayloadVersion: job.resultPayloadVersion,
        resultSummary: job.resultSummary,
        sourceLanguage: job.sourceLanguage,
        spentTokens: job.spentTokens,
        startedAt: job.startedAt,
        status: job.status,
        targetLanguage: job.targetLanguage,
        uploadCompletedAt: job.uploadCompletedAt,
        uploadedPageCount,
      };
    }),
};

function buildLifecycleEvents(job: {
  completedAt: Date | null;
  createdAt: Date;
  failedAt: Date | null;
  pageCount: number;
  providerUsages: Array<{
    createdAt: Date;
    errorCode: string | null;
    modelName: string | null;
    pageCount: number;
    provider: ProviderType;
    requestCount: number;
    stage: ProviderUsageStage;
    success: boolean;
  }>;
  queuedAt: Date | null;
  sourceLanguage: string;
  startedAt: Date | null;
  status: string;
  targetLanguage: string;
  updatedAt: Date;
  uploadCompletedAt: Date | null;
}) {
  const events = [
    {
      at: job.createdAt,
      detail: `${job.pageCount} pages · ${job.sourceLanguage} -> ${job.targetLanguage}`,
      level: 'info' as const,
      title: 'Job created',
      type: 'created',
    },
    ...(job.uploadCompletedAt
      ? [
          {
            at: job.uploadCompletedAt,
            detail: 'All expected page uploads reached the backend.',
            level: 'success' as const,
            title: 'Uploads completed',
            type: 'upload_completed',
          },
        ]
      : []),
    ...(job.queuedAt
      ? [
          {
            at: job.queuedAt,
            detail: 'The job is ready for processing.',
            level: 'info' as const,
            title: 'Job queued',
            type: 'queued',
          },
        ]
      : []),
    ...(job.startedAt
      ? [
          {
            at: job.startedAt,
            detail: 'Hosted OCR and translation processing started.',
            level: 'info' as const,
            title: 'Processing started',
            type: 'processing_started',
          },
        ]
      : []),
    ...job.providerUsages.map((usage) => ({
      at: usage.createdAt,
      detail: `${humanizeProvider(usage.provider)} · ${usage.requestCount} request${usage.requestCount === 1 ? '' : 's'} · ${usage.pageCount} page${usage.pageCount === 1 ? '' : 's'}${usage.errorCode ? ` · ${usage.errorCode}` : ''}${usage.modelName ? ` · ${usage.modelName}` : ''}`,
      level: usage.success ? ('success' as const) : ('error' as const),
      title: `${humanizeStage(usage.stage)} ${usage.success ? 'succeeded' : 'failed'}`,
      type: usage.success ? `${usage.stage}_success` : `${usage.stage}_failure`,
    })),
    ...(job.completedAt
      ? [
          {
            at: job.completedAt,
            detail: 'The result manifest is ready for mobile download.',
            level: 'success' as const,
            title: 'Job completed',
            type: 'completed',
          },
        ]
      : []),
    ...(job.failedAt
      ? [
          {
            at: job.failedAt,
            detail: 'The job exited with a terminal failure state.',
            level: 'error' as const,
            title: 'Job failed',
            type: 'failed',
          },
        ]
      : []),
    ...(job.status === 'canceled'
      ? [
          {
            at: job.updatedAt,
            detail: 'The job was canceled before successful completion.',
            level: 'warning' as const,
            title: 'Job canceled',
            type: 'canceled',
          },
        ]
      : []),
    ...(job.status === 'expired'
      ? [
          {
            at: job.updatedAt,
            detail: 'The upload or processing window expired.',
            level: 'warning' as const,
            title: 'Job expired',
            type: 'expired',
          },
        ]
      : []),
  ];

  return events.sort((left, right) => left.at.getTime() - right.at.getTime());
}

function getJobDurationMs(startedAt: Date | null, endedAt: Date | null) {
  if (!startedAt || !endedAt) {
    return null;
  }

  return Math.max(0, endedAt.getTime() - startedAt.getTime());
}

function humanizeProvider(provider: ProviderType) {
  return provider.replaceAll('_', ' ');
}

function humanizeStage(stage: ProviderUsageStage) {
  return stage.replaceAll('_', ' ');
}
