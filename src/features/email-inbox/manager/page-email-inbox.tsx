import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { orpc } from '@/lib/orpc/client';

import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionContact } from '@/features/auth/permissions';
import { EmailInboxSummary } from '@/features/email-inbox/manager/email-inbox-summary';
import { EmailInboxToolbar } from '@/features/email-inbox/manager/email-inbox-toolbar';
import { EmailThreadDetail } from '@/features/email-inbox/manager/email-thread-detail';
import { EmailThreadList } from '@/features/email-inbox/manager/email-thread-list';
import { useEmailInboxLive } from '@/features/email-inbox/manager/use-email-inbox-live';
import { useEmailInboxStore } from '@/features/email-inbox/manager/use-email-inbox-store';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';
import type { EmailInboxFilter } from '@/server/email-inbox/policy';

interface PageEmailInboxProps {
  search: {
    filter?: EmailInboxFilter;
    mailbox?: string;
    searchTerm?: string;
  };
}

export const PageEmailInbox = ({ search }: PageEmailInboxProps) => {
  const { t } = useTranslation(['emailInbox']);
  const router = useRouter();
  const filter = search.filter ?? 'all';
  const mailbox = search.mailbox ?? 'all';
  const searchTerm = search.searchTerm ?? '';
  const liveState = useEmailInboxStore((state) => state.liveState);
  const selectedThreadId = useEmailInboxStore(
    (state) => state.selectedThreadId
  );
  const selectThread = useEmailInboxStore((state) => state.selectThread);

  useEmailInboxLive();

  const navigateWithFilters = (next: {
    filter?: EmailInboxFilter;
    mailbox?: string;
    searchTerm?: string;
  }) =>
    router.navigate({
      replace: true,
      search: { filter, mailbox, searchTerm, ...next },
      to: '.',
    });

  const listQuery = useInfiniteQuery(
    orpc.emailInbox.list.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: undefined,
      input: (cursor: string | undefined) => ({
        cursor,
        filter,
        mailbox,
        searchTerm,
      }),
    })
  );
  const items = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data?.pages]
  );
  const overview = listQuery.data?.pages[0];

  useEffect(() => {
    if (!items.length) {
      if (selectedThreadId) selectThread(undefined);
      return;
    }
    if (
      !selectedThreadId ||
      !items.some((item) => item.id === selectedThreadId)
    ) {
      selectThread(items[0]?.id);
    }
  }, [items, selectThread, selectedThreadId]);

  const detailQuery = useQuery({
    ...orpc.emailInbox.getById.queryOptions({
      input: { id: selectedThreadId ?? '' },
    }),
    enabled: Boolean(selectedThreadId),
  });

  const searchInputProps = {
    onChange: (value: string) => navigateWithFilters({ searchTerm: value }),
    value: searchTerm,
  };
  const filtered =
    Boolean(searchTerm.trim()) || filter !== 'all' || mailbox !== 'all';

  return (
    <GuardPermissions permissions={[permissionContact.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>{t('emailInbox:title')}</PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...searchInputProps}
            className="hidden w-[28rem] max-w-[45vw] md:flex"
            placeholder={t('emailInbox:searchPlaceholder')}
            size="sm"
          />
        </PageLayoutTopBar>
        <PageLayoutContent
          className="pb-20"
          containerClassName="max-w-[1500px]"
        >
          <div className="space-y-3">
            <EmailInboxSummary summary={overview?.summary} />
            <EmailInboxToolbar
              filter={filter}
              liveState={liveState}
              mailbox={mailbox}
              mailboxes={overview?.mailboxes ?? []}
              onFilterChange={(value) => navigateWithFilters({ filter: value })}
              onMailboxChange={(value) =>
                navigateWithFilters({ mailbox: value })
              }
            />
            <div className="grid overflow-hidden rounded-sm border bg-card lg:h-[calc(100vh-14rem)] lg:max-h-[720px] lg:min-h-[600px] lg:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.55fr)] lg:grid-rows-[minmax(0,1fr)]">
              <div className="h-[600px] min-h-0 min-w-0 overflow-hidden border-b lg:h-full lg:border-r lg:border-b-0">
                <EmailThreadList
                  error={listQuery.status === 'error'}
                  filtered={filtered}
                  hasNextPage={Boolean(listQuery.hasNextPage)}
                  items={items}
                  loading={listQuery.status === 'pending'}
                  loadingMore={listQuery.isFetchingNextPage}
                  selectedId={selectedThreadId}
                  total={overview?.total ?? 0}
                  onLoadMore={() => void listQuery.fetchNextPage()}
                  onSelect={selectThread}
                />
              </div>
              <div className="h-[600px] min-h-0 min-w-0 overflow-hidden lg:h-full">
                <EmailThreadDetail
                  error={detailQuery.status === 'error'}
                  item={detailQuery.data}
                  loading={
                    Boolean(selectedThreadId) &&
                    detailQuery.status === 'pending'
                  }
                  onRetry={() => void detailQuery.refetch()}
                />
              </div>
            </div>
          </div>
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};
