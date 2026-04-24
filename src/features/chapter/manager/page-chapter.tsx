import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';

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
import { permissionJob } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageChapter = (props: { params: { cacheKey: string } }) => {
  const chapterQuery = useQuery(
    orpc.chapter.getByCacheKey.queryOptions({
      input: {
        chapterCacheKey: props.params.cacheKey,
      },
    })
  );

  const ui = getUiState((set) => {
    if (chapterQuery.status === 'pending') {
      return set('pending');
    }

    if (
      chapterQuery.status === 'error' &&
      chapterQuery.error instanceof ORPCError &&
      chapterQuery.error.code === 'NOT_FOUND'
    ) {
      return set('not-found');
    }

    if (chapterQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      chapter: chapterQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionJob.read]}>
      <PageLayout>
        <PageLayoutTopBar startActions={<BackButton />}>
          <PageLayoutTopBarTitle>
            {ui
              .match('pending', () => <Skeleton className="h-4 w-64" />)
              .match('not-found', () => 'Translated chapter not found')
              .match('error', () => 'Translated chapter lookup failed')
              .match(
                'default',
                ({ chapter }) =>
                  chapter.identity?.mangaTitle ??
                  chapter.identity?.chapterName ??
                  chapter.chapterCacheKey
              )
              .exhaustive()}
          </PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl">
          {ui
            .match('pending', () => <Spinner full />)
            .match('not-found', () => <PageError type="404" />)
            .match('error', () => <PageError type="unknown-server-error" />)
            .match('default', ({ chapter }) => (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <SummaryCard
                    label="Pages"
                    subLabel="Latest cached manifest"
                    value={chapter.stats.pageCount.toString()}
                  />
                  <SummaryCard
                    label="Translations"
                    subLabel={chapter.stats.targetLanguages.join(', ') || 'n/a'}
                    value={chapter.stats.cachedTranslationCount.toString()}
                  />
                  <SummaryCard
                    label="Completed Jobs"
                    subLabel={`${chapter.stats.totalJobCount} total linked jobs`}
                    value={chapter.stats.completedJobCount.toString()}
                  />
                  <SummaryCard
                    label="Cache Hits"
                    subLabel="Immediate result reuses"
                    value={chapter.stats.cacheHitCount.toString()}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Chapter Identity</CardTitle>
                      <CardDescription>
                        Source and chapter metadata sent by the mobile client.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <KeyValue
                        label="Manga"
                        value={chapter.identity?.mangaTitle ?? 'Unknown'}
                      />
                      <KeyValue
                        label="Chapter"
                        value={chapter.identity?.chapterName ?? 'Unknown'}
                      />
                      <KeyValue
                        label="Source"
                        value={[
                          chapter.identity?.sourceName,
                          chapter.identity?.sourceId,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                      <KeyValue
                        label="Chapter URL"
                        value={chapter.identity?.chapterUrl ?? 'Unknown'}
                        wrap
                      />
                      <KeyValue
                        label="Manga URL"
                        value={chapter.identity?.mangaUrl ?? 'Unknown'}
                        wrap
                      />
                      <KeyValue
                        label="Cache key"
                        value={chapter.chapterCacheKey}
                        wrap
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Cached Results</CardTitle>
                      <CardDescription>
                        One row per source/target result stored for this
                        chapter.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataList>
                        {chapter.cacheEntries.map((entry) => (
                          <DataListRow key={entry.cacheKey}>
                            <DataListCell>
                              <DataListText className="font-medium">
                                {entry.sourceLanguage} {'->'}{' '}
                                {entry.targetLanguage}
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                {entry.resultPayloadVersion}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.45]">
                              <DataListTextHeader>Pages</DataListTextHeader>
                              <DataListText className="text-xs">
                                {entry.pageCount}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="max-md:hidden">
                              <DataListTextHeader>Hits</DataListTextHeader>
                              <DataListText className="text-xs">
                                {entry.cacheHitCount}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="max-lg:hidden">
                              <DataListTextHeader>Updated</DataListTextHeader>
                              <DataListText className="text-xs">
                                {dayjs(entry.updatedAt).fromNow()}
                              </DataListText>
                            </DataListCell>
                          </DataListRow>
                        ))}
                      </DataList>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Content Preview</CardTitle>
                    <CardDescription>
                      OCR text and translated text from the latest cached
                      manifest.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataList>
                      {!chapter.pagePreviews.length ? (
                        <DataListEmptyState>
                          No manifest content is stored in the database for this
                          chapter yet.
                        </DataListEmptyState>
                      ) : (
                        chapter.pagePreviews.map((page) => (
                          <DataListRow key={page.pageKey}>
                            <DataListCell>
                              <DataListText className="font-medium">
                                {page.pageKey}
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                {page.imageWidth ?? '?'} x{' '}
                                {page.imageHeight ?? '?'} · {page.blockCount}{' '}
                                block{page.blockCount === 1 ? '' : 's'}
                              </DataListText>
                            </DataListCell>
                            <DataListCell>
                              <DataListTextHeader>Source</DataListTextHeader>
                              <DataListText className="line-clamp-3 text-xs">
                                {page.sourcePreview || 'No OCR text'}
                              </DataListText>
                            </DataListCell>
                            <DataListCell>
                              <DataListTextHeader>
                                Translation
                              </DataListTextHeader>
                              <DataListText className="line-clamp-3 text-xs">
                                {page.translationPreview || 'No translation'}
                              </DataListText>
                            </DataListCell>
                          </DataListRow>
                        ))
                      )}
                    </DataList>
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Jobs</CardTitle>
                      <CardDescription>
                        Jobs linked to the same chapter identity.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataList>
                        {!chapter.jobs.length ? (
                          <DataListEmptyState>
                            No jobs are linked to this chapter key.
                          </DataListEmptyState>
                        ) : (
                          chapter.jobs.map((job) => (
                            <DataListRow key={job.id} withHover>
                              <DataListCell>
                                <DataListText className="font-medium">
                                  <Link
                                    params={{ id: job.id }}
                                    to="/manager/jobs/$id"
                                  >
                                    {job.id}
                                    <span className="absolute inset-0" />
                                  </Link>
                                </DataListText>
                                <DataListText className="text-xs text-muted-foreground">
                                  {job.licenseKey} · {job.installationId}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="flex-[0.45]">
                                <DataListTextHeader>Status</DataListTextHeader>
                                <Badge
                                  variant={getStatusBadgeVariant(job.status)}
                                >
                                  {job.status.replaceAll('_', ' ')}
                                </Badge>
                              </DataListCell>
                              <DataListCell className="max-md:hidden">
                                <DataListTextHeader>Created</DataListTextHeader>
                                <DataListText className="text-xs">
                                  {dayjs(job.createdAt).format(
                                    'DD/MM/YYYY HH:mm'
                                  )}
                                </DataListText>
                              </DataListCell>
                            </DataListRow>
                          ))
                        )}
                      </DataList>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Latest Manifest JSON</CardTitle>
                      <CardDescription>
                        Raw persisted JSON used by the mobile reader.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="max-h-[520px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                        {chapter.latestManifest
                          ? JSON.stringify(chapter.latestManifest, null, 2)
                          : 'No resultManifest stored in the database yet.'}
                      </pre>
                    </CardContent>
                  </Card>
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

function KeyValue(props: { label: string; value?: string; wrap?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">
        {props.label}
      </div>
      <div className={props.wrap ? 'font-mono text-xs break-all' : undefined}>
        {props.value || 'Unknown'}
      </div>
    </div>
  );
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'positive' as const;
    case 'processing':
    case 'queued':
    case 'awaiting_upload':
      return 'warning' as const;
    case 'failed':
    case 'canceled':
    case 'expired':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}
