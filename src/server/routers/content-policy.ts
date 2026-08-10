import { ORPCError } from '@orpc/server';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';

import { envServer } from '@/env/server';
import {
  backfillMangaPornographyAssessments,
  getSafeMangaPornographyLogError,
  type MangaPornographyPolicyLogger,
  processMangaPornographyAssessment,
  resolveMangaPornographyEffectiveStatus,
  retryMangaPornographyAssessment,
  updateMangaPornographyManualDecision,
} from '@/server/content-policy/manga-pornography-policy';
import {
  getMangaPornographyAutomationSettings,
  updateMangaPornographyAutomationSettings,
} from '@/server/content-policy/manga-pornography-settings';
import {
  getManualMangaBlock,
  updateManualMangaBlock,
  zContentPolicyMangaIdentity,
} from '@/server/content-policy/manual-manga-policy';
import {
  discoverContentMetadataValues,
  discoverContentMetadataValuesFromRecords,
  getContentMetadataPolicy,
  getDefaultExplicitAdultBlockedMetadataValues,
  updateContentMetadataPolicy,
  updateContentMetadataValueBlock,
  zBlockedContentMetadataValue,
  zContentMetadataPolicyInput,
} from '@/server/content-policy/metadata-policy';
import { type Prisma } from '@/server/db/generated/client';
import { zTranslationChapterIdentity } from '@/server/jobs/schema';
import { protectedProcedure } from '@/server/orpc';

const tags = ['content-policy'];

const zDiscoveredMetadataValue = zBlockedContentMetadataValue.extend({
  count: z.number().int().positive(),
  examples: z.array(z.string()),
  isBlocked: z.boolean(),
});

const zPolicyResponse = z.object({
  blockedValues: z.array(zBlockedContentMetadataValue),
  defaultValues: z.array(zBlockedContentMetadataValue),
  discoveredValues: z.array(zDiscoveredMetadataValue),
  mode: z.enum(['default', 'saved']),
  updatedAt: z.date().nullable(),
});

const zContextPolicyResponse = z.object({
  discoveredValues: z.array(zDiscoveredMetadataValue),
  manualMangaBlock: z
    .object({
      blocked: z.boolean(),
      identity: zContentPolicyMangaIdentity,
      key: z.string(),
      updatedAt: z.date().nullable(),
    })
    .nullable(),
});

