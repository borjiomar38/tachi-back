import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BotIcon, InfoIcon, ShieldOffIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmResponsiveDrawer } from '@/components/ui/confirm-responsive-drawer';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';

import { permissionProvider } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';

export const PornographyAutomationSettingsSection = () => (
  <WithPermissions permissions={[permissionProvider.read]}>
    <PornographyAutomationSettingsSectionContent />
  </WithPermissions>
);

const PornographyAutomationSettingsSectionContent = () => {
  const { t } = useTranslation(['settings']);
  const queryClient = useQueryClient();
  const toggleDescriptionId = useId();
  const preservedDescriptionId = useId();
  const queryOptions =
    orpc.contentPolicy.pornographyAutomationSettings.queryOptions({
      input: undefined,
    });
  const settingsQuery = useQuery(queryOptions);
  const updateMutation = useMutation({
    mutationFn: async (enabled: boolean) =>
      await orpc.contentPolicy.updatePornographyAutomationSettings.call({
        enabled,
      }),
    onSuccess: async (settings) => {
      queryClient.setQueryData(queryOptions.queryKey, settings);
      toast.success(
        t(
          settings.enabled
            ? 'settings:pornographyAutomation.feedback.enabled'
            : 'settings:pornographyAutomation.feedback.disabled'
        )
      );
      await queryClient.invalidateQueries({
        queryKey: queryOptions.queryKey,
      });
    },
    onError: () => {
      toast.error(t('settings:pornographyAutomation.feedback.updateFailed'));
    },
  });

  const updateEnabled = async (enabled: boolean) => {
    try {
      await updateMutation.mutateAsync(enabled);
    } catch {
      // The mutation displays the actionable error and preserves the setting.
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <BotIcon className="size-5" />
          <h2 className="text-xl font-semibold">
            {t('settings:pornographyAutomation.title')}
          </h2>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t('settings:pornographyAutomation.description')}
        </p>
      </div>

      {settingsQuery.isPending ? (
        <div className="flex min-h-24 items-center justify-center border-y">
          <Spinner className="size-4 opacity-60" />
        </div>
      ) : !settingsQuery.data ? (
        <div className="flex min-h-24 flex-col items-start justify-center gap-3 border-y py-5">
          <p className="text-sm text-negative-600">
            {t('settings:pornographyAutomation.feedback.loadFailed')}
          </p>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => settingsQuery.refetch()}
          >
            {t('settings:pornographyAutomation.actions.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex min-h-24 items-center justify-between gap-6 border-y py-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">
                  {t('settings:pornographyAutomation.toggle.label')}
                </p>
                <Badge
                  size="sm"
                  variant={settingsQuery.data.enabled ? 'positive' : 'warning'}
                >
                  {t(
                    settingsQuery.data.enabled
                      ? 'settings:pornographyAutomation.status.enabled'
                      : 'settings:pornographyAutomation.status.disabled'
                  )}
                </Badge>
              </div>
              <p
                id={toggleDescriptionId}
                className="mt-1 max-w-3xl text-sm text-muted-foreground"
              >
                {t(
                  settingsQuery.data.enabled
                    ? 'settings:pornographyAutomation.toggle.enabledDescription'
                    : 'settings:pornographyAutomation.toggle.disabledDescription'
                )}
              </p>
            </div>

            <WithPermissions permissions={[permissionProvider.update]}>
              <ConfirmResponsiveDrawer
                confirmText={t(
                  'settings:pornographyAutomation.confirmDisable.confirm'
                )}
                confirmVariant="destructive"
                description={t(
                  'settings:pornographyAutomation.confirmDisable.description'
                )}
                enabled={settingsQuery.data.enabled}
                title={t('settings:pornographyAutomation.confirmDisable.title')}
                onConfirm={() => updateEnabled(!settingsQuery.data.enabled)}
              >
                <Switch
                  aria-describedby={`${toggleDescriptionId} ${preservedDescriptionId}`}
                  aria-label={t('settings:pornographyAutomation.toggle.label')}
                  checked={settingsQuery.data.enabled}
                  disabled={updateMutation.isPending}
                />
              </ConfirmResponsiveDrawer>
            </WithPermissions>
          </div>

          <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-4">
            {settingsQuery.data.enabled ? (
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
            ) : (
              <ShieldOffIcon className="mt-0.5 size-4 shrink-0 text-warning-600" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t('settings:pornographyAutomation.preserved.title')}
              </p>
              <p
                id={preservedDescriptionId}
                className="text-sm text-muted-foreground"
              >
                {t('settings:pornographyAutomation.preserved.description')}
              </p>
              {settingsQuery.data.updatedAt === null ? (
                <p className="text-xs text-muted-foreground">
                  {t('settings:pornographyAutomation.defaultValue', {
                    status: t(
                      settingsQuery.data.defaultEnabled
                        ? 'settings:pornographyAutomation.status.enabled'
                        : 'settings:pornographyAutomation.status.disabled'
                    ),
                  })}
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
