import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import {
  ActivityIcon,
  AlertTriangleIcon,
  BadgeCheckIcon,
  CalendarClockIcon,
  DownloadIcon,
  ExternalLinkIcon,
  HistoryIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { type ComponentProps, type ReactNode } from 'react';

import { orpc } from '@/lib/orpc/client';
import type { Outputs } from '@/lib/orpc/types';
import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DataListRowResults,
} from '@/components/ui/datalist';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionDevice } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

type VersionSummary = Outputs['device']['getVersionSummary'];
type InstalledVersion = VersionSummary['versions'][number];
type VersionSupportStatus = InstalledVersion['status'];

const numberFormatter = new Intl.NumberFormat();
const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
  style: 'percent',
});
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const versionCopy = {
  activeInstalls: 'Active installs',
  activeInstallsHint: 'Seen during the last 30 days',
  appBuild: 'Build',
  appVersion: 'App version',
  checkedAt: 'Checked',
  currentPolicy: 'Current update policy',
  currentPolicyDescription:
    'Public Android update policy consumed by the mobile app.',
  empty: 'No installed app versions have been reported yet.',
  firstSeen: 'First seen',
  forceUpdate: 'Force update',
  generatedAt: 'Generated',
  installHistory: 'Installed version history',
  installHistoryDescription:
    'Grouped by version name and Android version code from install records.',
  installs: 'Installs',
  latestInstalls: 'On latest',
  latestInstallsHint: 'Installs already on the policy latest version',
  latestVersion: 'Latest version',
  linkedInstalls: 'Linked installs',
  minimumSupported: 'Minimum supported',
  neverSeen: 'Never seen',
  noMinimum: 'No minimum',
  noVersion: 'Unknown version',
  openRelease: 'Open release',
  openUpdate: 'Open update',
  outdatedInstalls: 'Need update',
  outdatedInstallsHint: 'Outdated or below minimum support',
  policyMessage: 'Policy message',
  releaseUrl: 'Release URL',
  reviewInstalls: 'Review installs',
  status: 'Status',
  totalInstalls: 'Total installs',
  unknown: 'Unknown',
  updateUrl: 'Update URL',
  unsupportedInstalls: 'Unsupported',
  versionHistoryTitle: 'Updates & Version History',
  versionsTracked: 'Versions tracked',
} as const;

const statusLabelByStatus: Record<VersionSupportStatus, string> = {
  ahead: 'Ahead',
  latest: 'Latest',
  outdated: 'Outdated',
  supported: 'Supported',
  unknown: 'Unknown',
  unsupported: 'Unsupported',
};

const statusBadgeVariantByStatus = {
  ahead: 'secondary',
  latest: 'positive',
  outdated: 'warning',
  supported: 'brand',
  unknown: 'secondary',
  unsupported: 'negative',
} as const satisfies Record<
  VersionSupportStatus,
  ComponentProps<typeof Badge>['variant']
>;

const meterWidthClassByBucket = {
  0: 'w-0',
  1: 'w-[8.333%]',
  2: 'w-[16.666%]',
  3: 'w-1/4',
  4: 'w-1/3',
  5: 'w-[41.666%]',
  6: 'w-1/2',
  7: 'w-[58.333%]',
  8: 'w-2/3',
  9: 'w-3/4',
  10: 'w-[83.333%]',
  11: 'w-[91.666%]',
  12: 'w-full',
} as const;