const zPornographyAssessmentStatus = z.enum([
  'pending',
  'processing',
  'completed',
  'retryable_error',
  'permanent_error',
]);
const zPornographyAssessmentVerdict = z.enum([
  'no_explicit_signal',
  'review',
  'block',
]);
const zPornographyManualDecision = z.enum(['allow', 'block']);
const zPornographyEffectiveStatus = z.enum([
  'pending',
  'blocked',
  'review',
  'errors',
  'allowed',
]);
const zPornographyStatusFilter = z.enum([
  'all',
  ...zPornographyEffectiveStatus.options,
]);
const zPornographyAssessmentItem = z.object({
  attemptCount: z.number().int().nonnegative(),
  classifiedAt: z.date().nullable(),
  effectiveStatus: zPornographyEffectiveStatus,
  extensionName: z.string().nullable(),
  extensionPackageName: z.string().nullable(),
  id: z.string(),
  imageInputIncluded: z.boolean(),
  lastErrorCode: z.string().nullable(),
  lastSeenAt: z.date(),
  mangaUrl: z.string().nullable(),
  manualDecision: zPornographyManualDecision.nullable(),
  model: z.string(),
  policyVersion: z.string(),
  sexualScore: z.number().min(0).max(1).nullable(),
  sourceId: z.string().nullable(),
  sourceName: z.string().nullable(),
  status: zPornographyAssessmentStatus,
  thumbnailUrl: z.string().nullable(),
  title: z.string(),
  updatedAt: z.date(),
  verdict: zPornographyAssessmentVerdict.nullable(),
});
const zPornographyAssessmentCounts = z.object({
  allowed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  review: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
const zPornographyAutomationSettings = z.object({
  defaultEnabled: z.boolean(),
  enabled: z.boolean(),
  updatedAt: z.date().nullable(),
});

export default {
  backfillPornographyAssessments: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/content-policy/pornography-assessments/backfill',
      tags,
    })
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .output(
      z.object({
        queued: z.number().int().nonnegative(),
        registered: z.number().int().nonnegative(),
        scanned: z.number().int().nonnegative(),
      })
    )
    .handler(async ({ context, input }) => {
      const result = await backfillMangaPornographyAssessments(
        { limit: input.limit },
        { dbClient: context.db, log: context.logger }
      );

      schedulePornographyAssessments(
        result.scheduledAssessmentIds,
        context.logger
      );
      context.logger.info({
        queued: result.scheduledAssessmentIds.length,
        registered: result.registered,
        scanned: result.scanned,
        scope: 'content-policy',
        type: 'pornography_assessment_backfill',
      });

      return {
        queued: result.scheduledAssessmentIds.length,
        registered: result.registered,
        scanned: result.scanned,
      };
    }),

  chapterOverview: protectedProcedure({
    permissions: {
      job: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/content-policy/chapters/{chapterCacheKey}',
      tags,
    })
    .input(z.object({ chapterCacheKey: z.string().trim().min(1) }))
    .output(zContextPolicyResponse)
    .handler(async ({ context, input }) => {
      const [cacheRows, jobRows, policy] = await Promise.all([
        context.db.translationResultCache.findMany({
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            chapterIdentity: true,
          },
          where: {
            chapterCacheKey: input.chapterCacheKey,
          },
        }),
        context.db.translationJob.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            chapterIdentity: true,
          },
          where: {
            chapterCacheKey: input.chapterCacheKey,
          },
        }),
        getContentMetadataPolicy({ dbClient: context.db }),
      ]);
      const records = [
        ...cacheRows.map((row) => row.chapterIdentity),
        ...jobRows.map((row) => row.chapterIdentity),
      ];
      const mangaIdentity = records
        .map(getMangaIdentity)
        .find((identity) => identity !== null);
      const manualMangaBlock = mangaIdentity
        ? await getManualMangaBlock(mangaIdentity, {
            dbClient: context.db,
          })
        : null;

      return {
        discoveredValues: discoverContentMetadataValuesFromRecords(
          records,
          policy
        ),
        manualMangaBlock,
      };
    }),

  licenseOverview: protectedProcedure({
    permissions: {
      license: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/content-policy/licenses/{key}',
      tags,
    })
    .input(z.object({ key: z.string().trim().min(1) }))
    .output(zContextPolicyResponse)
    .handler(async ({ context, input }) => {
      const [jobRows, policy] = await Promise.all([
        context.db.translationJob.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            chapterIdentity: true,
          },
          take: 5000,
          where: {
            license: {
              key: input.key,
            },
          },
        }),
        getContentMetadataPolicy({ dbClient: context.db }),
      ]);

      return {
        discoveredValues: discoverContentMetadataValuesFromRecords(
          jobRows.map((row) => row.chapterIdentity),
          policy
        ),
        manualMangaBlock: null,
      };
    }),

  metadataTranslationGate: protectedProcedure({
    permissions: {
      provider: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/content-policy/metadata-translation-gate',
      tags,
    })
    .output(zPolicyResponse)
    .handler(async ({ context }) => {
      const policy = await getContentMetadataPolicy({
        dbClient: context.db,
      });
      const discoveredValues = await discoverContentMetadataValues({
        dbClient: context.db,
        policy,
      });

      return {
        ...policy,
        defaultValues: getDefaultExplicitAdultBlockedMetadataValues(),
        discoveredValues,
      };
    }),

  pornographyAutomationSettings: protectedProcedure({
    permissions: {
      provider: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/content-policy/pornography-automation-settings',
      tags,
    })
    .output(zPornographyAutomationSettings)
    .handler(async ({ context }) => {
      return await getMangaPornographyAutomationSettings({
        dbClient: context.db,
      });
    }),

  pornographyAssessments: protectedProcedure({
    permissions: {
      provider: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/content-policy/pornography-assessments',
      tags,
    })
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        search: z.string().trim().max(200).optional(),
        status: zPornographyStatusFilter.default('all'),
      })
    )
    .output(
      z.object({
        counts: zPornographyAssessmentCounts,
        items: z.array(zPornographyAssessmentItem),
      })
    )
    .handler(async ({ context, input }) => {
      const listWhere = buildPornographyAssessmentWhere(
        input.status,
        input.search
      );
      const [rows, total, pending, blocked, review, errors, allowed] =
        await Promise.all([
          context.db.mangaPornographyAssessment.findMany({
            orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
            select: {
              attemptCount: true,
              classifiedAt: true,
              extensionName: true,
              extensionPackageName: true,
              id: true,
              imageInputIncluded: true,
              lastErrorCode: true,
              lastSeenAt: true,
              mangaUrl: true,
              manualDecision: true,
              model: true,
              policyVersion: true,
              sexualScore: true,
              sourceId: true,
              sourceName: true,
              status: true,
              thumbnailUrl: true,
              title: true,
              updatedAt: true,
              verdict: true,
            },
            take: input.limit,
            where: listWhere,
          }),
          context.db.mangaPornographyAssessment.count(),
          context.db.mangaPornographyAssessment.count({
            where: buildPornographyAssessmentStatusWhere('pending'),
          }),
          context.db.mangaPornographyAssessment.count({
            where: buildPornographyAssessmentStatusWhere('blocked'),
          }),
          context.db.mangaPornographyAssessment.count({
            where: buildPornographyAssessmentStatusWhere('review'),
          }),
          context.db.mangaPornographyAssessment.count({
            where: buildPornographyAssessmentStatusWhere('errors'),
          }),
          context.db.mangaPornographyAssessment.count({
            where: buildPornographyAssessmentStatusWhere('allowed'),
          }),
        ]);

      return {
        counts: { allowed, blocked, errors, pending, review, total },
        items: rows.map((row) => ({
          ...row,
          effectiveStatus: resolveMangaPornographyEffectiveStatus(row),
        })),
      };
    }),

  retryPornographyAssessment: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/content-policy/pornography-assessments/{assessmentId}/retry',
      tags,
    })
    .input(z.object({ assessmentId: z.string().trim().min(1) }))
    .output(
      z.object({
        assessmentId: z.string(),
        queued: z.boolean(),
      })
    )
    .handler(async ({ context, input }) => {
      const result = await retryMangaPornographyAssessment(input, {
        dbClient: context.db,
        log: context.logger,
      });
      if (result.assessment && result.shouldSchedule) {
        schedulePornographyAssessments([result.assessment.id], context.logger);
      }

      context.logger.info({
        assessmentId: input.assessmentId,
        queued: Boolean(result.assessment && result.shouldSchedule),
        scope: 'content-policy',
        type: 'pornography_assessment_retry',
      });

      return {
        assessmentId: input.assessmentId,
        queued: Boolean(result.assessment && result.shouldSchedule),
      };
    }),

  setPornographyManualDecision: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/content-policy/pornography-assessments/{assessmentId}/decision',
      tags,
    })
    .input(
      z.object({
        assessmentId: z.string().trim().min(1),
        decision: zPornographyManualDecision.nullable(),
        reason: z.string().trim().max(500).optional(),
      })
    )
    .output(
      z.object({
        assessmentId: z.string(),
        decision: zPornographyManualDecision.nullable(),
      })
    )
    .handler(async ({ context, input }) => {
      await updateMangaPornographyManualDecision(
        {
          assessmentId: input.assessmentId,
          decision: input.decision,
          reason: input.reason,
          reviewerId: context.user.id,
        },
        { dbClient: context.db }
      );

      context.logger.info({
        assessmentId: input.assessmentId,
        decision: input.decision,
        reviewerId: context.user.id,
        scope: 'content-policy',
        type: 'pornography_assessment_manual_decision',
      });

      return {
        assessmentId: input.assessmentId,
        decision: input.decision,
      };
    }),

  updatePornographyAutomationSettings: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/content-policy/pornography-automation-settings',
      tags,
    })
    .input(z.object({ enabled: z.boolean() }))
    .output(zPornographyAutomationSettings)
    .handler(async ({ context, input }) => {
      if (input.enabled && !envServer.OPENAI_API_KEY?.trim()) {
        throw new ORPCError('BAD_REQUEST', {
          message:
            'OPENAI_API_KEY must be configured before enabling pornography automation.',
        });
      }

      const settings = await updateMangaPornographyAutomationSettings(
        {
          enabled: input.enabled,
          updatedBy: context.user.id,
        },
        { dbClient: context.db }
      );

      if (settings.enabled) {
        try {
          const resumed = await backfillMangaPornographyAssessments(
            { limit: 50 },
            { dbClient: context.db, log: context.logger }
          );
          schedulePornographyAssessments(
            resumed.scheduledAssessmentIds,
            context.logger
          );
        } catch (error) {
          // The setting itself is already durable. A later visit, policy check,
          // or manual backfill will safely resume the pending assessments.
          context.logger.error({
            ...getSafeMangaPornographyLogError(error),
            message:
              'Could not resume pornography assessments after enabling automation',
            scope: 'content-policy',
            type: 'pornography_automation_resume_failure',
          });
        }
      }

      context.logger.info({
        enabled: settings.enabled,
        reviewerId: context.user.id,
        scope: 'content-policy',
        type: 'pornography_automation_settings_update',
      });

      return settings;
    }),

  updateManualMangaBlock: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/content-policy/manual-manga-block',
      tags,
    })
    .input(
      z
        .object({
          blocked: z.boolean(),
          identity: zContentPolicyMangaIdentity,
        })
        .strict()
    )
    .output(zContextPolicyResponse.shape.manualMangaBlock.unwrap())
    .handler(async ({ context, input }) => {
      const manualMangaBlock = await updateManualMangaBlock(input, {
        dbClient: context.db,
      });

      context.logger.info({
        blocked: manualMangaBlock.blocked,
        mangaKey: manualMangaBlock.key,
        scope: 'content-policy',
        type: 'manual_manga_block_mutation',
      });

      return manualMangaBlock;
    }),

  updateMetadataValueBlock: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/content-policy/metadata-value-block',
      tags,
    })
    .input(
      z
        .object({
          blocked: z.boolean(),
          value: zBlockedContentMetadataValue,
        })
        .strict()
    )
    .output(zPolicyResponse)
    .handler(async ({ context, input }) => {
      const savedPolicy = await updateContentMetadataValueBlock(input, {
        dbClient: context.db,
      });
      const discoveredValues = await discoverContentMetadataValues({
        dbClient: context.db,
        policy: savedPolicy,
      });

      context.logger.info({
        blocked: input.blocked,
        field: input.value.field,
        normalizedValue: input.value.normalizedValue,
        scope: 'content-policy',
        type: 'metadata_value_block_mutation',
      });

      return {
        ...savedPolicy,
        defaultValues: getDefaultExplicitAdultBlockedMetadataValues(),
        discoveredValues,
      };
    }),

  updateMetadataTranslationGate: protectedProcedure({
    permissions: {
      provider: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/content-policy/metadata-translation-gate',
      tags,
    })
    .input(zContentMetadataPolicyInput)
    .output(zPolicyResponse)
    .handler(async ({ context, input }) => {
      const policy = await getContentMetadataPolicy({
        dbClient: context.db,
      });
      const savedPolicy = await updateContentMetadataPolicy(input, {
        dbClient: context.db,
      });
      const discoveredValues = await discoverContentMetadataValues({
        dbClient: context.db,
        policy: savedPolicy,
      });

      context.logger.info({
        blockedMetadataValueCount: savedPolicy.blockedValues.length,
        previousMode: policy.mode,
        scope: 'content-policy',
        type: 'mutation',
      });

      return {
        ...savedPolicy,
        defaultValues: getDefaultExplicitAdultBlockedMetadataValues(),
        discoveredValues,
      };
    }),
};

