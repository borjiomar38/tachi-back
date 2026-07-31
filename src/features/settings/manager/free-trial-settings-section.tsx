import { CoinsIcon, MailCheckIcon, ShieldCheckIcon } from 'lucide-react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { NumberInput } from '@/components/ui/number-input';

import type { SettingsFormValues } from '@/features/settings/manager/settings-form-schema';
import { SettingsStatusItem } from '@/features/settings/manager/settings-status-item';
import { SettingsSwitchRow } from '@/features/settings/manager/settings-switch-row';

export const FreeTrialSettingsSection = () => {
  const { t } = useTranslation(['settings']);
  const form = useFormContext<SettingsFormValues>();
  const freeTrial = useWatch({
    control: form.control,
    name: 'freeTrial',
  });

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          {t('settings:freeTrial.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings:freeTrial.description')}
        </p>
      </div>

      <div className="divide-y border-y">
        <Controller
          control={form.control}
          name="freeTrial.enabled"
          render={({ field }) => (
            <SettingsSwitchRow
              checked={field.value}
              description={t('settings:freeTrial.enabled.description')}
              label={t('settings:freeTrial.enabled.label')}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="freeTrial.deliveryMode"
          render={({ field }) => (
            <SettingsSwitchRow
              checked={field.value === 'email_code'}
              description={t('settings:freeTrial.emailCode.description')}
              label={t('settings:freeTrial.emailCode.label')}
              onCheckedChange={(checked) => {
                field.onChange(checked ? 'email_code' : 'direct');
              }}
            />
          )}
        />
        <Controller
          control={form.control}
          name="freeTrial.emailRiskReviewEnabled"
          render={({ field }) => (
            <SettingsSwitchRow
              checked={field.value}
              description={t('settings:freeTrial.emailRisk.description')}
              label={t('settings:freeTrial.emailRisk.label')}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center border bg-muted/40">
            <CoinsIcon className="size-4" />
          </span>
          <div>
            <label
              className="text-sm font-medium"
              htmlFor="free-trial-token-amount"
            >
              {t('settings:freeTrial.allowance.label')}
            </label>
            <p className="text-sm text-muted-foreground">
              {t('settings:freeTrial.allowance.description')}
            </p>
          </div>
        </div>
        <Controller
          control={form.control}
          name="freeTrial.tokenAmount"
          render={({ field, fieldState }) => (
            <div className="flex w-full items-center gap-2 sm:w-48">
              <NumberInput
                aria-invalid={fieldState.invalid}
                inputProps={{ id: 'free-trial-token-amount' }}
                max={10_000}
                min={1}
                step={1}
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={(value) => {
                  const tokenAmount = Number(value);

                  if (Number.isInteger(tokenAmount)) {
                    field.onChange(tokenAmount);
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">
                {t('settings:freeTrial.allowance.unit')}
              </span>
            </div>
          )}
        />
      </div>

      <div className="grid border sm:grid-cols-3 sm:divide-x">
        <SettingsStatusItem
          label={t('settings:freeTrial.status.mode')}
          value={
            freeTrial.deliveryMode === 'email_code'
              ? t('settings:freeTrial.status.emailCode')
              : t('settings:freeTrial.status.direct')
          }
        />
        <SettingsStatusItem
          icon={<ShieldCheckIcon className="size-4" />}
          label={t('settings:freeTrial.status.antiAbuse')}
          positive
          value={t('settings:freeTrial.status.active')}
        />
        <SettingsStatusItem
          icon={<MailCheckIcon className="size-4" />}
          label={t('settings:freeTrial.status.emailReview')}
          positive={freeTrial.emailRiskReviewEnabled}
          value={
            freeTrial.emailRiskReviewEnabled
              ? t('settings:freeTrial.status.enabled')
              : t('settings:freeTrial.status.disabled')
          }
        />
      </div>
    </section>
  );
};
