import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';

import { orpc } from '@/lib/orpc/client';

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
  DataListRowResults,
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionJob } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageChapters = (props: {
  search: {
    searchTerm?: string;
  };
}) => {
  const router = useRouter();
  const searchTerm = props.search.searchTerm ?? '';
  const normalizedSearchTerm = searchTerm.trim();

  const chaptersQuery = useQuery(
    orpc.chapter.list.queryOptions({
      input: {
        limit: 50,
        searchTerm: normalizedSearchTerm,
      },
    })
  );

  const searchInputProps = {
    value: searchTerm,
    onChange: (value: string) =>
      router.navigate({
        replace: true,
        search: {
          searchTerm: value,
        },
        to: '.',
      }),
  };

  const ui = getUiState((set) => {
    if (chaptersQuery.status === 'pending') {
      return set('pending');
    }

    if (chaptersQuery.status === 'error') {
      return set('error');
    }

    if (!chaptersQuery.data.items.length) {
      return set('empty', {
        scannedCacheRows: chaptersQuery.data.scannedCacheRows,
      });
    }

    return set('default', {
      chapters: chaptersQuery.data.items,
      scannedCacheRows: chaptersQuery.data.scannedCacheRows,
      total: chaptersQuery.data.total,
    });
  });

  return (
    <GuardPermissions permissions={[permissionJob.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Translated Chapters</PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...searchInputProps}
            className="max-w-sm max-md:hidden"
            placeholder="Search manga, chapter, source, URL"
            size="sm"
          />
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl">
          {ui
            .match('pending', () => (
              <DataList>
                <DataListLoadingState />
              </DataList>
            ))
            .match('error', () => (
              <DataList>
                <DataListErrorState retry={() => chaptersQuery.refetch()} />
              </DataList>
            ))
            .match('empty', ({ scannedCacheRows }) => (
              <DataList>
                <DataListEmptyState>
                  No translated chapters match the current search. Scanned{' '}
                  {scannedCacheRows} cache rows.
                </DataListEmptyState>
              </DataList>
            ))
            .match('default', ({ chapters, scannedCacheRows, total }) => (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <SummaryCard
                    label="Visible Chapters"
                    subLabel={`${chapters.length}/${total} matching groups`}
                    value={chapters.length.toString()}
                  />
                  <SummaryCard
                    label="Cached Translations"
                    subLabel="Language-specific result manifests"
                    value={sum(
                      chapters.map((chapter) => chapter.cachedTranslationCount)
                    ).toString()}
                  />
                  <SummaryCard
                    label="Completed Jobs"
                    subLabel="Jobs linked by chapter identity"
                    value={sum(
                      chapters.map((chapter) => chapter.completedJobCount)
                    ).toString()}
                  />
                  <SummaryCard
                    label="Cache Hits"
                    subLabel={`${scannedCacheRows} cache rows scanned`}
                    value={sum(
                      chapters.map((chapter) => chapter.cacheHitCount)
                    ).toString()}
                  />
                </div>

                <DataList>
                  <DataListRowResults>
                    Translated chapters ({chapters.length}/{total})
                  </DataListRowResults>
                  {chapters.map((chapter) => (
                    <DataListRow key={chapter.chapterCacheKey} withHover>
                      <DataListCell>
                        <DataListText className="font-medium">
                          <Link
                            params={{
                              cacheKey: chapter.chapterCacheKey,
                            }}
                            to="/manager/chapters/$cacheKey"
                          >
                            {chapter.identity?.mangaTitle ?? 'Unknown manga'}
                            <span className="absolute inset-0" />
                          </Link>
                        </DataListText>
                        <DataListText className="text-xs text-muted-foreground">
                          {chapter.identity?.chapterName ?? 'Unknown chapter'}
                        </DataListText>
                        <DataListText className="truncate text-xs text-muted-foreground">
                          {chapter.identity?.sourceName ?? 'Unknown source'} ·{' '}
                          {chapter.identity?.chapterUrl ??
                            chapter.chapterCacheKey}
                        </DataListText>
                      </DataListCell>
                      <DataListCell className="flex-[0.55]">
                        <DataListTextHeader>Pages</DataListTextHeader>
                        <DataListText className="text-xs">
                          {chapter.pageCount}
                        </DataListText>
                        <DataListText className="text-xs text-muted-foreground">
                          {chapter.cachedTranslationCount} cached translation
                          {chapter.cachedTranslationCount === 1 ? '' : 's'}
                        </DataListText>
                      </DataListCell>
                      <DataListCell className="max-md:hidden">
                        <DataListTextHeader>Languages</DataListTextHeader>
                        <div className="flex flex-wrap gap-1">
                          {chapter.targetLanguages.map((language) => (
                            <Badge key={language} variant="secondary">
                              {language}
                            </Badge>
                          ))}
                        </div>
                      </DataListCell>
                      <DataListCell className="max-lg:hidden">
                        <DataListTextHeader>Usage</DataListTextHeader>
                        <DataListText className="text-xs">
                          {chapter.completedJobCount}/{chapter.totalJobCount}{' '}
                          completed jobs
                        </DataListText>
                        <DataListText className="text-xs text-muted-foreground">
                          {chapter.cacheHitCount} cache hit
                          {chapter.cacheHitCount === 1 ? '' : 's'}
                        </DataListText>
                      </DataListCell>
                      <DataListCell className="flex-[0.7] max-xl:hidden">
                        <DataListTextHeader>Updated</DataListTextHeader>
                        <DataListText className="text-xs">
                          {dayjs(chapter.lastCachedAt).fromNow()}
                        </DataListText>
                        <DataListText className="text-xs text-muted-foreground">
                          first cached{' '}
                          {dayjs(chapter.firstCachedAt).format('DD/MM/YYYY')}
                        </DataListText>
                      </DataListCell>
                    </DataListRow>
                  ))}
                </DataList>
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

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
