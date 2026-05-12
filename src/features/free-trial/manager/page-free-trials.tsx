import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import {
  BadgeDollarSignIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  FingerprintIcon,
  KeyRoundIcon,
  MailIcon,
  NetworkIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { type ReactNode, useCallback, useMemo } from 'react';

import { orpc } from '@/lib/orpc/client';
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
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListRowResults,
} from '@/components/ui/datalist';
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import {
  permissionDevice,
  permissionLicense,
} from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const PAGE_SIZE = 10;
const DEFAULT_SEARCH = {
  page: 1,
  query: '',
  status: 'all',
} as const;

const statusFilters = [
  'all',
  'active',
  'exhausted',
  'paid_converted',
  'has_ip',
  'has_fingerprint',
] as const;

const numberFormatter = new Intl.NumberFormat();
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const freeTrialCopy = {
  active: 'Active',
  all: 'All',
  clearFilters: 'Clear filters',
  created: 'Created',
  detail: 'Open claim',
  empty: 'No free-trial claims found yet.',
  emptyFiltered: 'No free-trial claims match the current filters.',
  exhausted: 'Exhausted',
  filters: 'Filters',
  fingerprint: 'Fingerprint',
  freeAccessBlocked: 'Manual IP block',
  freeTrials: 'Free trials',
  hasFingerprint: 'Has fingerprint',
  hasIp: 'Has IP',
  identities: 'Identities',
  install: 'Install',
  ipAddress: 'IP address',
  lastSeen: 'Last seen',
  license: 'License',
  listResults: 'Claims',
  matchedClaims: 'Matched claims',
  network: 'Network',
  nextPage: 'Next',
  noDevice: 'No install record',
  noFingerprint: 'No fingerprint',
  noIp: 'No IP captured',
  page: 'Page',
  paidConverted: 'Paid converted',
  previousPage: 'Previous',
  redeemCode: 'Redeem code',
  searchButtonLabel: 'Search free trials',
  searchFieldLabel: 'Search free trials',
  searchPlaceholder: 'Search email, install, IP, fingerprint, redeem, license',
  showingPage: 'Showing',
  status: 'Status',
  tokenBalance: 'Token balance',
  tokens: 'Tokens',
  trialActive: 'Trial active',
  withFingerprint: 'With fingerprint',
  withIp: 'With IP',
} as const;

type FreeTrialStatusFilter = (typeof statusFilters)[number];
type FreeTrialSearch = {
  page?: number;
  query?: string;
  status?: FreeTrialStatusFilter;
};
type FreeTrialListResponse = Awaited<
  ReturnType<typeof orpc.freeTrial.list.call>
>;
type FreeTrialListItem = FreeTrialListResponse['items'][number];

