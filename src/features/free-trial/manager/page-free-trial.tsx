import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import {
  FingerprintIcon,
  KeyRoundIcon,
  MailIcon,
  NetworkIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';

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
  DataListRow,
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import {
  permissionDevice,
  permissionLicense,
} from '@/features/auth/permissions';
import {
  formatCount,
  formatDateTime,
  formatMoney,
  getFreeTrialStatusBadgeVariant,
  getFreeTrialStatusLabel,
  truncateMiddle,
} from '@/features/free-trial/manager/page-free-trials';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

type FreeTrialDetail = Awaited<ReturnType<typeof orpc.freeTrial.getById.call>>;
type IdentityItem = FreeTrialDetail['identities'][number];
type RelatedDeviceItem = FreeTrialDetail['relatedDevices'][number];

const detailCopy = {
  availableTokens: 'Available tokens',
  billingEnds: 'Billing ends',
  claimNotFound: 'Free-trial claim not found',
  claimLookupFailed: 'Free-trial lookup failed',
  created: 'Created',
  device: 'Device',
  deviceFingerprint: 'Device fingerprint',
  email: 'Email',
  freeAccessBlocked: 'Manual IP block',
  freeTrialClaim: 'Free-trial claim',
  identities: 'Identities',
  install: 'Install',
  ipAddress: 'IP address',
  lastSeen: 'Last seen',
  ledger: 'Token ledger',
  license: 'License',
  networkHistory: 'Network history',
  noDevice: 'No related devices found.',
  noIdentities: 'No identities recorded.',
  noIp: 'No IP captured',
  noJobs: 'No jobs recorded for this license yet.',
  noLedger: 'No token ledger entries found.',
  noNetworkHistory: 'No network identities recorded.',
  noOrders: 'No paid orders attached to this license yet.',
  paidOrders: 'Paid orders',
  recentJobs: 'Recent jobs',
  redeemCode: 'Redeem code',
  relatedDevices: 'Related devices',
  spentTokens: 'Spent tokens',
  status: 'Status',
  tokenBalance: 'Token balance',
  totalTokens: 'Total tokens',
} as const;

export const PageFreeTrial = (props: { params: { id: string } }) => {
  const claimQuery = useQuery(
    orpc.freeTrial.getById.queryOptions({
      input: {
        claimId: props.params.id,
      },
    })
  );

  const ui = getUiState((set) => {
    if (claimQuery.status === 'pending') {
      return set('pending');
    }

    if (
      claimQuery.status === 'error' &&
      claimQuery.error instanceof ORPCError &&
      claimQuery.error.code === 'NOT_FOUND'
    ) {
      return set('not-found');
    }

    if (claimQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      claim: claimQuery.data,
    });
  });

  return (
    <GuardPermissions
      permissions={[permissionDevice.read, permissionLicense.read]}
    >
      <PageLayout>
        <PageLayoutTopBar startActions={<BackButton />}>
          <PageLayoutTopBarTitle>
            {ui
              .match('pending', () => <Skeleton className="h-4 w-64" />)
              .match('not-found', () => detailCopy.claimNotFound)
              .match('error', () => detailCopy.claimLookupFailed)
              .match('default', ({ claim }) => claim.email)
              .exhaustive()}
          </PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-6xl pb-8">
          {ui
            .match('pending', () => <Spinner full />)
            .match('not-found', () => <PageError type="404" />)
            .match('error', () => <PageError type="unknown-server-error" />)
            .match('default', ({ claim }: { claim: FreeTrialDetail }) => (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <SummaryCard
                    label={detailCopy.status}
                    subLabel={formatDateTime(claim.createdAt)}
                    value={
                      <Badge
                        variant={getFreeTrialStatusBadgeVariant(claim.status)}
                      >
                        {getFreeTrialStatusLabel(claim.status)}
                      </Badge>
                    }
                  />
                  <SummaryCard
                    label={detailCopy.availableTokens}
                    subLabel={detailCopy.tokenBalance}
                    value={formatCount(claim.availableTokens)}
                  />
                  <SummaryCard
                    label={detailCopy.spentTokens}
                    subLabel={`${formatCount(claim.tokenAmount)} total`}
                    value={formatCount(claim.spentTokens)}
                  />
                  <SummaryCard
                    label={detailCopy.identities}
                    subLabel={detailCopy.networkHistory}
                    value={formatCount(claim.identityCounts.total)}
                  />
                  <SummaryCard
                    label={detailCopy.paidOrders}
                    subLabel={claim.paidConversion ? 'Converted' : 'Trial only'}
                    value={formatCount(claim.paidOrders.length)}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{detailCopy.freeTrialClaim}</CardTitle>
                    <CardDescription>
                      {claim.freeAccessIpBlocked
                        ? detailCopy.freeAccessBlocked
                        : formatDateTime(claim.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 text-sm md:grid-cols-2">
                      <InfoBlock
                        icon={MailIcon}
                        label={detailCopy.email}
                        value={claim.email}
                      />
                      <InfoBlock
                        icon={SmartphoneIcon}
                        label={detailCopy.install}
                        value={claim.installationId}
                      />
                      <InfoBlock
                        icon={NetworkIcon}
                        label={detailCopy.ipAddress}
                        value={claim.ipAddress ?? detailCopy.noIp}
                      />
                      <InfoBlock
                        icon={FingerprintIcon}
                        label={detailCopy.deviceFingerprint}
                        value={
                          claim.deviceFingerprintHash
                            ? truncateMiddle(claim.deviceFingerprintHash, 42)
                            : 'None'
                        }
                      />
                      <InfoBlock
                        icon={KeyRoundIcon}
                        label={detailCopy.license}
                        value={
                          <Link
                            className="break-all text-foreground hover:underline"
                            params={{ key: claim.license.key }}
                            to="/manager/licenses/$key"
                          >
                            {claim.license.key}
                          </Link>
                        }
                      />
                      <InfoBlock
                        icon={KeyRoundIcon}
                        label={detailCopy.redeemCode}
                        value={claim.redeemCode.code}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <IdentitiesCard
                    identities={claim.identities}
                    title={detailCopy.identities}
                  />
                  <IdentitiesCard
                    emptyText={detailCopy.noNetworkHistory}
                    identities={claim.networkHistory}
                    title={detailCopy.networkHistory}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <RelatedDevicesCard devices={claim.relatedDevices} />
                  <PaidOrdersCard orders={claim.paidOrders} />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <LedgerCard entries={claim.ledgerEntries} />
                  <JobsCard jobs={claim.recentJobs} />
                </div>
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
  value: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1 p-3 pb-1 sm:p-4 sm:pb-2">
        <CardDescription className="text-xs leading-tight">
          {props.label}
        </CardDescription>
        <CardTitle className="text-xl sm:text-2xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 text-xs leading-snug text-muted-foreground sm:px-4 sm:pb-4">
        {props.subLabel}
      </CardContent>
    </Card>
  );
}

function InfoBlock(props: {
  icon: typeof MailIcon;
  label: string;
  value: ReactNode;
}) {
  const Icon = props.icon;

  return (
    <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-md border bg-muted/20 p-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
          {props.label}
        </div>
        <div className="mt-1 font-medium break-all text-foreground">
          {props.value}
        </div>
      </div>
    </div>
  );
}

function IdentitiesCard(props: {
  emptyText?: string;
  identities: IdentityItem[];
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>
          {formatCount(props.identities.length)} captured signals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataList>
          {!props.identities.length ? (
            <DataListEmptyState>
              {props.emptyText ?? detailCopy.noIdentities}
            </DataListEmptyState>
          ) : (
            props.identities.map((identity) => (
              <DataListRow key={identity.id}>
                <DataListCell>
                  <DataListText className="font-medium">
                    {humanizeToken(identity.kind)}
                  </DataListText>
                  <DataListText className="text-xs break-all text-muted-foreground">
                    {maskIdentityValue(identity)}
                  </DataListText>
                </DataListCell>
                <DataListCell className="flex-[0.55] max-md:hidden">
                  <DataListTextHeader>{detailCopy.created}</DataListTextHeader>
                  <DataListText className="text-xs">
                    {formatDateTime(identity.createdAt)}
                  </DataListText>
                </DataListCell>
              </DataListRow>
            ))
          )}
        </DataList>
      </CardContent>
    </Card>
  );
}

function RelatedDevicesCard(props: { devices: RelatedDeviceItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{detailCopy.relatedDevices}</CardTitle>
        <CardDescription>
          {formatCount(props.devices.length)} installs linked by install or IP
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataList>
          {!props.devices.length ? (
            <DataListEmptyState>{detailCopy.noDevice}</DataListEmptyState>
          ) : (
            props.devices.map((device) => (
              <DataListRow key={device.id} withHover>
                <DataListCell>
                  <DataListText className="font-medium">
                    <Link params={{ id: device.id }} to="/manager/devices/$id">
                      {device.installationId}
                      <span className="absolute inset-0" />
                    </Link>
                  </DataListText>
                  <DataListText className="text-xs text-muted-foreground">
                    {device.lastIpAddress ?? detailCopy.noIp}
                  </DataListText>
                </DataListCell>
                <DataListCell className="flex-[0.55]">
                  <DataListTextHeader>{detailCopy.status}</DataListTextHeader>
                  <Badge variant={getGenericStatusBadgeVariant(device.status)}>
                    {device.status}
                  </Badge>
                </DataListCell>
                <DataListCell className="max-md:hidden">
                  <DataListTextHeader>{detailCopy.lastSeen}</DataListTextHeader>
                  <DataListText className="text-xs">
                    {device.lastSeenAt
                      ? dayjs(device.lastSeenAt).fromNow()
                      : 'Never'}
                  </DataListText>
                </DataListCell>
              </DataListRow>
            ))
          )}
        </DataList>
      </CardContent>
    </Card>
  );
}

function PaidOrdersCard(props: { orders: FreeTrialDetail['paidOrders'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{detailCopy.paidOrders}</CardTitle>
        <CardDescription>
          {formatCount(props.orders.length)} paid orders after the trial
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataList>
          {!props.orders.length ? (
            <DataListEmptyState>{detailCopy.noOrders}</DataListEmptyState>
          ) : (
            props.orders.map((order) => (
              <DataListRow key={order.id}>
                <DataListCell>
                  <DataListText className="font-medium">
                    {formatMoney(order.amountTotalCents, order.currency)}
                  </DataListText>
                  <DataListText className="text-xs text-muted-foreground">
                    {order.payerEmail ?? 'No payer email'}
                  </DataListText>
                </DataListCell>
                <DataListCell className="flex-[0.6]">
                  <DataListTextHeader>{detailCopy.status}</DataListTextHeader>
                  <Badge variant={getGenericStatusBadgeVariant(order.status)}>
                    {order.status}
                  </Badge>
                </DataListCell>
                <DataListCell className="max-md:hidden">
                  <DataListTextHeader>
                    {detailCopy.billingEnds}
                  </DataListTextHeader>
                  <DataListText className="text-xs">
                    {order.billingPeriodEnd
                      ? formatDateTime(order.billingPeriodEnd)
                      : 'One-time'}
                  </DataListText>
                </DataListCell>
              </DataListRow>
            ))
          )}
        </DataList>
      </CardContent>
    </Card>
  );
}

function LedgerCard(props: { entries: FreeTrialDetail['ledgerEntries'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{detailCopy.ledger}</CardTitle>
        <CardDescription>
          {formatCount(props.entries.length)} recent ledger entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataList>
          {!props.entries.length ? (
            <DataListEmptyState>{detailCopy.noLedger}</DataListEmptyState>
          ) : (
            props.entries.map((entry) => (
              <DataListRow key={entry.id}>
                <DataListCell>
                  <DataListText className="font-medium">
                    {humanizeToken(entry.type)}
                  </DataListText>
                  <DataListText className="text-xs text-muted-foreground">
                    {entry.description ?? formatDateTime(entry.createdAt)}
                  </DataListText>
                </DataListCell>
                <DataListCell className="flex-[0.45]">
                  <DataListTextHeader>Delta</DataListTextHeader>
                  <DataListText
                    className={
                      entry.deltaTokens >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }
                  >
                    {entry.deltaTokens >= 0 ? '+' : ''}
                    {formatCount(entry.deltaTokens)}
                  </DataListText>
                </DataListCell>
                <DataListCell className="flex-[0.55]">
                  <DataListTextHeader>{detailCopy.status}</DataListTextHeader>
                  <Badge variant={getGenericStatusBadgeVariant(entry.status)}>
                    {entry.status}
                  </Badge>
                </DataListCell>
              </DataListRow>
            ))
          )}
        </DataList>
      </CardContent>
    </Card>
  );
}

function JobsCard(props: { jobs: FreeTrialDetail['recentJobs'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{detailCopy.recentJobs}</CardTitle>
        <CardDescription>
          {formatCount(props.jobs.length)} recent translation jobs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataList>
          {!props.jobs.length ? (
            <DataListEmptyState>{detailCopy.noJobs}</DataListEmptyState>
          ) : (
            props.jobs.map((job) => (
              <DataListRow key={job.id}>
                <DataListCell>
                  <DataListText className="font-medium">
                    {job.targetLanguage}
                  </DataListText>
                  <DataListText className="text-xs text-muted-foreground">
                    {formatDateTime(job.createdAt)}
                  </DataListText>
                </DataListCell>
                <DataListCell className="flex-[0.45]">
                  <DataListTextHeader>Pages</DataListTextHeader>
                  <DataListText className="text-xs">
                    {formatCount(job.pageCount)}
                  </DataListText>
                </DataListCell>
                <DataListCell className="flex-[0.55]">
                  <DataListTextHeader>{detailCopy.status}</DataListTextHeader>
                  <Badge variant={getGenericStatusBadgeVariant(job.status)}>
                    {job.status}
                  </Badge>
                </DataListCell>
              </DataListRow>
            ))
          )}
        </DataList>
      </CardContent>
    </Card>
  );
}

function maskIdentityValue(identity: IdentityItem) {
  if (identity.kind === 'email') {
    return identity.value;
  }

  if (identity.kind === 'ip_address') {
    return identity.value;
  }

  return truncateMiddle(identity.value, 34);
}

function getGenericStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
    case 'paid':
    case 'posted':
    case 'completed':
    case 'redeemed':
      return 'positive' as const;
    case 'pending':
    case 'queued':
    case 'processing':
    case 'created':
    case 'awaiting_upload':
      return 'warning' as const;
    case 'blocked':
    case 'canceled':
    case 'expired':
    case 'failed':
    case 'refunded':
    case 'revoked':
    case 'voided':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}

function humanizeToken(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}
