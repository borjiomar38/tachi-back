import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  type SubmitHandler,
  useForm,
  type UseFormReturn,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import {
  createSettingsFormSchema,
  type SettingsFormValues,
} from '@/features/settings/manager/settings-form-schema';
import { getDefaultFreeTrialRuntimeConfig } from '@/server/licenses/free-trial-settings-schema';
import {
  getDefaultOcrUploadCompressionRuntimeConfig,
  type OcrUploadCompressionProfileCatalogItem,
} from '@/server/ocr-upload-compression/schema';

interface UseSettingsPageFormResult {
  catalog: OcrUploadCompressionProfileCatalogItem[];
  form: UseFormReturn<SettingsFormValues>;
  isError: boolean;
  isLoading: boolean;
  isSaving: boolean;
  policyRevision: string;
  save: SubmitHandler<SettingsFormValues>;
}

export const useSettingsPageForm = (): UseSettingsPageFormResult => {
  const { t } = useTranslation(['settings']);
  const queryClient = useQueryClient();
  const freeTrialQueryOptions = orpc.freeTrial.getRuntimeConfig.queryOptions({
    input: undefined,
  });
  const ocrUploadQueryOptions =
    orpc.mobileOcrUpload.getRuntimeConfig.queryOptions({
      input: undefined,
    });
  const freeTrialQuery = useQuery(freeTrialQueryOptions);
  const ocrUploadQuery = useQuery(ocrUploadQueryOptions);
  const values = useMemo<SettingsFormValues>(
    () => ({
      freeTrial:
        freeTrialQuery.data?.current ?? getDefaultFreeTrialRuntimeConfig(),
      ocrUpload:
        ocrUploadQuery.data?.current ??
        getDefaultOcrUploadCompressionRuntimeConfig(),
    }),
    [freeTrialQuery.data, ocrUploadQuery.data]
  );
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(createSettingsFormSchema()),
    values,
  });
  const saveMutation = useMutation({
    mutationFn: async (input: SettingsFormValues) => {
      return await Promise.all([
        orpc.freeTrial.updateRuntimeConfig.call(input.freeTrial),
        orpc.mobileOcrUpload.updateRuntimeConfig.call(input.ocrUpload),
      ]);
    },
    onSuccess: async ([freeTrialResult, ocrUploadResult]) => {
      form.reset({
        freeTrial: freeTrialResult.current,
        ocrUpload: ocrUploadResult.current,
      });
      toast.success(t('settings:page.saved'));

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: freeTrialQueryOptions.queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: ocrUploadQueryOptions.queryKey,
        }),
      ]);
    },
    onError: () => {
      toast.error(t('settings:page.saveFailed'));
    },
  });

  return {
    catalog: ocrUploadQuery.data?.catalog ?? [],
    form,
    isError: freeTrialQuery.isError || ocrUploadQuery.isError,
    isLoading: freeTrialQuery.isLoading || ocrUploadQuery.isLoading,
    isSaving: saveMutation.isPending,
    policyRevision: ocrUploadQuery.data?.policyRevision ?? '',
    save: (input) => {
      saveMutation.mutate(input);
    },
  };
};
