import { ORPCError } from '@orpc/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import { buildMetadataValueKey } from '@/features/content-policy/manager/use-content-policy-selection-store';
import type { Outputs } from '@/server/router';

type MetadataValue =
  Outputs['contentPolicy']['chapterOverview']['discoveredValues'][number];
type MangaIdentity = NonNullable<
  Outputs['contentPolicy']['chapterOverview']['manualMangaBlock']
>['identity'];

export const useContentPolicyActions = () => {
  const { t } = useTranslation(['contentPolicy']);
  const queryClient = useQueryClient();
  const invalidatePolicyQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.contentPolicy.metadataTranslationGate.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.contentPolicy.licenseOverview.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.contentPolicy.chapterOverview.key(),
      }),
    ]);
  };
  const metadataMutation = useMutation({
    mutationFn: async (input: { blocked: boolean; value: MetadataValue }) =>
      await orpc.contentPolicy.updateMetadataValueBlock.call({
        blocked: input.blocked,
        value: {
          field: input.value.field,
          normalizedValue: input.value.normalizedValue,
          value: input.value.value,
        },
      }),
    onSuccess: async () => {
      toast.success(t('contentPolicy:context.metadataUpdated'));
      await invalidatePolicyQueries();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, t('contentPolicy:context.updateFailed'))
      );
    },
  });
  const manualBlockMutation = useMutation({
    mutationFn: async (input: { blocked: boolean; identity: MangaIdentity }) =>
      await orpc.contentPolicy.updateManualMangaBlock.call(input),
    onSuccess: async () => {
      toast.success(t('contentPolicy:context.manualBlockUpdated'));
      await invalidatePolicyQueries();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, t('contentPolicy:context.updateFailed'))
      );
    },
  });
  const pendingMetadataKey = metadataMutation.isPending
    ? buildMetadataValueKey(metadataMutation.variables.value)
    : null;

  return {
    isManualBlockPending: manualBlockMutation.isPending,
    pendingMetadataKey,
    setManualMangaBlocked: (identity: MangaIdentity, blocked: boolean) =>
      manualBlockMutation.mutate({ blocked, identity }),
    setMetadataValueBlocked: (value: MetadataValue, blocked: boolean) =>
      metadataMutation.mutate({ blocked, value }),
  };
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ORPCError ? error.message : fallback;
}
