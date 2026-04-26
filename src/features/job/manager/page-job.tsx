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

export const PageJob = (props: { params: { id: string } }) => {
  const jobQuery = useQuery(
    orpc.job.getById.queryOptions({
      input: {
        id: props.params.id,
      },
    })
  );

  const ui = getUiState((set) => {
    if (jobQuery.status === 'pending') {
      return set('pending');
    }

    if (
      jobQuery.status === 'error' &&
      jobQuery.error instanceof ORPCError &&
      jobQuery.error.code === 'NOT_FOUND'
    ) {
      return set('not-found');
    }

    if (jobQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      job: jobQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionJob.read]}>
      <PageLayout>
        <PageLayoutTopBar startActions={<BackButton />}>
          <PageLayoutTopBarTitle>
            {ui
              .match('pending', () => <Skeleton className="h-4 w-64" />)
              .match('not-found', () => 'Job not found')
              .match('error', () => 'Job lookup failed')
              .match('default', ({ job }) => job.id)
              .exhaustive()}
          </PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl">
          {ui
            .match('pending', () => <Spinner full />)
            .match('not-found', () => <PageError type="404" />)
            .match('error', () => <PageError type="unknown-server-error" />)
            .match('default', ({ job }) => (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Status"
                    subLabel={`Created ${dayjs(job.createdAt).format('DD/MM/YYYY HH:mm')}`}
                    value={humanizeStatus(job.status)}
                  />
                  <SummaryCard
                    label="Pages"
                    subLabel={`uploaded ${job.uploadedPageCount}/${job.pageCount}`}
                    value={job.pageCount.toString()}
                  />
                  <SummaryCard
                    label="Tokens"
                    subLabel="spent / reserved"
                    value={`${job.spentTokens}/${job.reservedTokens}`}
                  />
                  <SummaryCard
                    label="Duration"
                    subLabel={`${job.sourceLanguage} -> ${job.targetLanguage}`}
                    value={
                      job.durationMs != null
                        ? formatDurationMs(job.durationMs)
                        : 'Pending'
                    }
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Related Entities</CardTitle>
                      <CardDescription>
                        License and installation currently attached to this job.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          License
                        </div>
                        <div className="font-medium">
                          <Link
                            params={{ key: job.license.key }}
                            to="/manager/licenses/$key"
                          >
                            {job.license.key}
                          </Link>
                        </div>
                        <div className="text-muted-foreground">
                          {job.license.ownerEmail ?? 'No owner email'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          Device
                        </div>
                        <div className="font-medium">
                          <Link
                            params={{ id: job.device.id }}
                            to="/manager/devices/$id"
                          >
                            {job.device.installationId}
                          </Link>
                        </div>
                        <div className="text-muted-foreground">
                          {job.device.appVersion ?? 'Unknown app version'} ·{' '}
                          {job.device.appBuild ?? 'Unknown build'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Provider Resolution</CardTitle>
                      <CardDescription>
                        Requested versus resolved providers for OCR and
                        translation.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          OCR
                        </div>
                        <div>
                          requested {job.requestedOcrProvider ?? 'auto'} /
                          resolved {job.resolvedOcrProvider ?? 'auto'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          Translation
                        </div>
                        <div>
                          requested {job.requestedTranslationProvider ?? 'auto'}{' '}
                          / resolved {job.resolvedTranslationProvider ?? 'auto'}
                        </div>
                      </div>
                      {!!job.errorCode && (
                        <div className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 rounded-md border p-3 text-xs">
                          {job.errorCode}
                          {job.errorMessage ? ` · ${job.errorMessage}` : ''}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Lifecycle Events</CardTitle>
                      <CardDescription>
                        Derived operator-facing trail built from job timestamps
                        and provider calls.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataList>
                        {job.lifecycleEvents.map((event) => (
                          <DataListRow
                            key={`${event.type}-${event.at.toISOString()}`}
                          >
                            <DataListCell>
                              <DataListText className="font-medium">
                                {event.title}
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                {event.detail}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.5]">
                              <DataListTextHeader>Level</DataListTextHeader>
                              <Badge
                                variant={getLevelBadgeVariant(event.level)}
                              >
                                {event.level}
                              </Badge>
                            </DataListCell>
                            <DataListCell className="max-md:hidden">
                              <DataListTextHeader>At</DataListTextHeader>
                              <DataListText className="text-xs">
                                {dayjs(event.at).format('DD/MM/YYYY HH:mm:ss')}
                              </DataListText>
                            </DataListCell>
                          </DataListRow>
                        ))}
                      </DataList>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Provider Usage</CardTitle>
                      <CardDescription>
                        OCR and translation calls recorded against this job.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataList>
                        {!job.providerUsages.length ? (
                          <DataListEmptyState>
                            No provider usage rows were recorded for this job.
                          </DataListEmptyState>
                        ) : (
                          job.providerUsages.map((usage) => (
                            <DataListRow key={usage.id}>
                              <DataListCell>
                                <DataListText className="font-medium">
                                  {usage.provider} · {usage.stage}
                                </DataListText>
                                <DataListText className="text-xs text-muted-foreground">
                                  {usage.modelName ?? 'No model name'} ·{' '}
                                  {usage.requestCount} request
                                  {usage.requestCount === 1 ? '' : 's'}
                                  {' · '}
                                  {usage.pageCount} page
                                  {usage.pageCount === 1 ? '' : 's'}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="flex-[0.5]">
                                <DataListTextHeader>Status</DataListTextHeader>
                                <Badge
                                  variant={
                                    usage.success ? 'positive' : 'negative'
                                  }
                                >
                                  {usage.success ? 'success' : 'failure'}
                                </Badge>
                              </DataListCell>
                              <DataListCell className="max-md:hidden">
                                <DataListTextHeader>Latency</DataListTextHeader>
                                <DataListText className="text-xs">
                                  {usage.latencyMs != null
                                    ? formatDurationMs(usage.latencyMs)
                                    : 'n/a'}
                                </DataListText>
                              </DataListCell>
                            </DataListRow>
                          ))
                        )}
                      </DataList>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Assets</CardTitle>
                      <CardDescription>
                        Uploaded pages and generated result artifacts for this
                        job.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataList>
                        {job.assets.map((asset) => (
                          <DataListRow key={asset.id}>
                            <DataListCell>
                              <DataListText className="font-medium">
                                {asset.kind}
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                {asset.originalFileName ??
                                  asset.objectKey ??
                                  'No file name'}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.45]">
                              <DataListTextHeader>Page</DataListTextHeader>
                              <DataListText className="text-xs">
                                {asset.pageNumber ?? '-'}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="max-md:hidden">
                              <DataListTextHeader>Size</DataListTextHeader>
                              <DataListText className="text-xs">
                                {asset.sizeBytes ?? 0} bytes
                              </DataListText>
                            </DataListCell>
                          </DataListRow>
                        ))}
                      </DataList>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Token Ledger</CardTitle>
                      <CardDescription>
                        Token reservation and spend entries tied to this job.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataList>
                        {!job.ledgerEntries.length ? (
                          <DataListEmptyState>
                            No token ledger entries are linked to this job.
                          </DataListEmptyState>
                        ) : (
                          job.ledgerEntries.map((entry) => (
                            <DataListRow key={entry.id}>
                              <DataListCell>
                                <DataListText className="font-medium">
                                  {entry.type}
                                </DataListText>
                                <DataListText className="text-xs text-muted-foreground">
                                  {entry.description ?? 'No description'}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="flex-[0.45]">
                                <DataListTextHeader>Delta</DataListTextHeader>
                                <DataListText className="text-xs">
                                  {entry.deltaTokens >= 0 ? '+' : ''}
                                  {entry.deltaTokens}
                                </DataListText>
                              </DataListCell>
                              <DataListCell className="max-md:hidden">
                                <DataListTextHeader>Status</DataListTextHeader>
                                <Badge
                                  variant={getStatusBadgeVariant(entry.status)}
                                >
                                  {entry.status}
                                </Badge>
                              </DataListCell>
                            </DataListRow>
                          ))
                        )}
                      </DataList>
                    </CardContent>
                  </Card>
                </div>

                {(job.resultSummary || job.errorMessage) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Result And Error Payloads</CardTitle>
                      <CardDescription>
                        Early operational payload visibility while dedicated
                        traces are still pending.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!!job.resultSummary && (
                        <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                          {JSON.stringify(job.resultSummary, null, 2)}
                        </pre>
                      )}
                      {!!job.errorMessage && (
                        <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                          {job.errorMessage}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                )}
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

function formatDurationMs(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(1)} s`;
  }

  return `${(durationMs / 60_000).toFixed(1)} min`;
}

function getLevelBadgeVariant(level: string) {
  switch (level) {
    case 'success':
      return 'positive' as const;
    case 'warning':
      return 'warning' as const;
    case 'error':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'posted':
    case 'completed':
      return 'positive' as const;
    case 'pending':
    case 'processing':
    case 'queued':
      return 'warning' as const;
    case 'failed':
    case 'voided':
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
