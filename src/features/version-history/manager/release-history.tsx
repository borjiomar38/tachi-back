import { useInfiniteQuery } from '@tanstack/react-query';
import { RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { orpc } from '@/lib/orpc/client';

import { Button } from '@/components/ui/button';

import { ReleaseHistoryCard } from '@/features/version-history/manager/release-history-card';

export const ReleaseHistory = () => {
  const { t } = useTranslation(['releaseHistory']);
  const query = useInfiniteQuery(
    orpc.mobileRelease.list.infiniteOptions({
      input: (beforeVersionCode: number | undefined) => ({
        beforeVersionCode,
        limit: 10,
      }),
      initialPageParam: undefined,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    })
  );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="mt-6 space-y-4" aria-labelledby="release-history-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="release-history-title" className="text-2xl font-semibold">
            {t('releaseHistory:title')}
          </h2>
          <p className="text-muted-foreground">
            {t('releaseHistory:description')}
          </p>
        </div>
        <Button
          variant="secondary"
          loading={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCwIcon />
          {t('releaseHistory:refresh')}
        </Button>
      </div>
      {query.isPending && <p role="status">{t('releaseHistory:loading')}</p>}
      {query.isError && <p role="alert">{t('releaseHistory:error')}</p>}
      {query.isSuccess && items.length === 0 && (
        <p className="rounded-lg border p-6 text-muted-foreground">
          {t('releaseHistory:empty')}
        </p>
      )}
      {items.map((release) => (
        <ReleaseHistoryCard key={release.id} release={release} />
      ))}
      {query.hasNextPage && (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t('releaseHistory:more')}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        {t('releaseHistory:legacyNotice')}
      </p>
    </section>
  );
};