export const PageVersionHistory = () => {
  const versionSummaryQuery = useQuery(
    orpc.device.getVersionSummary.queryOptions()
  );

  const ui = getUiState((set) => {
    if (versionSummaryQuery.status === 'pending') {
      return set('pending');
    }

    if (versionSummaryQuery.status === 'error') {
      return set('error');
    }

    if (!versionSummaryQuery.data.versions.length) {
      return set('empty', {
        summary: versionSummaryQuery.data,
      });
    }

    return set('default', {
      summary: versionSummaryQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionDevice.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>
            {versionCopy.versionHistoryTitle}
          </PageLayoutTopBarTitle>
          <Button
            loading={versionSummaryQuery.isFetching}
            onClick={() => void versionSummaryQuery.refetch()}
            size="sm"
            variant="secondary"
          >
            <RefreshCwIcon />
            Refresh
          </Button>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl pb-8">
          {ui
            .match('pending', () => (
              <DataList>
                <DataListLoadingState />
              </DataList>
            ))
            .match('error', () => (
              <DataList>
                <DataListErrorState
                  retry={() => void versionSummaryQuery.refetch()}
                />
              </DataList>
            ))
            .match('empty', ({ summary }) => (
              <div className="space-y-4">
                <PolicyCard summary={summary} />
                <DataList>
                  <DataListEmptyState>{versionCopy.empty}</DataListEmptyState>
                </DataList>
              </div>
            ))
            .match('default', ({ summary }) => (
              <VersionHistoryContent summary={summary} />
            ))
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function VersionHistoryContent(props: { summary: VersionSummary }) {
  const { summary } = props;

  return (
    <div className="space-y-4">
      <PolicyCard summary={summary} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <SummaryCard
          icon={SmartphoneIcon}
          label={versionCopy.totalInstalls}
          value={formatCount(summary.stats.totalInstallCount)}
        />
        <SummaryCard
          helper={versionCopy.activeInstallsHint}
          icon={ActivityIcon}
          label={versionCopy.activeInstalls}
          value={formatCount(summary.stats.activeInstallCount)}
        />
        <SummaryCard
          helper={versionCopy.latestInstallsHint}
          icon={BadgeCheckIcon}
          label={versionCopy.latestInstalls}
          value={formatCount(summary.stats.latestInstallCount)}
        />
        <SummaryCard
          helper={versionCopy.outdatedInstallsHint}
          icon={AlertTriangleIcon}
          label={versionCopy.outdatedInstalls}
          value={formatCount(summary.stats.outdatedInstallCount)}
        />
        <SummaryCard
          icon={ShieldAlertIcon}
          label={versionCopy.unsupportedInstalls}
          value={formatCount(summary.stats.unsupportedInstallCount)}
        />
        <SummaryCard
          icon={HistoryIcon}
          label={versionCopy.versionsTracked}
          value={formatCount(summary.stats.versionCount)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <VersionDistributionCard summary={summary} />
        <VersionHistoryList summary={summary} />
      </div>
    </div>
  );
}

function PolicyCard(props: { summary: VersionSummary }) {
  const { policy, generatedAt } = props.summary;
  const latestVersionLabel = policy.latestVersionName
    ? `${policy.latestVersionName} (${policy.latestVersionCode})`
    : formatBuild(policy.latestVersionCode);
  const minimumSupportedLabel =
    policy.minimumSupportedVersionCode > 0
      ? formatBuild(policy.minimumSupportedVersionCode)
      : versionCopy.noMinimum;

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{versionCopy.currentPolicy}</CardTitle>
            <CardDescription>
              {versionCopy.currentPolicyDescription}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              render={
                <a
                  href={policy.updateUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                />
              }
              size="sm"
              variant="secondary"
            >
              <DownloadIcon />
              {versionCopy.openUpdate}
            </Button>
            <Button
              render={
                <a
                  href={policy.releaseUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                />
              }
              size="sm"
              variant="secondary"
            >
              <ExternalLinkIcon />
              {versionCopy.openRelease}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PolicyItem
          label={versionCopy.latestVersion}
          value={latestVersionLabel}
        />
        <PolicyItem
          label={versionCopy.minimumSupported}
          value={minimumSupportedLabel}
        />
        <PolicyItem
          label={versionCopy.forceUpdate}
          value={policy.forceUpdate ? 'Enabled' : 'Disabled'}
        />
        <PolicyItem
          label={versionCopy.checkedAt}
          value={formatPolicyTimestamp(policy.checkedAt)}
        />
        <PolicyItem
          className="md:col-span-2"
          label={versionCopy.policyMessage}
          value={policy.message}
        />
        <PolicyItem
          label={versionCopy.generatedAt}
          value={formatDateTime(generatedAt)}
        />
      </CardContent>
    </Card>
  );
}

function PolicyItem(props: {
  className?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-md border bg-background p-3',
        props.className
      )}
    >
      <div className="text-xs font-medium text-muted-foreground">
        {props.label}
      </div>
      <div className="mt-1 min-w-0 text-sm font-medium break-words">
        {props.value}
      </div>
    </div>
  );
}

function SummaryCard(props: {
  helper?: string;
  icon: typeof SmartphoneIcon;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <Card>
      <CardContent className="flex min-h-28 flex-col justify-between gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs font-medium text-muted-foreground">
            {props.label}
          </div>
          <Icon className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">
            {props.value}
          </div>
          {!!props.helper && (
            <div className="mt-1 text-xs text-muted-foreground">
              {props.helper}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VersionDistributionCard(props: { summary: VersionSummary }) {
  const { summary } = props;
  const versions = summary.versions.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version distribution</CardTitle>
        <CardDescription>
          Top installed versions by install count.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions.map((version) => {
          const share = getShare(
            version.installCount,
            summary.stats.totalInstallCount
          );

          return (
            <div className="space-y-1.5" key={getVersionKey(version)}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 truncate font-medium">
                  {getVersionLabel(version)}
                </div>
                <div className="shrink-0 text-muted-foreground tabular-nums">
                  {formatPercentage(share)}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full bg-primary',
                    getMeterWidthClass(share)
                  )}
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{formatCount(version.installCount)} installs</span>
                <StatusBadge status={version.status} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function VersionHistoryList(props: { summary: VersionSummary }) {
  const { summary } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{versionCopy.installHistory}</CardTitle>
        <CardDescription>
          {versionCopy.installHistoryDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataList>
          <DataListRowResults>
            {summary.versions.length} versions grouped from{' '}
            {formatCount(summary.stats.totalInstallCount)} installs
          </DataListRowResults>
          {summary.versions.map((version) => (
            <VersionRow
              key={getVersionKey(version)}
              totalInstallCount={summary.stats.totalInstallCount}
              version={version}
            />
          ))}
        </DataList>
      </CardContent>
    </Card>
  );
}

function VersionRow(props: {
  totalInstallCount: number;
  version: InstalledVersion;
}) {
  const { totalInstallCount, version } = props;
  const searchTerm = version.appBuild ?? version.appVersion ?? '';

  return (
    <DataListRow
      className="grid grid-cols-1 px-0 py-0 lg:grid-cols-[minmax(190px,0.9fr)_minmax(130px,0.55fr)_minmax(170px,0.7fr)_minmax(190px,0.85fr)_minmax(150px,0.55fr)]"
      withHover
    >
      <DataListCell className="gap-2 border-b p-3 lg:border-r lg:border-b-0">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <SmartphoneIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {getVersionLabel(version)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>
                {versionCopy.appBuild}:{' '}
                {version.appBuild ?? versionCopy.unknown}
              </span>
              <span>/</span>
              <span>
                {formatPercentage(
                  getShare(version.installCount, totalInstallCount)
                )}
              </span>
            </div>
          </div>
        </div>
      </DataListCell>
      <DataListCell className="gap-2 border-b p-3 lg:border-r lg:border-b-0">
        <DataListLabel>{versionCopy.status}</DataListLabel>
        <StatusBadge status={version.status} />
      </DataListCell>
      <DataListCell className="gap-1 border-b p-3 lg:border-r lg:border-b-0">
        <DataListLabel>{versionCopy.installs}</DataListLabel>
        <div className="text-sm font-semibold tabular-nums">
          {formatCount(version.installCount)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCount(version.activeInstallCount)} active /{' '}
          {formatCount(version.linkedInstallCount)} linked
        </div>
      </DataListCell>
      <DataListCell className="gap-1 border-b p-3 lg:border-r lg:border-b-0">
        <DataListLabel>{versionCopy.firstSeen}</DataListLabel>
        <DateLine date={version.firstSeenAt} />
        <DataListLabel className="mt-2">Last seen</DataListLabel>
        <DateLine date={version.lastSeenAt} fallback={versionCopy.neverSeen} />
      </DataListCell>
      <DataListCell className="items-start gap-2 p-3 lg:items-end">
        <Button
          render={
            <Link
              search={{
                country: 'all',
                linked: 'all',
                page: 1,
                searchTerm,
                status: 'all',
              }}
              to="/manager/devices"
            />
          }
          size="sm"
          variant="secondary"
        >
          <HistoryIcon />
          {versionCopy.reviewInstalls}
        </Button>
      </DataListCell>
    </DataListRow>
  );
}

function DataListLabel(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase',
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

function DateLine(props: { date: Date | null; fallback?: string }) {
  if (!props.date) {
    return (
      <div className="text-sm text-muted-foreground">
        {props.fallback ?? versionCopy.unknown}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <CalendarClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{formatDateTime(props.date)}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {dayjs(props.date).fromNow()}
      </div>
    </div>
  );
}

function StatusBadge(props: { status: VersionSupportStatus }) {
  return (
    <Badge variant={statusBadgeVariantByStatus[props.status]}>
      {statusLabelByStatus[props.status]}
    </Badge>
  );
}

function getVersionLabel(version: InstalledVersion) {
  if (!version.appVersion && !version.appBuild) {
    return versionCopy.noVersion;
  }

  if (!version.appVersion) {
    return formatBuild(version.appBuild);
  }

  if (!version.appBuild) {
    return version.appVersion;
  }

  return `${version.appVersion} (${version.appBuild})`;
}

function getVersionKey(version: InstalledVersion) {
  return `${version.appVersion ?? versionCopy.unknown}:${version.appBuild ?? versionCopy.unknown}`;
}

function getShare(count: number, total: number) {
  return total > 0 ? count / total : 0;
}

function getMeterWidthClass(share: number) {
  const bucket = Math.max(
    0,
    Math.min(12, Math.round(share * 12))
  ) as keyof typeof meterWidthClassByBucket;

  return meterWidthClassByBucket[bucket];
}

function formatBuild(build: number | string | null) {
  if (build === null || build === '') {
    return versionCopy.unknown;
  }

  return `Build ${build}`;
}

function formatCount(count: number) {
  return numberFormatter.format(count);
}

function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

function formatPercentage(value: number) {
  return percentFormatter.format(value);
}

function formatPolicyTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return formatDateTime(parsed);
}
