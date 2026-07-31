import { useTranslation } from 'react-i18next';

import { SettingsStatusItem } from '@/features/settings/manager/settings-status-item';
import type {
  OcrUploadCompressionProfile,
  OcrUploadCompressionProfileCatalogItem,
  OcrUploadCompressionRuntimeConfig,
} from '@/server/ocr-upload-compression/schema';

const profileNameKeys = {
  balanced: 'settings:ocrUpload.profiles.balanced.name',
  custom: 'settings:ocrUpload.profiles.custom.name',
  original: 'settings:ocrUpload.profiles.original.name',
  safe: 'settings:ocrUpload.profiles.safe.name',
  strong: 'settings:ocrUpload.profiles.strong.name',
} as const satisfies Record<OcrUploadCompressionProfile, string>;

interface OcrUploadStatusSectionProps {
  catalogItem: OcrUploadCompressionProfileCatalogItem;
  config: OcrUploadCompressionRuntimeConfig;
  policyRevision: string;
}

export const OcrUploadStatusSection = ({
  catalogItem,
  config,
  policyRevision,
}: OcrUploadStatusSectionProps) => {
  const { t } = useTranslation(['settings']);
  const customParameters =
    config.profile === 'custom'
      ? t('settings:ocrUpload.profileParameters', {
          quality: config.custom.webpQuality,
          width: config.custom.maxWidthPx,
        })
      : null;
  const catalogParameters =
    catalogItem.maxWidthPx !== null && catalogItem.webpQuality !== null
      ? t('settings:ocrUpload.profileParameters', {
          quality: catalogItem.webpQuality,
          width: catalogItem.maxWidthPx,
        })
      : null;
  const parameters = customParameters ?? catalogParameters;
  const profileName = t(profileNameKeys[config.profile]);
  const currentPolicy = parameters
    ? t('settings:ocrUpload.status.profileWithParameters', {
        parameters,
        profile: profileName,
      })
    : profileName;

  return (
    <div className="grid border md:grid-cols-3 md:divide-x">
      <SettingsStatusItem
        label={t('settings:ocrUpload.status.profile')}
        value={currentPolicy}
      />
      <SettingsStatusItem
        label={t('settings:ocrUpload.status.revision')}
        value={policyRevision}
      />
      <SettingsStatusItem
        label={t('settings:ocrUpload.status.fallback')}
        value={t('settings:ocrUpload.status.originalUpload')}
      />
    </div>
  );
};
