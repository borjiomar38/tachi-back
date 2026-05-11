import { getUiState } from '@bearstudio/ui-state';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  KeyRound,
  Languages,
  MapPinned,
  Network,
  PackageCheck,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import { type ReactNode, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListRowResults,
} from '@/components/ui/datalist';
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionDevice } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const statusFilters = [
  'all',
  'active',
  'blocked',
  'pending',
  'revoked',
] as const;

const licenseFilters = ['all', 'linked', 'unlinked'] as const;

const DEFAULT_SEARCH_FILTERS = {
  country: 'all',
  linked: 'all',
  page: 1,
  searchTerm: '',
  status: 'all',
} as const;
const PAGE_SIZE = 10;

const numberFormatter = new Intl.NumberFormat();
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const regionDisplayNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, { type: 'region' })
    : null;
const languageDisplayNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, { type: 'language' })
    : null;

const devicesCopy = {
  all: 'All',
  appVersion: 'App version',
  backofficeTitle: 'Installs',
  buildUnknown: 'Unknown build',
  clearFilters: 'Clear filters',
  country: 'Country',
  countryFilterHint: 'Countries in current results',
  countryIp: 'Country / IP',
  countryUnknown: 'Unknown country',
  empty: 'No installs found yet.',
  emptyFiltered: 'No installs match the current filters.',
  blockFreeAccessIp: 'Block free access',
  blockFreeAccessIpDescription:
    'Free-trial users from this IP will see a subscription-required message with a pricing link.',
  blockFreeAccessIpError: 'Failed to block free access for this IP.',
  blockFreeAccessIpSuccess: 'Free access blocked for this IP.',
  blockFreeAccessIpTitle: 'Block free access from this IP?',
  freeAccessBlocked: 'Free access blocked',
  geocodeUnavailable: 'No coordinates',
  installId: 'Install ID',
  ipMissing: 'No IP captured',
  ipSharedInstalls: 'installs share this IP',
  ipRelatedMails: 'Mails',
  language: 'Language',
  lastSeen: 'Last seen',
  license: 'License',
  linked: 'Linked',
  linkedShare: 'share of matched installs',
  listResults: 'Installs',
  localeMissing: 'No locale',
  mapAction: 'Open map',
  matchedInstalls: 'Matched installs',
  matchedInstallsHint: 'Total installs matching current filters',
  neverSeen: 'Never seen',
  nextPage: 'Next',
  noActiveLicense: 'No active license',
  noRedeemCode: 'No redeem code',
  noVersion: 'No version',
  page: 'Page',
  platform: 'Platform',
  platformMissing: 'Unknown platform',
  previousPage: 'Previous',
  registered: 'Registered',
  redeemCode: 'Redeem used',
  resultsOnPage: 'shown on this page',
  searchButtonLabel: 'Search installs',
  searchFieldLabel: 'Search installs',
  searchPlaceholder: 'Search install ID, locale, country, or license key',
  sharedIpInstalls: 'Shared IP installs',
  sharedIpInstallsHint: 'Visible installs sharing an IP with another install',
  showingPage: 'Showing',
  singleIpInstall: 'Only this install on IP',
  status: 'Status',
  unblockFreeAccessIp: 'Unblock IP',
  unblockFreeAccessIpDescription:
    'Free-trial access from this IP will be allowed again.',
  unblockFreeAccessIpError: 'Failed to unblock this IP.',
  unblockFreeAccessIpSuccess: 'Free access unblocked for this IP.',
  unblockFreeAccessIpTitle: 'Unblock free access from this IP?',
  unlinked: 'Unlinked',
  unlinkedShare: 'share of matched installs',
  visibleInstalls: 'Visible installs',
} as const;

type DeviceStatusFilter = (typeof statusFilters)[number];
type DeviceLicenseFilter = (typeof licenseFilters)[number];

type DeviceSearchFilter = {
  country?: string;
  linked?: DeviceLicenseFilter;
  page?: number;
  searchTerm?: string;
  status?: DeviceStatusFilter;
};

