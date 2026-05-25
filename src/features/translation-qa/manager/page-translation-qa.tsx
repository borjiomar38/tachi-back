import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
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
  DataListTextHeader,
} from '@/components/ui/datalist';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionJob } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const statusFilters = [
  'all',
  'issues_found',
  'blocked',
  'ok',
  'unavailable',
] as const;

type TranslationQaStatusFilter = (typeof statusFilters)[number];

export const PageTranslationQa = (props: {
  search: {
    status?: TranslationQaStatusFilter;
  };
}) => {
  const router = useRouter();
  const status = props.search.status ?? 'all';

  const qaQuery = useQuery(
    orpc.translationQa.list.queryOptions({
      input: {
        limit: 50,
        status,
      },
    })
  );

  const ui = getUiState((set) => {
    if (qaQuery.status === 'pending') {
      return set('pending');
    }

    if (qaQuery.status === 'error') {
      return set('error');
    }

    if (!qaQuery.data.items.length) {
      return set('empty');
    }

    return set('default', {
      items: qaQuery.data.items,
      stats: qaQuery.data.stats,
      total: qaQuery.data.total,
    });
  });

  return (
    <GuardPermissions permissions={[permissionJob.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Translation QA</PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((item) => (
                <Button
                  key={item}
                  size="xs"
                  variant={status === item ? 'default' : 'secondary'}
                  onClick={() =>
                    router.navigate({
                      replace: true,
                      search: {
                        status: item,
                      },
                      to: '.',
                    })
                  }
                >
                  {humanizeStatusFilter(item)}
                </Button>
              ))}
            </div>

            {ui
              .match('pending', () => (
                <DataList>
                  <DataListLoadingState />
                </DataList>
              ))
              .match('error', () => (
                <DataList>
                  <DataListErrorState retry={() => qaQuery.refetch()} />
                </DataList>
              ))
              .match('empty', () => (
                <DataList>
                  <DataListEmptyState>
                    No translation QA reports match this filter yet.
                  </DataListEmptyState>
                </DataList>
              ))
              .match('default', ({ items, stats, total }) => (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-5">
                    <SummaryCard
                      label="Reports"
                      subLabel={`Latest ${items.length}/${total} report assets`}
                      value={stats.totalReports.toString()}
                    />
                    <SummaryCard
                      label="Issues"
                      subLabel="OCR, merge, layout, translation"
                      value={stats.totalIssues.toString()}
                    />
                    <SummaryCard
                      label="Critical"
                      subLabel={`${stats.warningIssueCount} warnings, ${stats.infoIssueCount} info`}
                      value={stats.criticalIssueCount.toString()}
                    />
                    <SummaryCard
                      label="Cleanup Blocked"
                      subLabel="Original uploads retained for review"
                      value={stats.cleanupBlockedCount.toString()}
                    />
                    <SummaryCard
                      label="Visual QA"
                      subLabel={`${stats.manifestOnlyReportCount} manifest-only reports`}
                      value={`${stats.visualReportCount}/${stats.totalReports}`}
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                    <DataList>
                      <DataListRowResults>
                        {status === 'all'
                          ? `Latest translation QA reports (${items.length}/${total})`
                          : `${humanizeStatusFilter(status)} reports (${items.length}/${total})`}
                      </DataListRowResults>
                      {items.map((item) => (
                        <DataListRow key={item.assetId} withHover>
                          <DataListCell className="flex-[1.7]">
                            <DataListText className="font-medium">
                              <Link
                                params={{ id: item.jobId }}
                                to="/manager/jobs/$id"
                              >
                                {getChapterTitle(item)}
                                <span className="absolute inset-0" />
                              </Link>
                            </DataListText>
                            <DataListText className="text-xs text-muted-foreground">
                              {getChapterSubtitle(item)}
                            </DataListText>
                            <DataListText className="line-clamp-2 text-xs whitespace-normal text-muted-foreground">
                              {item.summary}
                            </DataListText>
                            {!!item.topIssues.length && (
                              <div className="mt-2 flex max-w-full flex-col gap-1">
                                {item.topIssues.slice(0, 3).map((issue) => (
                                  <div
                                    key={`${item.assetId}-${issue.pageKey}-${issue.kind}-${issue.blockIndex ?? 'na'}`}
                                    className="flex min-w-0 items-center gap-2 text-xs"
                                  >
                                    <Badge
                                      size="xs"
                                      variant={getSeverityBadgeVariant(
                                        issue.severity
                                      )}
                                    >
                                      {issue.severity}
                                    </Badge>
                                    <span className="min-w-0 truncate text-muted-foreground">
                                      {issue.kind}: {issue.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </DataListCell>
                          <DataListCell className="flex-[0.55]">
                            <DataListTextHeader>Status</DataListTextHeader>
                            <Badge variant={getStatusBadgeVariant(item.status)}>
                              {humanizeReportStatus(item.status)}
                            </Badge>
                            <DataListText className="mt-1 text-xs text-muted-foreground">
                              {formatInspectionMode(item.inspectionMode)}
                            </DataListText>
                          </DataListCell>
                          <DataListCell className="flex-[0.55] max-md:hidden">
                            <DataListTextHeader>Issues</DataListTextHeader>
                            <DataListText className="text-xs">
                              {item.issueCount} total
                            </DataListText>
                            <DataListText className="text-xs text-muted-foreground">
                              {item.criticalIssueCount} critical ·{' '}
                              {item.warningIssueCount} warnings
                            </DataListText>
                          </DataListCell>
                          <DataListCell className="flex-[0.55] max-lg:hidden">
                            <DataListTextHeader>Job</DataListTextHeader>
                            <DataListText className="text-xs">
                              {item.sourceLanguage} {'->'} {item.targetLanguage}{' '}
                              · {item.pageCount} pages
                            </DataListText>
                            <DataListText className="text-xs text-muted-foreground">
                              {formatDate(item.reportCreatedAt)}
                            </DataListText>
                          </DataListCell>
                          <DataListCell className="flex-[0.55] max-xl:hidden">
                            <DataListTextHeader>Cleanup</DataListTextHeader>
                            <DataListText className="text-xs">
                              {formatCleanupDecision(item)}
                            </DataListText>
                            <DataListText className="text-xs text-muted-foreground">
                              job {dayjs(item.jobCreatedAt).fromNow()}
                            </DataListText>
                          </DataListCell>
                        </DataListRow>
                      ))}
                    </DataList>

                    <div className="space-y-4">
                      <DimensionCard
                        emptyLabel="No issue kind yet"
                        items={stats.topIssueKinds}
                        title="Top Issue Kinds"
                      />
                      <DimensionCard
                        emptyLabel="No source language yet"
                        items={stats.sourceLanguages}
                        title="Source Languages"
                      />
                      <DimensionCard
                        emptyLabel="No target language yet"
                        items={stats.targetLanguages}
                        title="Target Languages"
                      />
                      <TrainingSignalsCard items={items} />
                    </div>
                  </div>
                </div>
              ))
              .exhaustive()}
          </div>
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

function DimensionCard(props: {
  emptyLabel: string;
  items: Array<{ count: number; value: string }>;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!props.items.length ? (
          <div className="text-xs text-muted-foreground">
            {props.emptyLabel}
          </div>
        ) : (
          props.items.map((item) => (
            <div
              key={item.value}
              className="flex min-w-0 items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate">{item.value}</span>
              <Badge variant="secondary">{item.count}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TrainingSignalsCard(props: {
  items: Array<{
    assetId: string;
    trainingSignals: string[];
  }>;
}) {
  const signals = Array.from(
    new Set(props.items.flatMap((item) => item.trainingSignals))
  ).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Signals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!signals.length ? (
          <div className="text-xs text-muted-foreground">
            No training signal in the visible reports.
          </div>
        ) : (
          signals.map((signal) => (
            <div
              key={signal}
              className="line-clamp-2 text-xs text-muted-foreground"
            >
              {signal}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function getChapterTitle(item: {
  chapterIdentity?:
    | {
        chapterName?: string | null;
        mangaTitle?: string | null;
      }
    | null
    | undefined;
  jobId: string;
}) {
  return item.chapterIdentity?.mangaTitle ?? item.jobId;
}

function getChapterSubtitle(item: {
  chapterNumber?: string | null;
  chapterIdentity?:
    | {
        chapterName?: string | null;
        chapterUrl: string;
        sourceName?: string | null;
      }
    | null
    | undefined;
  jobId: string;
}) {
  if (!item.chapterIdentity) {
    return `Job ${item.jobId}`;
  }

  return [
    item.chapterNumber
      ? `Chapter ${item.chapterNumber}`
      : (item.chapterIdentity.chapterName ?? 'Unknown chapter'),
    item.chapterIdentity.sourceName ?? 'Unknown source',
    item.chapterIdentity.chapterUrl,
  ]
    .filter(Boolean)
    .join(' · ');
}

function humanizeStatusFilter(status: TranslationQaStatusFilter) {
  return status === 'all' ? 'All' : humanizeReportStatus(status);
}

function humanizeReportStatus(
  status: Exclude<TranslationQaStatusFilter, 'all'>
) {
  return {
    blocked: 'Blocked',
    issues_found: 'Issues',
    ok: 'OK',
    unavailable: 'Unavailable',
  }[status];
}

function getStatusBadgeVariant(
  status: Exclude<TranslationQaStatusFilter, 'all'>
) {
  return {
    blocked: 'warning',
    issues_found: 'negative',
    ok: 'positive',
    unavailable: 'secondary',
  }[status] as 'negative' | 'positive' | 'secondary' | 'warning';
}

function getSeverityBadgeVariant(severity: 'critical' | 'info' | 'warning') {
  return {
    critical: 'negative',
    info: 'secondary',
    warning: 'warning',
  }[severity] as 'negative' | 'secondary' | 'warning';
}

function formatInspectionMode(
  mode: 'manifest_only' | 'unknown' | 'visual_and_manifest'
) {
  return {
    manifest_only: 'Manifest only',
    unknown: 'Unknown mode',
    visual_and_manifest: 'Visual + manifest',
  }[mode];
}

function formatCleanupDecision(item: {
  cleanupAnalysisCompleted?: boolean | null;
  cleanupCanDeleteOriginalUploads?: boolean | null;
}) {
  if (item.cleanupCanDeleteOriginalUploads === true) {
    return 'Uploads can be deleted';
  }

  if (item.cleanupCanDeleteOriginalUploads === false) {
    return item.cleanupAnalysisCompleted === false
      ? 'Analysis incomplete'
      : 'Uploads retained';
  }

  return 'Unknown';
}

function formatDate(date: Date) {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}
