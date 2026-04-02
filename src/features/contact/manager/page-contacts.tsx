import { getUiState } from '@bearstudio/ui-state';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';

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
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const CONTACT_STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Spam', value: 'spam' },
] as const;

type ContactStatusFilter = (typeof CONTACT_STATUS_OPTIONS)[number]['value'];

export const PageContacts = (props: {
  search: {
    searchTerm?: string;
    status?: ContactStatusFilter;
  };
}) => {
  const router = useRouter();
  const searchTerm = props.search.searchTerm ?? '';
  const status = props.search.status ?? 'all';

  const searchInputProps = {
    value: searchTerm,
    onChange: (value: string) =>
      router.navigate({
        replace: true,
        search: {
          searchTerm: value,
          status,
        },
        to: '.',
      }),
  };

  const contactsQuery = useInfiniteQuery(
    orpc.contact.getAll.infiniteOptions({
      input: (cursor: string | undefined) => ({
        cursor,
        searchTerm,
        status,
      }),
      initialPageParam: undefined,
      maxPages: 10,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    })
  );

  const items = contactsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const statusCounts = contactsQuery.data?.pages[0]?.statusCounts;
  const total = contactsQuery.data?.pages[0]?.total ?? 0;

  const ui = getUiState((set) => {
    if (contactsQuery.status === 'pending') return set('pending');
    if (contactsQuery.status === 'error') return set('error');
    if (!items.length && (searchTerm || status !== 'all')) {
      return set('empty-search', { searchTerm, status });
    }
    if (!items.length) return set('empty');
    return set('default');
  });

  const hasFilters = Boolean(searchTerm.trim()) || status !== 'all';

  return (
    <GuardPermissions permissions={[permissionContact.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Contact Inbox</PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <div className="hidden items-center gap-2 md:flex">
            <SearchInput {...searchInputProps} className="w-72" size="sm" />
            <Select
              items={CONTACT_STATUS_OPTIONS}
              value={status}
              onValueChange={(value) =>
                router.navigate({
                  replace: true,
                  search: {
                    searchTerm,
                    status: value as ContactStatusFilter,
                  },
                  to: '.',
                })
              }
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CONTACT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </PageLayoutTopBar>
        <PageLayoutContent className="pb-20" containerClassName="max-w-6xl">
          <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Unread"
              value={statusCounts?.unread ?? 0}
              description="New messages waiting for triage"
            />
            <SummaryCard
              label="In progress"
              value={statusCounts?.inProgress ?? 0}
              description="Messages currently being handled"
            />
            <SummaryCard
              label="Resolved"
              value={statusCounts?.resolved ?? 0}
              description="Closed messages in the current view"
            />
            <SummaryCard
              label="Spam"
              value={statusCounts?.spam ?? 0}
              description="Spam or irrelevant submissions"
            />
          </div>

          <DataList>
            {ui
              .match('pending', () => <DataListLoadingState />)
              .match('error', () => (
                <DataListErrorState retry={() => contactsQuery.refetch()} />
              ))
              .match('empty', () => (
                <DataListEmptyState>
                  No public contact messages have been stored yet.
                </DataListEmptyState>
              ))
              .match('empty-search', ({ searchTerm: currentSearchTerm }) => (
                <DataListEmptyState searchTerm={currentSearchTerm || undefined}>
                  No contact messages match the current filters.
                </DataListEmptyState>
              ))
              .match('default', () => (
                <>
                  {hasFilters ? (
                    <DataListRowResults
                      withClearButton
                      onClear={() =>
                        router.navigate({
                          replace: true,
                          search: {
                            searchTerm: '',
                            status: 'all',
                          },
                          to: '.',
                        })
                      }
                    >
                      {`Showing ${items.length} of ${total} messages`}
                    </DataListRowResults>
                  ) : null}

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
                      <DataListCell className="flex-[0.5] max-md:hidden">
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {formatStatus(item.status)}
                        </Badge>
                      </DataListCell>
                      <DataListCell className="flex-[0.8] max-xl:hidden">
                        <DataListText className="text-xs text-muted-foreground">
                          {item.assignedTo
                            ? `${item.assignedTo.name} · ${item.assignedTo.email}`
                            : 'Unassigned'}
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
                        Load more
                      </Button>
                    </DataListCell>
                    <DataListCell>
                      <DataListText className="text-xs text-muted-foreground">
                        Showing {items.length} of {total} messages
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

const SummaryCard = (props: {
  description: string;
  label: string;
  value: number;
}) => (
  <Card>
    <CardHeader className="gap-2">
      <CardTitle className="text-base">{props.label}</CardTitle>
      <CardDescription>{props.description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold tracking-tight">
        {props.value.toLocaleString()}
      </div>
    </CardContent>
  </Card>
);

const formatStatus = (status: ContactStatusFilter) =>
  status === 'all'
    ? 'All'
    : status === 'in_progress'
      ? 'In progress'
      : status.charAt(0).toUpperCase() + status.slice(1);

const getStatusBadgeVariant = (status: Exclude<ContactStatusFilter, 'all'>) => {
  if (status === 'unread') return 'warning';
  if (status === 'in_progress') return 'default';
  if (status === 'resolved') return 'positive';
  return 'negative';
};