type DeviceListItem = {
  activeLicense: {
    boundAt: Date;
    id: string;
    key: string;
    ownerEmail: string | null;
    status: string;
  } | null;
  appBuild: string | null;
  appVersion: string | null;
  country: string | null;
  createdAt: Date;
  freeAccessIpBlocked: boolean;
  id: string;
  installationId: string;
  lastIpAddress: string | null;
  lastSeenAt: Date | null;
  latitude: number | null;
  locale: string | null;
  longitude: number | null;
  ownerAvatarUrl: string | null;
  platform: 'android';
  redeemedCode: {
    code: string;
    redeemedAt: Date | null;
    status: string;
  } | null;
  sameIpInstallCount: number;
  sameIpOwnerEmails: string[];
  status: 'pending' | 'active' | 'revoked' | 'blocked';
};

export const PageDevices = (props: {
  search: {
    country?: string;
    linked?: DeviceLicenseFilter;
    page?: number;
    searchTerm?: string;
    status?: DeviceStatusFilter;
  };
}) => {
  const router = useRouter();
  const country = props.search.country ?? DEFAULT_SEARCH_FILTERS.country;
  const linked = props.search.linked ?? DEFAULT_SEARCH_FILTERS.linked;
  const page = props.search.page ?? DEFAULT_SEARCH_FILTERS.page;
  const searchTerm =
    props.search.searchTerm ?? DEFAULT_SEARCH_FILTERS.searchTerm;
  const status = props.search.status ?? DEFAULT_SEARCH_FILTERS.status;
  const normalizedSearchTerm = searchTerm.trim();
  const shouldShowClearFilters =
    normalizedSearchTerm !== '' ||
    country !== DEFAULT_SEARCH_FILTERS.country ||
    status !== DEFAULT_SEARCH_FILTERS.status ||
    linked !== DEFAULT_SEARCH_FILTERS.linked;

  const goToSearch = useCallback(
    (next: DeviceSearchFilter) => {
      router.navigate({
        replace: true,
        search: {
          country: next.country ?? country,
          linked: next.linked ?? linked,
          page: next.page ?? page,
          searchTerm: next.searchTerm ?? searchTerm,
          status: next.status ?? status,
        },
        to: '.',
      });
    },
    [country, linked, page, router, searchTerm, status]
  );

  const searchInputProps = useMemo(
    () => ({
      value: searchTerm,
      onChange: (value: string) =>
        goToSearch({
          page: 1,
          searchTerm: value,
        }),
    }),
    [goToSearch, searchTerm]
  );

  const devicesQuery = useQuery(
    orpc.device.list.queryOptions({
      input: {
        limit: PAGE_SIZE,
        country,
        linked,
        page,
        searchTerm: normalizedSearchTerm,
        status,
      },
    })
  );
  const countryOptionsQuery = useQuery(
    orpc.device.list.queryOptions({
      input: {
        country: DEFAULT_SEARCH_FILTERS.country,
        limit: 100,
        linked,
        searchTerm: normalizedSearchTerm,
        status,
      },
    })
  );
  const countryFilters = useMemo(
    () =>
      getCountryFilterItems(
        countryOptionsQuery.data?.items ?? devicesQuery.data?.items ?? [],
        country
      ),
    [country, countryOptionsQuery.data?.items, devicesQuery.data?.items]
  );
  const { refetch: refetchDevices } = devicesQuery;
  const { refetch: refetchCountryOptions } = countryOptionsQuery;
  const refreshDeviceLists = useCallback(async () => {
    await Promise.all([refetchDevices(), refetchCountryOptions()]);
  }, [refetchCountryOptions, refetchDevices]);
  const blockFreeAccessIp = useMutation({
    mutationFn: async (ipAddress: string) =>
      await orpc.device.blockFreeAccessIp.call({
        ipAddress,
      }),
    onSuccess: async () => {
      toast.success(devicesCopy.blockFreeAccessIpSuccess);
      await refreshDeviceLists();
    },
    onError: () => {
      toast.error(devicesCopy.blockFreeAccessIpError);
    },
  });
  const unblockFreeAccessIp = useMutation({
    mutationFn: async (ipAddress: string) =>
      await orpc.device.unblockFreeAccessIp.call({
        ipAddress,
      }),
    onSuccess: async () => {
      toast.success(devicesCopy.unblockFreeAccessIpSuccess);
      await refreshDeviceLists();
    },
    onError: () => {
      toast.error(devicesCopy.unblockFreeAccessIpError);
    },
  });
  const {
    isPending: isBlockingFreeAccessIp,
    mutate: blockFreeAccessIpMutate,
    variables: blockingIpAddress,
  } = blockFreeAccessIp;
  const {
    isPending: isUnblockingFreeAccessIp,
    mutate: unblockFreeAccessIpMutate,
    variables: unblockingIpAddress,
  } = unblockFreeAccessIp;
  const pendingIpAddress = isBlockingFreeAccessIp
    ? blockingIpAddress
    : isUnblockingFreeAccessIp
      ? unblockingIpAddress
      : null;

  const toggleFreeAccessIp = useCallback(
    (device: DeviceListItem) => {
      if (!device.lastIpAddress) {
        return;
      }

      if (device.freeAccessIpBlocked) {
        unblockFreeAccessIpMutate(device.lastIpAddress);
        return;
      }

      blockFreeAccessIpMutate(device.lastIpAddress);
    },
    [blockFreeAccessIpMutate, unblockFreeAccessIpMutate]
  );

  const ui = getUiState((set) => {
    if (devicesQuery.status === 'pending') {
      return set('pending');
    }

    if (devicesQuery.status === 'error') {
      return set('error');
    }

    if (!devicesQuery.data.items.length) {
      return set(shouldShowClearFilters ? 'empty-filter' : 'empty');
    }

    return set('default', {
      devices: devicesQuery.data.items,
      linkedCount: devicesQuery.data.linkedCount,
      total: devicesQuery.data.total,
      unlinkedCount: devicesQuery.data.unlinkedCount,
    });
  });

  return (
    <GuardPermissions permissions={[permissionDevice.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>
            {devicesCopy.backofficeTitle}
          </PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            aria-label={devicesCopy.searchButtonLabel}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...searchInputProps}
            aria-label={devicesCopy.searchFieldLabel}
            className="max-w-sm max-md:hidden"
            placeholder={devicesCopy.searchPlaceholder}
            size="sm"
          />
          <Button
            aria-label={devicesCopy.mapAction}
            className="ml-2 shrink-0"
            onClick={() =>
              router.navigate({
                replace: true,
                search: {
                  country,
                  linked,
                  searchTerm,
                  status,
                },
                to: '/manager/devices/map',
              })
            }
            size="sm"
            variant="secondary"
          >
            <MapPinned className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">{devicesCopy.mapAction}</span>
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
                <DataListErrorState retry={() => devicesQuery.refetch()} />
              </DataList>
            ))
            .match('empty', () => (
              <DataList>
                <DataListEmptyState>{devicesCopy.empty}</DataListEmptyState>
              </DataList>
            ))
            .match('empty-filter', () => (
              <DataList>
                <DataListEmptyState>
                  {devicesCopy.emptyFiltered}
                </DataListEmptyState>
              </DataList>
            ))
            .match(
              'default',
              ({
                devices,
                linkedCount,
                total,
                unlinkedCount,
              }: {
                devices: DeviceListItem[];
                linkedCount: number;
                total: number;
                unlinkedCount: number;
              }) => {
                const linkedRate =
                  total > 0 ? Math.round((linkedCount / total) * 100) : 0;
                const unlinkedRate =
                  total > 0 ? Math.round((unlinkedCount / total) * 100) : 0;
                const repeatedIpInstallCount = devices.filter(
                  (device) => device.sameIpInstallCount > 1
                ).length;
                const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
                const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
                const pageEnd = Math.min(total, pageStart + devices.length - 1);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
                      <SummaryCard
                        label={devicesCopy.visibleInstalls}
                        subLabel={`${formatCount(devices.length)} ${devicesCopy.resultsOnPage}`}
                        value={formatCount(devices.length)}
                      />
                      <SummaryCard
                        label={devicesCopy.matchedInstalls}
                        subLabel={devicesCopy.matchedInstallsHint}
                        value={formatCount(total)}
                      />
                      <SummaryCard
                        label={devicesCopy.linked}
                        subLabel={`${linkedRate}% ${devicesCopy.linkedShare}`}
                        value={formatCount(linkedCount)}
                      />
                      <SummaryCard
                        label={devicesCopy.unlinked}
                        subLabel={`${unlinkedRate}% ${devicesCopy.unlinkedShare}`}
                        value={formatCount(unlinkedCount)}
                      />
                      <SummaryCard
                        label={devicesCopy.sharedIpInstalls}
                        subLabel={devicesCopy.sharedIpInstallsHint}
                        value={formatCount(repeatedIpInstallCount)}
                      />
                    </div>

                    <div className="space-y-3 rounded-md border bg-card p-3 sm:p-4">
                      <FilterPillGroup
                        items={statusFilters}
                        label={devicesCopy.status}
                        onSelect={(item) =>
                          goToSearch({
                            page: 1,
                            status: item as DeviceStatusFilter,
                          })
                        }
                        selected={status}
                      />
                      <FilterPillGroup
                        items={licenseFilters}
                        label={devicesCopy.license}
                        onSelect={(item) =>
                          goToSearch({
                            linked: item as DeviceLicenseFilter,
                            page: 1,
                          })
                        }
                        selected={linked}
                      />
                      <FilterPillGroup
                        getItemLabel={(item) =>
                          item === DEFAULT_SEARCH_FILTERS.country
                            ? devicesCopy.all
                            : getCountryLabel(item)
                        }
                        items={countryFilters}
                        label={devicesCopy.country}
                        onSelect={(item) =>
                          goToSearch({
                            country: item,
                            page: 1,
                          })
                        }
                        selected={country}
                      />
                    </div>

                    <DataList>
                      <DataListRowResults
                        onClear={() => goToSearch(DEFAULT_SEARCH_FILTERS)}
                        withClearButton={shouldShowClearFilters}
                      >
                        {devicesCopy.listResults} ({formatCount(pageStart)}-
                        {formatCount(pageEnd)}/{formatCount(total)})
                      </DataListRowResults>
                      {devices.map((device) => (
                        <DeviceRow
                          device={device}
                          isIpAccessPending={
                            pendingIpAddress === device.lastIpAddress
                          }
                          key={device.id}
                          onToggleFreeAccessIp={toggleFreeAccessIp}
                        />
                      ))}
                    </DataList>

                    <PaginationFooter
                      page={page}
                      pageCount={pageCount}
                      pageEnd={pageEnd}
                      pageStart={pageStart}
                      total={total}
                      onPageChange={(nextPage) =>
                        goToSearch({
                          page: nextPage,
                        })
                      }
                    />
                  </div>
                );
              }
            )
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function DeviceRow(props: {
  device: DeviceListItem;
  isIpAccessPending: boolean;
  onToggleFreeAccessIp: (device: DeviceListItem) => void;
}) {
  const { device } = props;

  return (
    <DataListRow
      className="grid grid-cols-1 px-0 py-0 md:grid-cols-[minmax(260px,1.25fr)_minmax(160px,0.7fr)_minmax(210px,0.95fr)_minmax(210px,0.9fr)]"
      withHover
    >
      <DeviceColumn className="gap-3 md:border-r">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="mt-0.5 size-10">
            <AvatarImage
              alt={device.installationId}
              src={device.ownerAvatarUrl ?? undefined}
            />
            <AvatarFallback>
              {initialsFromInstallation(device.installationId)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
              {devicesCopy.installId}
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <Link
                className="min-w-0 flex-1 text-sm leading-5 font-semibold break-all text-foreground hover:underline md:truncate md:break-normal"
                params={{ id: device.id }}
                to="/manager/devices/$id"
              >
                {device.installationId}
              </Link>
              <Badge
                className="mt-0.5 md:hidden"
                variant={getStatusBadgeVariant(device.status)}
              >
                {humanizeToken(device.status)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <InfoPill
                icon={Smartphone}
                label={devicesCopy.platform}
                value={getPlatformLabel(device.platform)}
              />
              <InfoPill
                icon={Languages}
                label={devicesCopy.language}
                value={getLanguageLabel(device.locale)}
              />
              <InfoPill
                icon={Globe2}
                label={devicesCopy.country}
                value={getCountryLabel(device.country)}
              />
            </div>
          </div>
        </div>
      </DeviceColumn>

      <DeviceColumn className="md:border-r">
        <div className="hidden md:block">
          <MetaBlock
            icon={Clock3}
            label={devicesCopy.status}
            value={
              <Badge variant={getStatusBadgeVariant(device.status)}>
                {humanizeToken(device.status)}
              </Badge>
            }
            helper={formatRelative(device.lastSeenAt)}
          />
        </div>
        <MetaBlock
          icon={Clock3}
          label={devicesCopy.lastSeen}
          value={formatRelative(device.lastSeenAt)}
          helper={device.lastSeenAt ? formatDateTime(device.lastSeenAt) : null}
        />
      </DeviceColumn>

      <DeviceColumn className="md:border-r">
        <MetaBlock
          icon={KeyRound}
          label={devicesCopy.license}
          value={
            device.activeLicense ? (
              <Link
                className="font-medium break-all text-foreground hover:underline"
                params={{ key: device.activeLicense.key }}
                to="/manager/licenses/$key"
              >
                {device.activeLicense.key}
              </Link>
            ) : (
              devicesCopy.noActiveLicense
            )
          }
          helper={getLicenseHelper(device.activeLicense)}
        />
        <MetaBlock
          icon={PackageCheck}
          label={devicesCopy.redeemCode}
          value={device.redeemedCode?.code ?? devicesCopy.noRedeemCode}
          helper={getRedeemCodeHelper(device.redeemedCode)}
        />
      </DeviceColumn>

      <DeviceColumn>
        <MetaBlock
          icon={Network}
          label={devicesCopy.countryIp}
          value={getCountryLabel(device.country)}
          helper={
            <IpAccessSummary
              device={device}
              isPending={props.isIpAccessPending}
              onToggleFreeAccessIp={props.onToggleFreeAccessIp}
            />
          }
        />
        <MetaBlock
          icon={PackageCheck}
          label={devicesCopy.appVersion}
          value={device.appVersion ?? devicesCopy.noVersion}
          helper={
            device.appBuild
              ? `Build ${device.appBuild}`
              : devicesCopy.buildUnknown
          }
        />
      </DeviceColumn>
    </DataListRow>
  );
}

function IpAccessSummary(props: {
  device: DeviceListItem;
  isPending: boolean;
  onToggleFreeAccessIp: (device: DeviceListItem) => void;
}) {
  const { device } = props;

  if (!device.lastIpAddress) {
    return devicesCopy.ipMissing;
  }

  const isBlocked = device.freeAccessIpBlocked;

  return (
    <div className="space-y-2">
      <div>{getIpSummary(device)}</div>
      <div className="flex flex-wrap items-center gap-2">
        {isBlocked ? (
          <Badge size="sm" variant="negative">
            {devicesCopy.freeAccessBlocked}
          </Badge>
        ) : null}
        <WithPermissions permissions={[permissionDevice.revoke]}>
          <ConfirmResponsiveDrawer
            confirmText={
              isBlocked
                ? devicesCopy.unblockFreeAccessIp
                : devicesCopy.blockFreeAccessIp
            }
            confirmVariant={isBlocked ? 'default' : 'destructive'}
            description={
              isBlocked
                ? devicesCopy.unblockFreeAccessIpDescription
                : `${devicesCopy.blockFreeAccessIpDescription} ${formatCount(device.sameIpInstallCount)} installs currently share this IP.`
            }
            onConfirm={() => props.onToggleFreeAccessIp(device)}
            title={
              isBlocked
                ? devicesCopy.unblockFreeAccessIpTitle
                : devicesCopy.blockFreeAccessIpTitle
            }
          >
            <Button
              loading={props.isPending}
              size="xs"
              variant={isBlocked ? 'secondary' : 'destructive-secondary'}
            >
              {isBlocked ? (
                <ShieldCheck className="size-3" />
              ) : (
                <ShieldOff className="size-3" />
              )}
              {isBlocked
                ? devicesCopy.unblockFreeAccessIp
                : devicesCopy.blockFreeAccessIp}
            </Button>
          </ConfirmResponsiveDrawer>
        </WithPermissions>
      </div>
    </div>
  );
}

function PaginationFooter(props: {
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
  pageEnd: number;
  pageStart: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {devicesCopy.showingPage} {formatCount(props.pageStart)}-
        {formatCount(props.pageEnd)} / {formatCount(props.total)} ·{' '}
        {devicesCopy.page} {formatCount(props.page)} /{' '}
        {formatCount(props.pageCount)}
      </div>
      <div className="flex items-center gap-2">
        <Button
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
          size="sm"
          variant="secondary"
        >
          <ChevronLeft className="size-4" />
          {devicesCopy.previousPage}
        </Button>
        <Button
          disabled={props.page >= props.pageCount}
          onClick={() =>
            props.onPageChange(Math.min(props.pageCount, props.page + 1))
          }
          size="sm"
          variant="secondary"
        >
          {devicesCopy.nextPage}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function DeviceColumn(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 border-b p-3 last:border-b-0 md:border-b-0 md:p-4',
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

function InfoPill(props: {
  icon: typeof Smartphone;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <span
      className="inline-flex h-6 max-w-full min-w-0 items-center gap-1 rounded-sm bg-muted px-2 text-xs text-muted-foreground"
      title={`${props.label}: ${props.value}`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="shrink-0 font-medium">{props.label}:</span>
      <span className="truncate">{props.value}</span>
    </span>
  );
}

function MetaBlock(props: {
  helper?: ReactNode;
  icon: typeof Smartphone;
  label: string;
  value: ReactNode;
}) {
  const Icon = props.icon;

  return (
    <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 gap-y-1">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
          {props.label}
        </div>
        <div className="mt-0.5 min-w-0 text-sm leading-5 font-medium break-words text-foreground">
          {props.value}
        </div>
        {props.helper ? (
          <div className="mt-0.5 min-w-0 text-xs leading-5 break-words text-muted-foreground">
            {props.helper}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterPillGroup(props: {
  getItemLabel?: (item: string) => string;
  items: readonly string[];
  label: string;
  onSelect: (item: string) => void;
  selected: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {props.label}
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={props.label}
      >
        {props.items.map((item) => {
          const label = props.getItemLabel?.(item) ?? getFilterLabel(item);

          return (
            <Button
              aria-pressed={props.selected === item}
              key={item}
              onClick={() => props.onSelect(item)}
              size="xs"
              variant={props.selected === item ? 'default' : 'secondary'}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function getCountryFilterItems(
  devices: Array<{ country?: string | null }>,
  selected: string
) {
  const countryItems = new Map<string, string>();

  for (const device of devices) {
    if (!device.country) {
      continue;
    }

    const key = getCountryOptionKey(device.country);
    if (!countryItems.has(key)) {
      countryItems.set(key, device.country);
    }
  }

  if (selected !== DEFAULT_SEARCH_FILTERS.country) {
    countryItems.set(getCountryOptionKey(selected), selected);
  }

  return [DEFAULT_SEARCH_FILTERS.country, ...countryItems.values()];
}

function getCountryOptionKey(country: string) {
  return getCountryLabel(country).toLowerCase();
}

function SummaryCard(props: {
  label: string;
  subLabel: string;
  value: string;
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

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

function formatRelative(date: Date | null) {
  if (!date) {
    return devicesCopy.neverSeen;
  }

  return dayjs(date).fromNow();
}

function getCountryLabel(country: string | null) {
  if (!country) {
    return devicesCopy.countryUnknown;
  }

  const normalized = country.trim();
  if (normalized.length === 2) {
    return (
      regionDisplayNames?.of(normalized.toUpperCase()) ??
      normalized.toUpperCase()
    );
  }

  return humanizeToken(normalized);
}

function getFilterLabel(value: string) {
  if (value === 'linked') {
    return devicesCopy.linked;
  }

  if (value === 'unlinked') {
    return devicesCopy.unlinked;
  }

  if (value === 'all') {
    return devicesCopy.all;
  }

  return humanizeToken(value);
}

function getPlatformLabel(platform: string | null) {
  if (!platform) {
    return devicesCopy.platformMissing;
  }

  return humanizeToken(platform);
}

function getLanguageLabel(locale: string | null) {
  if (!locale) {
    return devicesCopy.localeMissing;
  }

  const normalized = locale.replace(/_/g, '-');
  const languageCode = normalized.split('-').at(0);
  const languageName = languageCode
    ? (languageDisplayNames?.of(languageCode) ?? languageCode.toUpperCase())
    : devicesCopy.localeMissing;

  return `${languageName} (${normalized})`;
}

function getIpSummary(device: DeviceListItem) {
  if (!device.lastIpAddress) {
    return devicesCopy.ipMissing;
  }

  const installCount = device.sameIpInstallCount;
  const countLabel =
    installCount > 1
      ? `${formatCount(installCount)} ${devicesCopy.ipSharedInstalls}`
      : devicesCopy.singleIpInstall;

  if (installCount <= 1 || device.sameIpOwnerEmails.length === 0) {
    return `${device.lastIpAddress} · ${countLabel}`;
  }

  const visibleEmails = device.sameIpOwnerEmails.slice(0, 5);
  const hiddenEmailCount =
    device.sameIpOwnerEmails.length - visibleEmails.length;

  return (
    <span className="space-y-1">
      <span className="block">
        {device.lastIpAddress} · {countLabel}
      </span>
      <span className="block">
        {devicesCopy.ipRelatedMails}:{' '}
        {visibleEmails.map((email, index) => (
          <span key={email}>
            {index > 0 ? ', ' : ''}
            {email}
          </span>
        ))}
        {hiddenEmailCount > 0 ? `, +${formatCount(hiddenEmailCount)}` : null}
      </span>
    </span>
  );
}

function getLicenseHelper(activeLicense: DeviceListItem['activeLicense']) {
  if (!activeLicense) {
    return null;
  }

  const owner = activeLicense.ownerEmail ?? devicesCopy.noActiveLicense;
  return `Bound ${dayjs(activeLicense.boundAt).fromNow()} · ${owner}`;
}

function getRedeemCodeHelper(redeemedCode: DeviceListItem['redeemedCode']) {
  if (!redeemedCode) {
    return null;
  }

  const redeemedAt = redeemedCode.redeemedAt
    ? dayjs(redeemedCode.redeemedAt).fromNow()
    : devicesCopy.neverSeen;

  return `${humanizeToken(redeemedCode.status)} · ${redeemedAt}`;
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

function humanizeToken(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function initialsFromInstallation(installationId: string) {
  return installationId
    .split('-')
    .map((part) => part.slice(0, 1).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}
