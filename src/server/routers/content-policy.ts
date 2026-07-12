import { z } from 'zod';

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

export default {
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
