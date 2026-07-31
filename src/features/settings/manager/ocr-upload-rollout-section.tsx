import { useTranslation } from 'react-i18next';

import { NumberInput } from '@/components/ui/number-input';
import { Radio, RadioGroup } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

import type { OcrUploadCompressionRuntimeConfig } from '@/server/ocr-upload-compression/schema';

type OcrUploadRollout = OcrUploadCompressionRuntimeConfig['rollout'];
type OcrUploadRolloutMode = OcrUploadRollout['mode'];

interface OcrUploadRolloutSectionProps {
  onChange: (rollout: OcrUploadRollout) => void;
  value: OcrUploadRollout;
}

const rolloutModes: readonly OcrUploadRolloutMode[] = [
  'test_devices',
  'percentage',
  'all',
];

export const OcrUploadRolloutSection = ({
  onChange,
  value,
}: OcrUploadRolloutSectionProps) => {
  const { t } = useTranslation(['settings']);
  const percentage = value.mode === 'percentage' ? value.percentage : 10;
  const changeHandlers: Record<OcrUploadRolloutMode, () => void> = {
    all: () => {
      onChange({ mode: 'all' });
    },
    percentage: () => {
      onChange({ mode: 'percentage', percentage });
    },
    test_devices: () => {
      onChange({ installationIds: [], mode: 'test_devices' });
    },
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">{t('settings:ocrUpload.rollout.title')}</h3>
        <RadioGroup
          className="mt-3 flex-row flex-wrap gap-x-8 gap-y-3"
          value={value.mode}
          onValueChange={(mode) => {
            if (rolloutModes.includes(mode as OcrUploadRolloutMode)) {
              changeHandlers[mode as OcrUploadRolloutMode]();
            }
          }}
        >
          <Radio value="test_devices">
            {t('settings:ocrUpload.rollout.testDevices')}
          </Radio>
          <Radio value="percentage">
            {t('settings:ocrUpload.rollout.percentage', { percentage })}
          </Radio>
          <Radio value="all">{t('settings:ocrUpload.rollout.all')}</Radio>
        </RadioGroup>
      </div>

      {value.mode === 'test_devices' ? (
        <div>
          <label
            className="text-sm font-medium"
            htmlFor="ocr-upload-installation-ids"
          >
            {t('settings:ocrUpload.rollout.installationIds')}
          </label>
          <Textarea
            className="mt-2"
            id="ocr-upload-installation-ids"
            placeholder={t(
              'settings:ocrUpload.rollout.installationIdsPlaceholder'
            )}
            rows={3}
            value={value.installationIds.join('\n')}
            onChange={(event) => {
              const installationIds = event.target.value
                .split('\n')
                .map((installationId) => installationId.trim())
                .filter(Boolean)
                .slice(0, 20);

              onChange({ installationIds, mode: 'test_devices' });
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('settings:ocrUpload.rollout.installationIdsHelp')}
          </p>
        </div>
      ) : null}

      {value.mode === 'percentage' ? (
        <div className="max-w-56">
          <label
            className="text-sm font-medium"
            htmlFor="ocr-upload-rollout-percentage"
          >
            {t('settings:ocrUpload.rollout.percentageLabel')}
          </label>
          <div className="mt-2 flex items-center gap-2">
            <NumberInput
              className="flex-1"
              inputProps={{ id: 'ocr-upload-rollout-percentage' }}
              max={100}
              min={0}
              step={1}
              value={value.percentage}
              onValueChange={(nextValue) => {
                const nextPercentage = Number(nextValue);

                if (Number.isInteger(nextPercentage)) {
                  onChange({
                    mode: 'percentage',
                    percentage: nextPercentage,
                  });
                }
              }}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('settings:ocrUpload.rollout.percentageHelp')}
          </p>
        </div>
      ) : null}

      {value.mode === 'all' ? (
        <p className="text-xs text-muted-foreground">
          {t('settings:ocrUpload.rollout.allHelp')}
        </p>
      ) : null}
    </div>
  );
};
