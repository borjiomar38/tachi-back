import { getUiState } from '@bearstudio/ui-state';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

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
  DataListText,
} from '@/components/ui/datalist';
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionContact } from '@/features/auth/permissions';
import { ContactTriageAutomationCard } from '@/features/contact/manager/contact-triage-automation-card';
import { ContactTriageBadge } from '@/features/contact/manager/contact-triage-badge';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const CONTACT_STATUS_OPTIONS = [
  'all',
  'unread',
  'in_progress',
  'resolved',
  'spam',
] as const;

const TRIAGE_FILTERS = [
  'all',
  'awaiting',
  'needs_review',
  'forwarded',
  'filtered',
] as const;

type ContactStatusFilter = (typeof CONTACT_STATUS_OPTIONS)[number];
type ContactTriageFilter = (typeof TRIAGE_FILTERS)[number];

interface PageContactsProps {
  search: {
    searchTerm?: string;
    status?: ContactStatusFilter;
    triage?: ContactTriageFilter;
  };
}

export const PageContacts = ({ search }: PageContactsProps) => {
  const { t } = useTranslation(['contact']);
  const router = useRouter();
  const searchTerm = search.searchTerm ?? '';
  const status = search.status ?? 'all';
  const triage = search.triage ?? 'all';

  const navigateWithFilters = (next: {
    searchTerm?: string;
    status?: ContactStatusFilter;
    triage?: ContactTriageFilter;
  }) =>
    router.navigate({
      replace: true,
      search: {
        searchTerm,
        status,
        triage,
        ...next,
      },
      to: '.',
    });

  const searchInputProps = {
    value: searchTerm,
    onChange: (value: string) => navigateWithFilters({ searchTerm: value }),
  };

  const contactsQuery = useInfiniteQuery(
    orpc.contact.getAll.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: undefined,
      input: (cursor: string | undefined) => ({
        cursor,
        searchTerm,
        status,
        triage,
      }),
      maxPages: 10,
    })
  );

  const retryFailedMutation = useMutation({
    mutationFn: async () => await orpc.contact.retryFailed.call({}),
    onSuccess: async ({ count }) => {
      await contactsQuery.refetch();
      toast.success(t('contact:inbox.automation.retrySuccess', { count }));
    },
    onError: () => toast.error(t('contact:inbox.automation.retryError')),
  });

  const items = contactsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const triageCounts = contactsQuery.data?.pages[0]?.triageCounts;
  const total = contactsQuery.data?.pages[0]?.total ?? 0;

  const ui = getUiState((set) => {
    if (contactsQuery.status === 'pending') return set('pending');
    if (contactsQuery.status === 'error') return set('error');
    if (!items.length && (searchTerm || status !== 'all' || triage !== 'all')) {
      return set('empty-search', { searchTerm });
    }
    if (!items.length) return set('empty');
    return set('default');
  });

  const hasFilters =
    Boolean(searchTerm.trim()) || status !== 'all' || triage !== 'all';

  return (
    <GuardPermissions permissions={[permissionContact.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>
            {t('contact:inbox.title')}
          </PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <div className="hidden items-center gap-2 md:flex">
            <SearchInput
              {...searchInputProps}
              className="w-72"
              size="sm"
              placeholder={t('contact:inbox.searchPlaceholder')}
            />
            <Select
              items={CONTACT_STATUS_OPTIONS.map((value) => ({
                label:
                  value === 'all'
                    ? t('contact:inbox.allStatuses')
                    : t(`contact:status.${value}`),
                value,
              }))}
              value={status}
              onValueChange={(value) =>
                navigateWithFilters({ status: value as ContactStatusFilter })
              }
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder={t('contact:inbox.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CONTACT_STATUS_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === 'all'
                        ? t('contact:inbox.allStatuses')
                        : t(`contact:status.${value}`)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </PageLayoutTopBar>
        <PageLayoutContent className="pb-20" containerClassName="max-w-7xl">
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label={t('contact:inbox.summary.total')}
              value={triageCounts?.total ?? 0}
              description={t('contact:inbox.summary.totalDescription')}
            />
            <SummaryCard
              label={t('contact:inbox.summary.awaiting')}
              value={triageCounts?.awaiting ?? 0}
              description={t('contact:inbox.summary.awaitingDescription')}
            />
            <SummaryCard
              label={t('contact:inbox.summary.needsReview')}
              value={triageCounts?.needsReview ?? 0}
              description={t('contact:inbox.summary.needsReviewDescription')}
            />
            <SummaryCard
              label={t('contact:inbox.summary.forwarded')}
              value={triageCounts?.forwarded ?? 0}
              description={t('contact:inbox.summary.forwardedDescription')}
            />
            <SummaryCard
              label={t('contact:inbox.summary.filtered')}
              value={triageCounts?.filtered ?? 0}
              description={t('contact:inbox.summary.filteredDescription')}
            />
          </div>

          <div className="mb-4">
            <ContactTriageAutomationCard
              analyzed={triageCounts?.analyzed ?? 0}
              failed={triageCounts?.failed ?? 0}
              lastAnalyzedAt={triageCounts?.lastAnalyzedAt}
              loading={retryFailedMutation.isPending}
              onRetryFailed={() => retryFailedMutation.mutate()}
              total={triageCounts?.total ?? 0}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2">
            {TRIAGE_FILTERS.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={triage === value ? 'default' : 'ghost'}
                onClick={() => navigateWithFilters({ triage: value })}
              >
                {t(
                  `contact:inbox.filters.${value === 'needs_review' ? 'needsReview' : value}`
                )}
              </Button>
            ))}
          </div>

          <DataList>
            {ui
              .match('pending', () => <DataListLoadingState />)
              .match('error', () => (
                <DataListErrorState retry={() => contactsQuery.refetch()} />
              ))
              .match('empty', () => (
                <DataListEmptyState>
                  {t('contact:inbox.empty')}
                </DataListEmptyState>
              ))
              .match('empty-search', ({ searchTerm: currentSearchTerm }) => (
                <DataListEmptyState searchTerm={currentSearchTerm || undefined}>
                  {t('contact:inbox.emptySearch')}
                </DataListEmptyState>
              ))
              .match('default', () => (
                <>
                  {hasFilters ? (
                    <DataListRowResults
                      withClearButton
                      onClear={() =>
                        navigateWithFilters({
                          searchTerm: '',
                          status: 'all',
                          triage: 'all',
                        })
                      }
                    >
                      {t('contact:inbox.showing', {
                        total,
                        visible: items.length,
                      })}
                    </DataListRowResults>
                  ) : null}

                  <ContactListHeader />
                  {items.map((item) => (
                    <DataListRow key={item.id} withHover>
                      <DataListCell>
                        <DataListText className="font-medium">
                          <Link
                            params={{ id: item.id }}
                            to="/manager/contacts/$id"
                          >
                            {item.subject}
                            <span className="absolute inset-0" />
                          </Link>
                        </DataListText>
                        <DataListText className="text-xs text-muted-foreground">
                          {item.name} • {item.email}
                        </DataListText>
                      </DataListCell>
                      <DataListCell className="flex-[0.65] max-md:hidden">
                        <ContactTriageBadge triage={item.triage} />
                      </DataListCell>
                      <DataListCell className="flex-[0.55] max-lg:hidden">
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {t(`contact:status.${item.status}`)}
                        </Badge>
                      </DataListCell>
                      <DataListCell className="flex-[0.85] max-xl:hidden">
                        <DataListText className="text-xs text-muted-foreground">
                          {t(
                            `contact:triage.routing.${item.triage.notification}`
                          )}
                        </DataListText>
                      </DataListCell>
                      <DataListCell className="flex-[0.55] max-md:hidden">
                        <DataListText className="text-xs text-muted-foreground">
                          {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                        </DataListText>
                      </DataListCell>
                    </DataListRow>
                  ))}
                  <DataListRow>
                    <DataListCell className="flex-none">
                      <Button
                        size="xs"
                        variant="secondary"
                        disabled={!contactsQuery.hasNextPage}
                        loading={contactsQuery.isFetchingNextPage}
                        onClick={() => contactsQuery.fetchNextPage()}
                      >
                        {t('contact:inbox.loadMore')}
                      </Button>
                    </DataListCell>
                    <DataListCell>
                      <DataListText className="text-xs text-muted-foreground">
                        {t('contact:inbox.showing', {
                          total,
                          visible: items.length,
                        })}
                      </DataListText>
                    </DataListCell>
                  </DataListRow>
                </>
              ))
              .exhaustive()}
          </DataList>
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

const ContactListHeader = () => {
  const { t } = useTranslation(['contact']);

  return (
    <DataListRow className="hidden bg-muted/30 md:flex">
      <DataListCell>
        <DataListText className="text-xs font-medium text-muted-foreground">
          {t('contact:inbox.columns.message')}
        </DataListText>
      </DataListCell>
      <DataListCell className="flex-[0.65]">
        <DataListText className="text-xs font-medium text-muted-foreground">
          {t('contact:inbox.columns.verdict')}
        </DataListText>
      </DataListCell>
      <DataListCell className="flex-[0.55] max-lg:hidden">
        <DataListText className="text-xs font-medium text-muted-foreground">
          {t('contact:inbox.columns.workflow')}
        </DataListText>
      </DataListCell>
      <DataListCell className="flex-[0.85] max-xl:hidden">
        <DataListText className="text-xs font-medium text-muted-foreground">
          {t('contact:inbox.columns.routing')}
        </DataListText>
      </DataListCell>
      <DataListCell className="flex-[0.55]">
        <DataListText className="text-xs font-medium text-muted-foreground">
          {t('contact:inbox.columns.date')}
        </DataListText>
      </DataListCell>
    </DataListRow>
  );
};

interface SummaryCardProps {
  description: string;
  label: string;
  value: number;
}

const SummaryCard = ({ description, label, value }: SummaryCardProps) => (
  <Card>
    <CardHeader className="gap-2">
      <CardTitle className="text-sm">{label}</CardTitle>
      <CardDescription className="min-h-10 text-xs">
        {description}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold tracking-tight">
        {value.toLocaleString()}
      </div>
    </CardContent>
  </Card>
);

const getStatusBadgeVariant = (status: Exclude<ContactStatusFilter, 'all'>) => {
  if (status === 'unread') return 'warning';
  if (status === 'in_progress') return 'default';
  if (status === 'resolved') return 'positive';
  return 'negative';
};
