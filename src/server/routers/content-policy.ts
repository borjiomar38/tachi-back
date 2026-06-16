import { z } from 'zod';

import {
  discoverContentMetadataValues,
  getContentMetadataPolicy,
  getDefaultExplicitAdultBlockedMetadataValues,
  updateContentMetadataPolicy,
  zBlockedContentMetadataValue,
  zContentMetadataPolicyInput,
} from '@/server/content-policy/metadata-policy';
import { protectedProcedure } from '@/server/orpc';

const tags = ['content-policy'];

const zPolicyResponse = z.object({
  blockedValues: z.array(zBlockedContentMetadataValue),
  defaultValues: z.array(zBlockedContentMetadataValue),
  discoveredValues: z.array(
    zBlockedContentMetadataValue.extend({
      count: z.number().int().positive(),
      examples: z.array(z.string()),
      isBlocked: z.boolean(),
    })
  ),
  mode: z.enum(['default', 'saved']),
  updatedAt: z.date().nullable(),
});

export default {
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
