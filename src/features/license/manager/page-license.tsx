import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { ReactNode } from 'react';

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
import {
  DataList,
  DataListCell,
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionLicense } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageLicense = (props: { params: { key: string } }) => {
  const summaryQuery = useQuery(
    orpc.license.getByKey.queryOptions({
      input: {
        key: props.params.key,
      },
    })
  );
  const devicesQuery = useQuery({
    ...orpc.license.getDevices.queryOptions({
      input: {
        key: props.params.key,
      },
    }),
    enabled: summaryQuery.status === 'success',
  });
  const ordersQuery = useQuery({
    ...orpc.license.getOrders.queryOptions({
      input: {
        key: props.params.key,
      },
    }),
    enabled: summaryQuery.status === 'success',
  });
  const ledgerQuery = useQuery({
    ...orpc.license.getLedger.queryOptions({
      input: {
        key: props.params.key,
      },
    }),
    enabled: summaryQuery.status === 'success',
  });

  const ui = getUiState((set) => {
    if (summaryQuery.status === 'pending') {
      return set('pending');
    }

    if (
      summaryQuery.status === 'error' &&
      summaryQuery.error instanceof ORPCError &&
      summaryQuery.error.code === 'NOT_FOUND'
    ) {
      return set('not-found');
    }

    if (summaryQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      summary: summaryQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionLicense.read]}>
      <PageLayout>
        <PageLayoutTopBar startActions={<BackButton />}>
          <PageLayoutTopBarTitle>
            {ui
              .match('pending', () => <Skeleton className="h-4 w-56" />)
              .match('not-found', () => 'License not found')
              .match('error', () => 'License lookup failed')
              .match('default', ({ summary }) => summary.key)
              .exhaustive()}
          </PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-6xl">
          {ui
            .match('pending', () => <Spinner full />)
            .match('not-found', () => <PageError type="404" />)
            .match('error', () => <PageError type="unknown-server-error" />)
            .match('default', ({ summary }) => (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Available Tokens"
                    value={summary.availableTokens.toLocaleString()}
                    subLabel="Current spendable balance"
                  />
                  <SummaryCard
                    label="License Status"
                    value={summary.status}
                    subLabel={`Created ${dayjs(summary.createdAt).format('DD/MM/YYYY HH:mm')}`}
                  />
                  <SummaryCard
                    label="Devices"
                    value={
                      summary.deviceLimit > 0
                        ? `${summary.activeDeviceCount}/${summary.deviceLimit}`
                        : `${summary.activeDeviceCount}/Unlimited`
                    }
                    subLabel="Active devices"
                  />
                  <SummaryCard
                    label="Owner Email"
                    value={summary.ownerEmail ?? 'No owner email'}
                    subLabel={
                      summary.activatedAt
                        ? `Activated ${dayjs(summary.activatedAt).fromNow()}`
                        : 'Not activated yet'
                    }
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Redeem Codes</CardTitle>
                    <CardDescription>
                      Recent redeem codes issued for this license.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataList>
                      {summary.redeemCodes.length === 0 ? (
                        <DataListEmptyState>
                          No redeem codes have been attached to this license
                          yet.
                        </DataListEmptyState>
                      ) : (
                        summary.redeemCodes.map((code) => (
                          <DataListRow key={code.code}>
                            <DataListCell>
                              <DataListText className="font-medium">
                                {code.code}
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                Created{' '}
                                {dayjs(code.createdAt).format(
                                  'DD/MM/YYYY HH:mm'
                                )}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.55]">
                              <DataListTextHeader>Status</DataListTextHeader>
                              <Badge
                                variant={getStatusBadgeVariant(code.status)}
                              >
                                {code.status}
                              </Badge>
                            </DataListCell>
                            <DataListCell className="max-md:hidden">
                              <DataListTextHeader>Redeemed</DataListTextHeader>
                              <DataListText className="text-xs">
                                {code.redeemedAt
                                  ? dayjs(code.redeemedAt).format(
                                      'DD/MM/YYYY HH:mm'
                                    )
                                  : 'Not redeemed'}
                              </DataListText>
                            </DataListCell>
                          </DataListRow>
                        ))
                      )}
                    </DataList>
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <SectionCard
                    description="Orders that created or funded this license."
                    query={ordersQuery}
                    title="Orders"
                  >
                    {(orders) => (
                      <DataList>
                        {!orders.length ? (
                          <DataListEmptyState>
                            No paid orders are attached to this license yet.
                          </DataListEmptyState>
                        ) : (
                          orders.map((order) => (
                            <DataListRow key={order.id}>
                              <DataListCell>
                                <DataListText className="font-medium">
                                  {order.id}
                                </DataListText>
                                <DataListText className="text-xs text-muted-foreground">
                                  {order.payerEmail ?? 'No payer email'}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="flex-[0.6]">
                                <DataListTextHeader>Amount</DataListTextHeader>
                                <DataListText className="text-xs">
                                  {(order.amountTotalCents / 100).toFixed(2)}{' '}
                                  {order.currency.toUpperCase()}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="flex-[0.6]">
                                <DataListTextHeader>Status</DataListTextHeader>
                                <Badge
                                  variant={getStatusBadgeVariant(order.status)}
                                >
                                  {order.status}
                                </Badge>
                              </DataListCell>
                            </DataListRow>
                          ))
                        )}
                      </DataList>
                    )}
                  </SectionCard>

                  <SectionCard
                    description="Devices currently or previously bound to this license."
                    query={devicesQuery}
                    title="Devices"
                  >
                    {(devices) => (
                      <DataList>
                        {!devices.length ? (
                          <DataListEmptyState>
                            No devices have redeemed this license yet.
                          </DataListEmptyState>
                        ) : (
                          devices.map((device) => (
                            <DataListRow
                              key={device.licenseBindingId}
                              withHover
                            >
                              <DataListCell>
                                <DataListText className="font-medium">
                                  <Link
                                    params={{ id: device.deviceId }}
                                    to="/manager/devices/$id"
                                  >
                                    {device.installationId}
                                    <span className="absolute inset-0" />
                                  </Link>
                                </DataListText>
                                <DataListText className="text-xs text-muted-foreground">
                                  Bound{' '}
                                  {dayjs(device.boundAt).format(
                                    'DD/MM/YYYY HH:mm'
                                  )}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="flex-[0.6]">
                                <DataListTextHeader>Status</DataListTextHeader>
                                <Badge
                                  variant={getStatusBadgeVariant(
                                    device.deviceStatus
                                  )}
                                >
                                  {device.deviceStatus}
                                </Badge>
                              </DataListCell>
                              <DataListCell className="max-md:hidden">
                                <DataListTextHeader>
                                  Last Seen
                                </DataListTextHeader>
                                <DataListText className="text-xs">
                                  {device.lastSeenAt
                                    ? dayjs(device.lastSeenAt).fromNow()
                                    : 'No heartbeat yet'}
                                </DataListText>
                              </DataListCell>
                            </DataListRow>
                          ))
                        )}
                      </DataList>
                    )}
                  </SectionCard>
                </div>

                <SectionCard
                  description="Append-only token ledger for this license."
                  query={ledgerQuery}
                  title="Token Ledger"
                >
                  {(entries) => (
                    <DataList>
                      {!entries.length ? (
                        <DataListEmptyState>
                          No ledger entries were found for this license.
                        </DataListEmptyState>
                      ) : (
                        entries.map((entry) => (
                          <DataListRow key={entry.id}>
                            <DataListCell>
                              <DataListText className="font-medium">
                                {entry.type}
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                {entry.description ?? 'No description'}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.5]">
                              <DataListTextHeader>Delta</DataListTextHeader>
                              <DataListText
                                className={
                                  entry.deltaTokens >= 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }
                              >
                                {entry.deltaTokens >= 0 ? '+' : ''}
                                {entry.deltaTokens}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.55]">
                              <DataListTextHeader>Status</DataListTextHeader>
                              <Badge
                                variant={getStatusBadgeVariant(entry.status)}
                              >
                                {entry.status}
                              </Badge>
                            </DataListCell>
                            <DataListCell className="max-md:hidden">
                              <DataListTextHeader>Created</DataListTextHeader>
                              <DataListText className="text-xs">
                                {dayjs(entry.createdAt).format(
                                  'DD/MM/YYYY HH:mm'
                                )}
                              </DataListText>
                            </DataListCell>
                          </DataListRow>
                        ))
                      )}
                    </DataList>
                  )}
                </SectionCard>
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

function SectionCard<T>(props: {
  children: (data: T) => ReactNode;
  description: string;
  query: {
    data: T | undefined;
    isError: boolean;
    isPending: boolean;
    refetch: () => unknown;
  };
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {props.query.isPending ? (
          <DataList>
            <DataListLoadingState />
          </DataList>
        ) : props.query.isError ? (
          <DataList>
            <DataListErrorState retry={() => props.query.refetch()} />
          </DataList>
        ) : (
          props.children(props.query.data as T)
        )}
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
    case 'voided':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}