function getMangaIdentity(input: unknown) {
  const identity = zTranslationChapterIdentity.safeParse(input);

  if (
    !identity.success ||
    (!identity.data.mangaTitle && !identity.data.mangaUrl)
  ) {
    return null;
  }

  return {
    mangaTitle: identity.data.mangaTitle ?? null,
    mangaUrl: identity.data.mangaUrl ?? null,
    sourceId: identity.data.sourceId ?? null,
    sourceName: identity.data.sourceName ?? null,
  };
}

function buildPornographyAssessmentWhere(
  status: z.infer<typeof zPornographyStatusFilter>,
  search?: string
): Prisma.MangaPornographyAssessmentWhereInput {
  const filters: Prisma.MangaPornographyAssessmentWhereInput[] = [];

  if (status !== 'all') {
    filters.push(buildPornographyAssessmentStatusWhere(status));
  }

  const normalizedSearch = search?.trim();
  if (normalizedSearch) {
    filters.push({
      OR: [
        { title: { contains: normalizedSearch, mode: 'insensitive' } },
        { sourceName: { contains: normalizedSearch, mode: 'insensitive' } },
        {
          extensionName: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          extensionPackageName: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  return filters.length ? { AND: filters } : {};
}

function buildPornographyAssessmentStatusWhere(
  status: z.infer<typeof zPornographyEffectiveStatus>
): Prisma.MangaPornographyAssessmentWhereInput {
  switch (status) {
    case 'blocked':
      return {
        OR: [
          { manualDecision: 'block' },
          {
            manualDecision: null,
            status: 'completed',
            verdict: 'block',
          },
        ],
      };
    case 'review':
      return {
        manualDecision: null,
        status: 'completed',
        verdict: 'review',
      };
    case 'errors':
      return {
        manualDecision: null,
        OR: [
          { status: { in: ['retryable_error', 'permanent_error'] } },
          { status: 'completed', verdict: null },
        ],
      };
    case 'allowed':
      return {
        OR: [
          { manualDecision: 'allow' },
          {
            manualDecision: null,
            status: 'completed',
            verdict: 'no_explicit_signal',
          },
        ],
      };
    case 'pending':
    default:
      return {
        manualDecision: null,
        status: { in: ['pending', 'processing'] },
      };
  }
}

function schedulePornographyAssessments(
  assessmentIds: string[],
  procedureLogger: MangaPornographyPolicyLogger
) {
  const queue = [...new Set(assessmentIds)];
  if (!queue.length) {
    return;
  }

  const processNext = async () => {
    while (queue.length) {
      const assessmentId = queue.shift();
      if (!assessmentId) {
        return;
      }

      try {
        await processMangaPornographyAssessment(
          {
            assessmentId,
          },
          { log: procedureLogger }
        );
      } catch (error) {
        procedureLogger.error({
          ...getSafeMangaPornographyLogError(error),
          assessmentId,
          message: 'Automatic pornography moderation background task failed',
          scope: 'content-policy',
          type: 'pornography_moderation_processing_failure',
        });
      }
    }
  };

  const concurrency = Math.min(3, queue.length);
  waitUntil(
    Promise.all(
      Array.from({ length: concurrency }, async () => await processNext())
    ).then(() => undefined)
  );
}
