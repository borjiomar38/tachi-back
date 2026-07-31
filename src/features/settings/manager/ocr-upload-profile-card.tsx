import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { Radio } from '@/components/ui/radio-group';

import type {
  OcrUploadCompressionProfile,
  OcrUploadCompressionProfileCatalogItem,
} from '@/server/ocr-upload-compression/schema';

const profileNameKeys = {
  balanced: 'settings:ocrUpload.profiles.balanced.name',
  custom: 'settings:ocrUpload.profiles.custom.name',
  original: 'settings:ocrUpload.profiles.original.name',
  safe: 'settings:ocrUpload.profiles.safe.name',
  strong: 'settings:ocrUpload.profiles.strong.name',
} as const satisfies Record<OcrUploadCompressionProfile, string>;

const profileDescriptionKeys = {
  balanced: 'settings:ocrUpload.profiles.balanced.description',
  custom: 'settings:ocrUpload.profiles.custom.description',
  original: 'settings:ocrUpload.profiles.original.detail',
  safe: 'settings:ocrUpload.profiles.safe.description',
  strong: 'settings:ocrUpload.profiles.strong.description',
} as const satisfies Record<OcrUploadCompressionProfile, string>;

interface OcrUploadProfileCardProps {
  item: OcrUploadCompressionProfileCatalogItem;
  selected: boolean;
}

const getBadge = (item: OcrUploadCompressionProfileCatalogItem) => {
  if (item.profile === 'original') {
    return {
      labelKey: 'settings:ocrUpload.badges.original',
      variant: 'secondary' as const,
    } as const;
  }

  if (item.experimental) {
    return {
      labelKey: 'settings:ocrUpload.badges.experimental',
      variant: 'brand' as const,
    } as const;
  }

  return {
    labelKey: 'settings:ocrUpload.badges.validated',
    variant: 'positive' as const,
  } as const;
};

export const OcrUploadProfileCard = ({
  item,
  selected,
}: OcrUploadProfileCardProps) => {
  const { t } = useTranslation(['settings']);
  const badge = getBadge(item);
  const reduction =
    item.measuredReductionPercent === null
      ? t('settings:ocrUpload.reduction.variable')
      : t('settings:ocrUpload.reduction.exact', {
          percent: item.measuredReductionPercent,
        });
  const parameters =
    item.maxWidthPx === null || item.webpQuality === null
      ? t(profileDescriptionKeys[item.profile])
      : t('settings:ocrUpload.profileParameters', {
          quality: item.webpQuality,
          width: item.maxWidthPx,
        });

  return (
    <Radio
      value={item.profile}
      labelProps={{
        className: cn(
          'min-h-28 cursor-pointer rounded-md border p-4 transition-colors hover:bg-muted/30',
          selected && 'border-primary bg-primary/5'
        ),
      }}
      className="mt-0.5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {t(profileNameKeys[item.profile])}
          </span>
          <Badge size="sm" variant={badge.variant}>
            {t(badge.labelKey)}
          </Badge>
        </div>
        <p className="mt-3 text-lg font-medium">{reduction}</p>
        <p className="mt-1 text-xs text-muted-foreground">{parameters}</p>
      </div>
    </Radio>
  );
};
