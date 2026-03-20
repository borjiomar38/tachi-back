import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
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
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionProvider } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const windows = [24, 72, 168] as const;

export const PageProviderOps = (props: {
  search: {
    windowHours?: number;
  };
  setWindowHours: (windowHours: number) => void;
}) => {
  const windowHours = props.search.windowHours ?? 24;

  const summaryQuery = useQuery(
    orpc.provider.opsSummary.queryOptions({
      input: {
        windowHours,
      },
    })
  );

  const ui = getUiState((set) => {
    if (summaryQuery.status === 'pending') {
      return set('pending');
    }

    if (summaryQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      summary: summaryQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionProvider.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Provider Ops</PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {windows.map((item) => (
                <Button
                  key={item}
                  size="xs"
                  variant={windowHours === item ? 'default' : 'secondary'}
                  onClick={() => props.setWindowHours(item)}
                >
                  Last {item}h
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
                  <DataListErrorState retry={() => summaryQuery.refetch()} />
                </DataList>
              ))
              .match('default', ({ summary }) => (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <SummaryCard
                      label="Window"
                      subLabel={`Generated ${dayjs(summary.generatedAt).fromNow()}`}
                      value={`${summary.windowHours}h`}
                    />
                    <SummaryCard
                      label="Providers"
                      subLabel="Manifest providers in the ops view"
                      value={summary.providers.length.toString()}
                    />
                    <SummaryCard
                      label="Recent Failures"
                      subLabel="Failed provider usage rows"
                      value={summary.recentFailures.length.toString()}
                    />
                    <SummaryCard
                      label="Failed Jobs"
                      subLabel="Jobs created in the selected window"
                      value={
                        summary.jobStatusCounts
                          .find((item) => item.status === 'failed')
                          ?.count.toString() ?? '0'
                      }
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {summary.providers.map((provider) => (
                      <Card key={provider.provider}>
                        <CardHeader>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <CardTitle>{provider.provider}</CardTitle>
                              <CardDescription>
                                {provider.modelName ?? 'No model configured'} ·{' '}
                                {provider.launchStage}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={getHealthBadgeVariant(provider.health)}
                            >
                              {provider.health}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Metric
                              label="Usage"
                              value={provider.totalUsageCount.toString()}
                            />
                            <Metric
                              label="Success Rate"
                              value={`${provider.successRatePercent}%`}
                            />
                            <Metric
                              label="Requests"
                              value={provider.totalRequestCount.toString()}
                            />
                          </div>
                          <DataList>
                            {!provider.stages.length ? (
                              <DataListEmptyState>
                                No recent usage recorded for this provider.
                              </DataListEmptyState>
                            ) : (
                              provider.stages.map((stage) => (
                                <DataListRow
                                  key={`${provider.provider}-${stage.stage}`}
                                >
                                  <DataListCell>
                                    <DataListText className="font-medium">
                                      {stage.stage}
                                    </DataListText>
                                    <DataListText className="text-xs text-muted-foreground">
                                      {stage.totalUsageCount} usage row
                                      {stage.totalUsageCount === 1
                                        ? ''
                                        : 's'} ·{' '}
                                      {stage.totalPageCount} pages
                                    </DataListText>
                                  </DataListCell>
                                  <DataListCell className="flex-[0.5]">
                                    <DataListTextHeader>
                                      Health
                                    </DataListTextHeader>
                                    <Badge
                                      variant={getHealthBadgeVariant(
                                        stage.health
                                      )}
                                    >
                                      {stage.health}
                                    </Badge>
                                  </DataListCell>
                                  <DataListCell className="max-md:hidden">
                                    <DataListTextHeader>
                                      Success Rate
                                    </DataListTextHeader>
                                    <DataListText className="text-xs">
                                      {stage.successRatePercent}%
                                    </DataListText>
                                  </DataListCell>
                                </DataListRow>
                              ))
                            )}
                          </DataList>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Provider Failures</CardTitle>
                      <CardDescription>
                        Most recent failed provider usage rows in the selected
                        window.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataList>
                        {!summary.recentFailures.length ? (
                          <DataListEmptyState>
                            No provider failures were recorded in this window.
                          </DataListEmptyState>
                        ) : (
                          summary.recentFailures.map((failure) => (
                            <DataListRow
                              key={`${failure.jobId}-${failure.createdAt.toISOString()}`}
                            >
                              <DataListCell>
                                <DataListText className="font-medium">
                                  {failure.provider} · {failure.stage}
                                </DataListText>
                                <DataListText className="text-xs text-muted-foreground">
                                  {failure.licenseKey} ·{' '}
                                  {failure.installationId}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="flex-[0.6]">
                                <DataListTextHeader>Error</DataListTextHeader>
                                <DataListText className="text-xs">
                                  {failure.errorCode ?? 'Unknown error'}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="max-lg:hidden">
                                <DataListTextHeader>Job</DataListTextHeader>
                                <DataListText className="text-xs">
                                  {failure.jobId} · {failure.jobStatus}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="max-xl:hidden">
                                <DataListTextHeader>At</DataListTextHeader>
                                <DataListText className="text-xs">
                                  {dayjs(failure.createdAt).format(
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
                </>
              ))
              .exhaustive()}
          </div>
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function Metric(props: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="mt-1 text-sm font-medium">{props.value}</div>
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

function getHealthBadgeVariant(health: string) {
  switch (health) {
    case 'healthy':
      return 'positive' as const;
    case 'degraded':
      return 'warning' as const;
    case 'down':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}
