import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { RadioGroup } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

import { permissionStaff } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import { OcrUploadCustomProfile } from '@/features/settings/manager/ocr-upload-custom-profile';
import { OcrUploadProfileCard } from '@/features/settings/manager/ocr-upload-profile-card';
import {
  isOcrUploadCompressionEnabled,
  resolveOcrUploadProfileAfterToggle,
} from '@/features/settings/manager/ocr-upload-profile-policy';
import { OcrUploadRolloutSection } from '@/features/settings/manager/ocr-upload-rollout-section';
import { OcrUploadStatusSection } from '@/features/settings/manager/ocr-upload-status-section';
import type { SettingsFormValues } from '@/features/settings/manager/settings-form-schema';
import { useOcrUploadProfileStore } from '@/features/settings/manager/use-ocr-upload-profile-store';
import type {
  OcrUploadCompressionProfile,
  OcrUploadCompressionProfileCatalogItem,
} from '@/server/ocr-upload-compression/schema';
import { zOcrUploadCompressionProfile } from '@/server/ocr-upload-compression/schema';

interface OcrUploadCompressionSettingsSectionProps {
  catalog: OcrUploadCompressionProfileCatalogItem[];
  policyRevision: string;
}

export const OcrUploadCompressionSettingsSection = ({
  catalog,
  policyRevision,
}: OcrUploadCompressionSettingsSectionProps) => {
  const { t } = useTranslation(['settings']);
  const form = useFormContext<SettingsFormValues>();
  const config = useWatch({
    control: form.control,
    name: 'ocrUpload',
  });
  const lastCompressedProfile = useOcrUploadProfileStore(
    (state) => state.lastCompressedProfile
  );
  const rememberCompressedProfile = useOcrUploadProfileStore(
    (state) => state.rememberCompressedProfile
  );
  const selectedCatalogItem =
    catalog.find((item) => item.profile === config.profile) ?? catalog[0];

  if (!selectedCatalogItem) {
    return null;
  }

  const selectProfile = (profile: OcrUploadCompressionProfile) => {
    if (profile !== 'original') {
      rememberCompressedProfile(profile);
    }

    form.setValue('ocrUpload.profile', profile, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const compressionEnabled = isOcrUploadCompressionEnabled(config.profile);

  return (
    <section className="space-y-5 border-t pt-8">
      <div>
        <h2 className="text-xl font-semibold">
          {t('settings:ocrUpload.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings:ocrUpload.description')}
        </p>
      </div>

      <div className="flex min-h-20 items-center justify-between gap-6 border-y py-4">
        <div>
          <p className="text-sm font-medium">
            {t('settings:ocrUpload.master.label')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {compressionEnabled
              ? t('settings:ocrUpload.master.enabled')
              : t('settings:ocrUpload.master.disabled')}
          </p>
        </div>
        <WithPermissions permissions={[permissionStaff.update]}>
          <Switch
            aria-label={t('settings:ocrUpload.master.label')}
            checked={compressionEnabled}
            onCheckedChange={(checked) => {
              if (!checked && config.profile !== 'original') {
                rememberCompressedProfile(config.profile);
              }

              selectProfile(
                resolveOcrUploadProfileAfterToggle({
                  checked,
                  currentProfile: config.profile,
                  lastCompressedProfile,
                })
              );
            }}
          />
        </WithPermissions>
      </div>

      <div>
        <h3 className="text-sm font-medium">
          {t('settings:ocrUpload.profilesTitle')}
        </h3>
        <RadioGroup
          className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          value={config.profile}
          onValueChange={(profile) => {
            const parsedProfile =
              zOcrUploadCompressionProfile.safeParse(profile);

            if (parsedProfile.success) {
              selectProfile(parsedProfile.data);
            }
          }}
        >
          {catalog.map((item) => (
            <OcrUploadProfileCard
              item={item}
              key={item.profile}
              selected={item.profile === config.profile}
            />
          ))}
        </RadioGroup>
        <p className="mt-3 text-xs text-muted-foreground">
          {t('settings:ocrUpload.reduction.reference')}
        </p>
      </div>

      {config.profile === 'custom' ? <OcrUploadCustomProfile /> : null}

      <Controller
        control={form.control}
        name="ocrUpload.rollout"
        render={({ field }) => (
          <OcrUploadRolloutSection
            onChange={field.onChange}
            value={field.value}
          />
        )}
      />

      {config.profile === 'original' ? (
        <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-4">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {t('settings:ocrUpload.warnings.original')}
          </p>
        </div>
      ) : null}

      {selectedCatalogItem.experimental ? (
        <div className="flex items-start gap-3 rounded-md border border-warning-600/30 bg-warning-500/5 p-4">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning-600" />
          <p className="text-sm text-muted-foreground">
            {t('settings:ocrUpload.warnings.experimental')}
          </p>
        </div>
      ) : null}

      <OcrUploadStatusSection
        catalogItem={selectedCatalogItem}
        config={config}
        policyRevision={policyRevision}
      />
    </section>
  );
};
