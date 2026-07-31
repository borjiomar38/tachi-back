import { ShieldCheckIcon } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';

import type { SettingsFormValues } from '@/features/settings/manager/settings-form-schema';

export const OcrUploadCustomProfile = () => {
  const { t } = useTranslation(['settings']);
  const form = useFormContext<SettingsFormValues>();

  return (
    <div className="space-y-5 rounded-md border p-4">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">{t('settings:ocrUpload.custom.title')}</h3>
        <Badge size="sm" variant="brand">
          {t('settings:ocrUpload.badges.experimental')}
        </Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Controller
          control={form.control}
          name="ocrUpload.custom.maxWidthPx"
          render={({ field, fieldState }) => (
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="ocr-upload-custom-width"
              >
                {t('settings:ocrUpload.custom.maximumWidth')}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <NumberInput
                  aria-invalid={fieldState.invalid}
                  className="flex-1"
                  inputProps={{ id: 'ocr-upload-custom-width' }}
                  max={2_400}
                  min={800}
                  step={50}
                  value={field.value}
                  onBlur={field.onBlur}
                  onValueChange={(value) => {
                    const maxWidthPx = Number(value);

                    if (Number.isInteger(maxWidthPx)) {
                      field.onChange(maxWidthPx);
                    }
                  }}
                />
                <span className="text-sm text-muted-foreground">px</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings:ocrUpload.custom.maximumWidthHelp')}
              </p>
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="ocrUpload.custom.webpQuality"
          render={({ field }) => (
            <div>
              <label
                className="text-sm font-medium"
                htmlFor="ocr-upload-custom-quality"
              >
                {t('settings:ocrUpload.custom.quality')}
              </label>
              <div className="mt-2 flex h-9 items-center gap-3">
                <input
                  className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
                  id="ocr-upload-custom-quality"
                  max={90}
                  min={40}
                  step={1}
                  type="range"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(Number(event.target.value));
                  }}
                />
                <span className="w-16 text-right text-sm font-medium">
                  {field.value} / 100
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings:ocrUpload.custom.qualityHelp')}
              </p>
            </div>
          )}
        />

        <div>
          <label
            className="text-sm font-medium"
            htmlFor="ocr-upload-custom-format"
          >
            {t('settings:ocrUpload.custom.format')}
          </label>
          <Input
            className="mt-2"
            id="ocr-upload-custom-format"
            readOnly
            value="WebP"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('settings:ocrUpload.custom.formatHelp')}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-positive-600/30 bg-positive-500/5 p-4">
        <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-positive-600" />
        <div>
          <p className="text-sm font-medium">
            {t('settings:ocrUpload.custom.coordinateTitle')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('settings:ocrUpload.custom.coordinateDescription')}
          </p>
        </div>
      </div>
    </div>
  );
};
