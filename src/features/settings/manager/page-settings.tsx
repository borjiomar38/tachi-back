import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CoinsIcon, MailCheckIcon, ShieldCheckIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionStaff } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

interface FreeTrialSettingsForm {
  deliveryMode: 'direct' | 'email_code';
  emailRiskReviewEnabled: boolean;
  enabled: boolean;
  tokenAmount: number;
}

export const PageSettings = () => {
  return (
    <GuardPermissions permissions={[permissionStaff.list]}>
      <PageSettingsContent />
    </GuardPermissions>
  );
};

const PageSettingsContent = () => {
  const queryClient = useQueryClient();
  const configQueryOptions = orpc.freeTrial.getRuntimeConfig.queryOptions({
    input: undefined,
  });
  const configQuery = useQuery(configQueryOptions);
  const [form, setForm] = useState<FreeTrialSettingsForm | null>(null);

  useEffect(() => {
    if (configQuery.data?.current) {
      setForm(configQuery.data.current);
    }
  }, [configQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async (input: FreeTrialSettingsForm) =>
      await orpc.freeTrial.updateRuntimeConfig.call(input),
    onSuccess: async (result) => {
      setForm(result.current);
      toast.success('Free trial settings updated.');
      await queryClient.invalidateQueries({
        queryKey: configQueryOptions.queryKey,
      });
    },
    onError: () => {
      toast.error('Unable to update free trial settings.');
    },
  });

  const hasChanges =
    !!form &&
    !!configQuery.data &&
    JSON.stringify(form) !== JSON.stringify(configQuery.data.current);

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <WithPermissions permissions={[permissionStaff.update]}>
            <Button
              size="sm"
              disabled={!form || !hasChanges || updateMutation.isPending}
              onClick={() => form && updateMutation.mutate(form)}
            >
              {updateMutation.isPending ? <Spinner /> : null}
              Save changes
            </Button>
          </WithPermissions>
        }
      >
        <PageLayoutTopBarTitle>Settings</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="max-w-6xl py-8">
        {configQuery.isLoading || !form ? (
          <Spinner full className="opacity-60" />
        ) : configQuery.isError ? (
          <p className="text-sm text-negative-600">
            Unable to load free trial settings.
          </p>
        ) : (
          <div className="space-y-8">
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Free trial</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Control access, delivery and email protection.
                </p>
              </div>

              <div className="divide-y border-y">
                <SettingsSwitchRow
                  checked={form.enabled}
                  description="Allow one protected trial per eligible user and device."
                  label="Enable free trial"
                  onCheckedChange={(enabled) =>
                    setForm((current) => current && { ...current, enabled })
                  }
                />
                <SettingsSwitchRow
                  checked={form.deliveryMode === 'email_code'}
                  description="Users enter the code from their inbox before activation."
                  label="Send redeem code by email"
                  onCheckedChange={(checked) =>
                    setForm(
                      (current) =>
                        current && {
                          ...current,
                          deliveryMode: checked ? 'email_code' : 'direct',
                        }
                    )
                  }
                />
                <SettingsSwitchRow
                  checked={form.emailRiskReviewEnabled}
                  description="Review suspicious domains asynchronously. AI alone never blocks an address."
                  label="AI email risk review"
                  onCheckedChange={(emailRiskReviewEnabled) =>
                    setForm(
                      (current) =>
                        current && { ...current, emailRiskReviewEnabled }
                    )
                  }
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
                      Trial allowance
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Applied to every new free trial.
                    </p>
                  </div>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-48">
                  <NumberInput
                    inputProps={{ id: 'free-trial-token-amount' }}
                    max={10_000}
                    min={1}
                    step={1}
                    value={form.tokenAmount}
                    onValueChange={(value) => {
                      const tokenAmount = Number(value);
                      if (Number.isInteger(tokenAmount)) {
                        setForm((current) =>
                          current ? { ...current, tokenAmount } : current
                        );
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground">tokens</span>
                </div>
              </div>
            </section>

            <section className="grid border sm:grid-cols-3 sm:divide-x">
              <StatusItem
                label="Current mode"
                value={
                  form.deliveryMode === 'email_code'
                    ? 'Email code'
                    : 'Direct activation'
                }
              />
              <StatusItem
                icon={<ShieldCheckIcon className="size-4" />}
                label="Anti-abuse protection"
                value="Active"
                positive
              />
              <StatusItem
                icon={<MailCheckIcon className="size-4" />}
                label="Email review"
                value={form.emailRiskReviewEnabled ? 'Enabled' : 'Disabled'}
                positive={form.emailRiskReviewEnabled}
              />
            </section>
          </div>
        )}
      </PageLayoutContent>
    </PageLayout>
  );
};

const SettingsSwitchRow = (props: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <div className="flex min-h-24 items-center justify-between gap-6 py-5">
    <div className="min-w-0">
      <p className="text-sm font-medium">{props.label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
    </div>
    <WithPermissions permissions={[permissionStaff.update]}>
      <Switch
        aria-label={props.label}
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}
      />
    </WithPermissions>
  </div>
);

const StatusItem = (props: {
  icon?: React.ReactNode;
  label: string;
  positive?: boolean;
  value: string;
}) => (
  <div className="flex min-h-24 items-center gap-3 p-5">
    {props.icon ? (
      <span className="text-muted-foreground">{props.icon}</span>
    ) : null}
    <div>
      <p className="text-sm text-muted-foreground">{props.label}</p>
      <p
        className={
          props.positive
            ? 'mt-1 font-medium text-positive-600'
            : 'mt-1 font-medium'
        }
      >
        {props.value}
      </p>
    </div>
  </div>
);
