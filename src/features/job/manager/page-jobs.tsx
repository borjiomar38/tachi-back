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

const statusFilters = [
  'all',
  'queued',
  'processing',
  'failed',
  'completed',
] as const;

type BackofficeJobStatusFilter = (typeof statusFilters)[number];

export const PageJobs = (props: {
  search: {
    searchTerm?: string;
    status?: BackofficeJobStatusFilter;
  };
}) => {
  const router = useRouter();
  const searchTerm = props.search.searchTerm ?? '';
  const status = props.search.status ?? 'all';
  const normalizedSearchTerm = searchTerm.trim();

  const jobsQuery = useQuery(
    orpc.job.list.queryOptions({
      input: {
        limit: 25,
        searchTerm: normalizedSearchTerm,
        status,
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
          status,
        },
        to: '.',
      }),
  };

  const ui = getUiState((set) => {
    if (jobsQuery.status === 'pending') {
      return set('pending');
    }

    if (jobsQuery.status === 'error') {
      return set('error');
    }

    if (!jobsQuery.data.items.length) {
      return set('empty');
    }

    return set('default', {
      jobs: jobsQuery.data.items,
      total: jobsQuery.data.total,
    });
  });

  return (
    <GuardPermissions permissions={[permissionJob.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Jobs</PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...searchInputProps}
            className="max-w-sm max-md:hidden"
            size="sm"
          />
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
                        searchTerm,
                        status: item,
                      },
                      to: '.',
                    })
                  }
                >
                  {humanizeStatus(item)}
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
                  <DataListErrorState retry={() => jobsQuery.refetch()} />
                </DataList>
              ))
              .match('empty', () => (
                <DataList>
                  <DataListEmptyState>
                    No hosted jobs match the current filters yet.
                  </DataListEmptyState>
                </DataList>
              ))
              .match('default', ({ jobs, total }) => (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <SummaryCard
                      label="Visible Jobs"
                      subLabel={`${jobs.length} shown in the current view`}
                      value={jobs.length.toString()}
                    />
                    <SummaryCard
                      label="Processing"
                      subLabel="Queued or running right now"
                      value={jobs
                        .filter((job) =>
                          ['queued', 'processing'].includes(job.status)
                        )
                        .length.toString()}
                    />
                    <SummaryCard
                      label="Failures"
                      subLabel="Jobs that ended in failure"
                      value={jobs
                        .filter((job) => job.status === 'failed')
                        .length.toString()}
                    />
                    <SummaryCard
                      label="Completed"
                      subLabel={`Total matching jobs: ${total}`}
                      value={jobs
                        .filter((job) => job.status === 'completed')
                        .length.toString()}
                    />
                  </div>

                  <DataList>
                    <DataListRowResults>
                      {status === 'all'
                        ? `Latest hosted jobs (${jobs.length}/${total})`
                        : `${humanizeStatus(status)} jobs (${jobs.length}/${total})`}
                    </DataListRowResults>
                    {jobs.map((job) => (
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
                          <DataListText className="text-xs text-muted-foreground">
                            {job.sourceLanguage}
                            {' -> '}
                            {job.targetLanguage} · {job.pageCount} pages
                          </DataListText>
                        </DataListCell>
                        <DataListCell className="flex-[0.5]">
                          <DataListTextHeader>Status</DataListTextHeader>
                          <Badge variant={getStatusBadgeVariant(job.status)}>
                            {humanizeStatus(job.status)}
                          </Badge>
                        </DataListCell>
                        <DataListCell className="max-md:hidden">
                          <DataListTextHeader>Providers</DataListTextHeader>
                          <DataListText className="text-xs">
                            {job.resolvedOcrProvider ?? 'auto'} /{' '}
                            {job.resolvedTranslationProvider ?? 'auto'}
                          </DataListText>
                          <DataListText className="text-xs text-muted-foreground">
                            {job.providerUsageCount} provider call
                            {job.providerUsageCount === 1 ? '' : 's'}
                          </DataListText>
                        </DataListCell>
                        <DataListCell className="max-md:hidden">
                          <DataListTextHeader>Tokens</DataListTextHeader>
                          <DataListText className="text-xs">
                            {job.spentTokens}/{job.reservedTokens}
                          </DataListText>
                          <DataListText className="text-xs text-muted-foreground">
                            uploaded {job.uploadedPageCount}/{job.pageCount}
                          </DataListText>
                        </DataListCell>
                        <DataListCell className="flex-[0.65] max-xl:hidden">
                          <DataListTextHeader>Timeline</DataListTextHeader>
                          <DataListText className="text-xs">
                            {dayjs(job.createdAt).fromNow()}
                          </DataListText>
                          <DataListText className="text-xs text-muted-foreground">
                            {job.durationMs != null
                              ? `duration ${formatDurationMs(job.durationMs)}`
                              : job.status === 'processing'
                                ? 'in progress'
                                : 'duration pending'}
                          </DataListText>
                        </DataListCell>
                      </DataListRow>
                    ))}
                  </DataList>
                </>
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

function formatDurationMs(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)} s`;
  }

  return `${(durationMs / 60_000).toFixed(1)} min`;
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'positive' as const;
    case 'queued':
    case 'processing':
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

function humanizeStatus(status: string) {
  return status.replaceAll('_', ' ');
}