export const PageFreeTrials = (props: { search: FreeTrialSearch }) => {
  const router = useRouter();
  const page = props.search.page ?? DEFAULT_SEARCH.page;
  const query = props.search.query ?? DEFAULT_SEARCH.query;
  const status = props.search.status ?? DEFAULT_SEARCH.status;
  const normalizedQuery = query.trim();
  const shouldShowClearFilters =
    normalizedQuery !== DEFAULT_SEARCH.query ||
    status !== DEFAULT_SEARCH.status;

  const goToSearch = useCallback(
    (next: FreeTrialSearch) => {
      router.navigate({
        replace: true,
        search: {
          page: next.page ?? page,
          query: next.query ?? query,
          status: next.status ?? status,
        },
        to: '.',
      });
    },
    [page, query, router, status]
  );

  const searchInputProps = useMemo(
    () => ({
      onChange: (value: string) => goToSearch({ page: 1, query: value }),
      value: query,
    }),
    [goToSearch, query]
  );

  const freeTrialsQuery = useQuery(
    orpc.freeTrial.list.queryOptions({
      input: {
        limit: PAGE_SIZE,
        page,
        query: normalizedQuery,
        status,
      },
    })
  );

  const ui = getUiState((set) => {
    if (freeTrialsQuery.status === 'pending') {
      return set('pending');
    }

    if (freeTrialsQuery.status === 'error') {
      return set('error');
    }

    if (!freeTrialsQuery.data.items.length) {
      return set(shouldShowClearFilters ? 'empty-filter' : 'empty');
    }

    return set('default', {
      data: freeTrialsQuery.data,
    });
  });

  return (
    <GuardPermissions
      permissions={[permissionDevice.read, permissionLicense.read]}
    >
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>
            {freeTrialCopy.freeTrials}
          </PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            aria-label={freeTrialCopy.searchButtonLabel}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...searchInputProps}
            aria-label={freeTrialCopy.searchFieldLabel}
            className="max-w-md max-md:hidden"
            placeholder={freeTrialCopy.searchPlaceholder}
            size="sm"
          />
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
                <DataListErrorState retry={() => freeTrialsQuery.refetch()} />
              </DataList>
            ))
            .match('empty', () => (
              <DataList>
                <DataListEmptyState>{freeTrialCopy.empty}</DataListEmptyState>
              </DataList>
            ))
            .match('empty-filter', () => (
              <DataList>
                <DataListEmptyState>
                  {freeTrialCopy.emptyFiltered}
                </DataListEmptyState>
              </DataList>
            ))
            .match('default', ({ data }: { data: FreeTrialListResponse }) => {
              const pageStart =
                data.total === 0 ? 0 : (data.page - 1) * data.limit + 1;
              const pageEnd = Math.min(
                data.total,
                pageStart + data.items.length - 1
              );

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                    <SummaryCard
                      label={freeTrialCopy.matchedClaims}
                      subLabel={freeTrialCopy.listResults}
                      value={formatCount(data.total)}
                    />
                    <SummaryCard
                      label={freeTrialCopy.active}
                      subLabel={freeTrialCopy.trialActive}
                      value={formatCount(data.stats.active)}
                    />
                    <SummaryCard
                      label={freeTrialCopy.exhausted}
                      subLabel={freeTrialCopy.tokens}
                      value={formatCount(data.stats.exhausted)}
                    />
                    <SummaryCard
                      label={freeTrialCopy.paidConverted}
                      subLabel={freeTrialCopy.license}
                      value={formatCount(data.stats.paidConverted)}
                    />
                    <SummaryCard
                      label={freeTrialCopy.withIp}
                      subLabel={freeTrialCopy.network}
                      value={formatCount(data.stats.withIp)}
                    />
                    <SummaryCard
                      label={freeTrialCopy.withFingerprint}
                      subLabel={freeTrialCopy.fingerprint}
                      value={formatCount(data.stats.withFingerprint)}
                    />
                  </div>

                  <div className="space-y-2 rounded-md border bg-card p-3 sm:p-4">
                    <FilterPillGroup
                      items={statusFilters}
                      label={freeTrialCopy.filters}
                      onSelect={(nextStatus) =>
                        goToSearch({
                          page: 1,
                          status: nextStatus as FreeTrialStatusFilter,
                        })
                      }
                      selected={status}
                    />
                  </div>

                  <DataList>
                    <DataListRowResults
                      onClear={() => goToSearch(DEFAULT_SEARCH)}
                      withClearButton={shouldShowClearFilters}
                    >
                      {freeTrialCopy.listResults} ({formatCount(pageStart)}-
                      {formatCount(pageEnd)}/{formatCount(data.total)})
                    </DataListRowResults>
                    {data.items.map((claim) => (
                      <FreeTrialRow claim={claim} key={claim.id} />
                    ))}
                  </DataList>

                  <PaginationFooter
                    page={data.page}
                    pageCount={data.pageCount}
                    pageEnd={pageEnd}
                    pageStart={pageStart}
                    total={data.total}
                    onPageChange={(nextPage) =>
                      goToSearch({
                        page: nextPage,
                      })
                    }
                  />
                </div>
              );
            })
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function FreeTrialRow(props: { claim: FreeTrialListItem }) {
  const { claim } = props;

  return (
    <DataListRow
      className="grid grid-cols-1 px-0 py-0 md:grid-cols-[minmax(260px,1.1fr)_minmax(180px,0.75fr)_minmax(220px,0.9fr)_minmax(230px,0.9fr)]"
      withHover
    >
      <FreeTrialColumn className="gap-3 md:border-r">
        <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldAlertIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
              {freeTrialCopy.detail}
            </div>
            <Link
              className="block min-w-0 text-sm leading-5 font-semibold break-all text-foreground hover:underline md:truncate md:break-normal"
              params={{ id: claim.id }}
              to="/manager/free-trials/$id"
            >
              {claim.email}
            </Link>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <InfoPill
                icon={MailIcon}
                label="Email"
                value={claim.emailNormalized}
              />
              <InfoPill
                icon={Clock3Icon}
                label={freeTrialCopy.created}
                value={formatRelative(claim.createdAt)}
              />
            </div>
          </div>
        </div>
      </FreeTrialColumn>

      <FreeTrialColumn className="md:border-r">
        <MetaBlock
          icon={BadgeDollarSignIcon}
          label={freeTrialCopy.status}
          value={
            <Badge variant={getFreeTrialStatusBadgeVariant(claim.status)}>
              {getFreeTrialStatusLabel(claim.status)}
            </Badge>
          }
          helper={claim.paidConversion ? getPaidConversionHelper(claim) : null}
        />
        <MetaBlock
          icon={KeyRoundIcon}
          label={freeTrialCopy.tokenBalance}
          value={`${formatCount(claim.availableTokens)} / ${formatCount(
            claim.tokenAmount
          )}`}
          helper={`${formatCount(claim.spentTokens)} spent`}
        />
      </FreeTrialColumn>

      <FreeTrialColumn className="md:border-r">
        <MetaBlock
          icon={SmartphoneIcon}
          label={freeTrialCopy.install}
          value={
            claim.device ? (
              <Link
                className="break-all text-foreground hover:underline"
                params={{ id: claim.device.id }}
                to="/manager/devices/$id"
              >
                {truncateMiddle(claim.installationId, 22)}
              </Link>
            ) : (
              truncateMiddle(claim.installationId, 22)
            )
          }
          helper={
            claim.device?.lastSeenAt
              ? `${freeTrialCopy.lastSeen} ${formatRelative(
                  claim.device.lastSeenAt
                )}`
              : freeTrialCopy.noDevice
          }
        />
        <MetaBlock
          icon={FingerprintIcon}
          label={freeTrialCopy.fingerprint}
          value={
            claim.deviceFingerprintHash
              ? truncateMiddle(claim.deviceFingerprintHash, 28)
              : freeTrialCopy.noFingerprint
          }
          helper={`${formatCount(
            claim.identityCounts.deviceFingerprints
          )} signals`}
        />
      </FreeTrialColumn>

      <FreeTrialColumn>
        <MetaBlock
          icon={NetworkIcon}
          label={freeTrialCopy.network}
          value={claim.ipAddress ?? freeTrialCopy.noIp}
          helper={
            <span className="flex flex-wrap gap-1.5">
              <span>
                {formatCount(claim.identityCounts.ipAddresses)} IP signals
              </span>
              {claim.freeAccessIpBlocked ? (
                <Badge size="sm" variant="warning">
                  {freeTrialCopy.freeAccessBlocked}
                </Badge>
              ) : null}
            </span>
          }
        />
        <MetaBlock
          icon={KeyRoundIcon}
          label={freeTrialCopy.license}
          value={
            <Link
              className="break-all text-foreground hover:underline"
              params={{ key: claim.license.key }}
              to="/manager/licenses/$key"
            >
              {claim.license.key}
            </Link>
          }
          helper={`${freeTrialCopy.redeemCode}: ${claim.redeemCode.code}`}
        />
      </FreeTrialColumn>
    </DataListRow>
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
        {freeTrialCopy.showingPage} {formatCount(props.pageStart)}-
        {formatCount(props.pageEnd)} / {formatCount(props.total)} ·{' '}
        {freeTrialCopy.page} {formatCount(props.page)} /{' '}
        {formatCount(props.pageCount)}
      </div>
      <div className="flex items-center gap-2">
        <Button
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
          size="sm"
          variant="secondary"
        >
          <ChevronLeftIcon className="size-4" />
          {freeTrialCopy.previousPage}
        </Button>
        <Button
          disabled={props.page >= props.pageCount}
          onClick={() =>
            props.onPageChange(Math.min(props.pageCount, props.page + 1))
          }
          size="sm"
          variant="secondary"
        >
          {freeTrialCopy.nextPage}
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function FreeTrialColumn(props: { children: ReactNode; className?: string }) {
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

function FilterPillGroup(props: {
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
        {props.items.map((item) => (
          <Button
            aria-pressed={props.selected === item}
            key={item}
            onClick={() => props.onSelect(item)}
            size="xs"
            variant={props.selected === item ? 'default' : 'secondary'}
          >
            {getFilterLabel(item)}
          </Button>
        ))}
      </div>
    </div>
  );
}

function InfoPill(props: {
  icon: typeof MailIcon;
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
  icon: typeof MailIcon;
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

function getFilterLabel(value: string) {
  switch (value) {
    case 'active':
      return freeTrialCopy.active;
    case 'exhausted':
      return freeTrialCopy.exhausted;
    case 'has_fingerprint':
      return freeTrialCopy.hasFingerprint;
    case 'has_ip':
      return freeTrialCopy.hasIp;
    case 'paid_converted':
      return freeTrialCopy.paidConverted;
    case 'all':
    default:
      return freeTrialCopy.all;
  }
}

function getFreeTrialStatusBadgeVariant(status: FreeTrialListItem['status']) {
  switch (status) {
    case 'paid_converted':
      return 'positive' as const;
    case 'trial_active':
      return 'warning' as const;
    case 'exhausted':
    default:
      return 'secondary' as const;
  }
}

function getFreeTrialStatusLabel(status: FreeTrialListItem['status']) {
  switch (status) {
    case 'paid_converted':
      return freeTrialCopy.paidConverted;
    case 'trial_active':
      return freeTrialCopy.trialActive;
    case 'exhausted':
    default:
      return freeTrialCopy.exhausted;
  }
}

function getPaidConversionHelper(claim: FreeTrialListItem) {
  const order = claim.paidConversion;

  if (!order) {
    return null;
  }

  return `${formatMoney(order.amountTotalCents, order.currency)} · ${
    order.paidAt ? formatRelative(order.paidAt) : freeTrialCopy.paidConverted
  }`;
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const edgeLength = Math.max(4, Math.floor((maxLength - 1) / 2));
  return `${value.slice(0, edgeLength)}...${value.slice(-edgeLength)}`;
}

function formatMoney(amountTotalCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    currency: currency.toUpperCase(),
    style: 'currency',
  }).format(amountTotalCents / 100);
}

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

function formatRelative(date: Date | null) {
  if (!date) {
    return 'Never';
  }

  return dayjs(date).fromNow();
}

export {
  formatCount,
  formatDateTime,
  formatMoney,
  getFreeTrialStatusBadgeVariant,
  getFreeTrialStatusLabel,
  truncateMiddle,
};
