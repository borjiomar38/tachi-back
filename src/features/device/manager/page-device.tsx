import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { BanIcon } from 'lucide-react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import { BackButton } from '@/components/back-button';
import { PageError } from '@/components/errors/page-error';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmResponsiveDrawer } from '@/components/ui/confirm-responsive-drawer';
import {
  DataList,
  DataListCell,
  DataListEmptyState,
  DataListRow,
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';
import { ResponsiveIconButton } from '@/components/ui/responsive-icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionDevice } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageDevice = (props: { params: { id: string } }) => {
  const queryClient = useQueryClient();
  const deviceQuery = useQuery(
    orpc.device.getById.queryOptions({
      input: {
        deviceId: props.params.id,
      },
    })
  );

  const revokeDeviceMutation = useMutation({
    mutationFn: async () =>
      await orpc.device.revokeById.call({
        deviceId: props.params.id,
      }),
    onSuccess: async () => {
      toast.success('Device revoked.');
      await queryClient.invalidateQueries({
        queryKey: orpc.device.getById.key({
          input: {
            deviceId: props.params.id,
          },
        }),
      });
    },
    onError: () => {
      toast.error('Failed to revoke the device.');
    },
  });

  const ui = getUiState((set) => {
    if (deviceQuery.status === 'pending') {
      return set('pending');
    }

    if (
      deviceQuery.status === 'error' &&
      deviceQuery.error instanceof ORPCError &&
      deviceQuery.error.code === 'NOT_FOUND'
    ) {
      return set('not-found');
    }

    if (deviceQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      device: deviceQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionDevice.read]}>
      <PageLayout>
        <PageLayoutTopBar
          startActions={<BackButton />}
          endActions={ui
            .match('pending', () => null)
            .match('not-found', () => null)
            .match('error', () => null)
            .match('default', ({ device }) =>
              device.status === 'active' ? (
                <WithPermissions permissions={[permissionDevice.revoke]}>
                  <ConfirmResponsiveDrawer
                    confirmText="Revoke device"
                    confirmVariant="destructive"
                    description="This will revoke the installation and invalidate active mobile sessions."
                    onConfirm={() => revokeDeviceMutation.mutateAsync()}
                    title={`Revoke ${device.installationId}?`}
                  >
                    <ResponsiveIconButton
                      label="Revoke device"
                      loading={revokeDeviceMutation.isPending}
                      size="sm"
                      variant="ghost"
                    >
                      <BanIcon />
                    </ResponsiveIconButton>
                  </ConfirmResponsiveDrawer>
                </WithPermissions>
              ) : null
            )
            .exhaustive()}
        >
          <PageLayoutTopBarTitle>
            {ui
              .match('pending', () => <Skeleton className="h-4 w-64" />)
              .match('not-found', () => 'Device not found')
              .match('error', () => 'Device lookup failed')
              .match('default', ({ device }) => device.installationId)
              .exhaustive()}
          </PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-5xl">
          {ui
            .match('pending', () => <Spinner full />)
            .match('not-found', () => <PageError type="404" />)
            .match('error', () => <PageError type="unknown-server-error" />)
            .match('default', ({ device }) => (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Status"
                    subLabel={`Created ${dayjs(device.createdAt).format('DD/MM/YYYY HH:mm')}`}
                    value={device.status}
                  />
                  <SummaryCard
                    label="Platform"
                    subLabel={device.locale ?? 'No locale'}
                    value={device.platform}
                  />
                  <SummaryCard
                    label="App Version"
                    subLabel={`Build ${device.appBuild ?? 'unknown'}`}
                    value={device.appVersion ?? 'Unknown'}
                  />
                  <SummaryCard
                    label="Last Seen"
                    subLabel={device.lastIpAddress ?? 'No IP captured'}
                    value={
                      device.lastSeenAt
                        ? dayjs(device.lastSeenAt).fromNow()
                        : 'No heartbeat yet'
                    }
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Active License</CardTitle>
                    <CardDescription>
                      The currently active license bound to this installation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {device.activeLicense ? (
                      <div className="space-y-2 text-sm">
                        <div className="font-medium">
                          <Link
                            params={{ key: device.activeLicense.key }}
                            to="/manager/licenses/$key"
                          >
                            {device.activeLicense.key}
                          </Link>
                        </div>
                        <div className="text-muted-foreground">
                          {device.activeLicense.ownerEmail ?? 'No owner email'}
                        </div>
                        <Badge
                          variant={getStatusBadgeVariant(
                            device.activeLicense.status
                          )}
                        >
                          {device.activeLicense.status}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No active license binding exists for this installation.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>License Bindings</CardTitle>
                    <CardDescription>
                      Historical bindings attached to this device installation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataList>
                      {!device.bindings.length ? (
                        <DataListEmptyState>
                          No license bindings were found for this device.
                        </DataListEmptyState>
                      ) : (
                        device.bindings.map((binding) => (
                          <DataListRow key={binding.licenseBindingId} withHover>
                            <DataListCell>
                              <DataListText className="font-medium">
                                <Link
                                  params={{ key: binding.key }}
                                  to="/manager/licenses/$key"
                                >
                                  {binding.key}
                                  <span className="absolute inset-0" />
                                </Link>
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                {binding.ownerEmail ?? 'No owner email'}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.55]">
                              <DataListTextHeader>Status</DataListTextHeader>
                              <Badge
                                variant={getStatusBadgeVariant(binding.status)}
                              >
                                {binding.status}
                              </Badge>
                            </DataListCell>
                            <DataListCell className="max-md:hidden">
                              <DataListTextHeader>Bound</DataListTextHeader>
                              <DataListText className="text-xs">
                                {dayjs(binding.boundAt).format(
                                  'DD/MM/YYYY HH:mm'
                                )}
                              </DataListText>
                            </DataListCell>
                          </DataListRow>
                        ))
                      )}
                    </DataList>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Device Metadata</CardTitle>
                    <CardDescription>
                      Last recorded app/device metadata from activation and
                      heartbeat requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                      {JSON.stringify(device.metadata ?? {}, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            ))
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function SummaryCard(props: {
  label: string;
  subLabel: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {props.subLabel}
      </CardContent>
    </Card>
  );
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
    case 'paid':
    case 'posted':
    case 'redeemed':
      return 'positive' as const;
    case 'pending':
    case 'available':
    case 'partially_refunded':
    case 'suspended':
      return 'warning' as const;
    case 'revoked':
    case 'blocked':
    case 'released':
    case 'failed':
    case 'canceled':
    case 'expired':
    case 'refunded':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}
