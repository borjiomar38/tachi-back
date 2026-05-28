import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ExternalLinkIcon } from 'lucide-react';
import { ReactNode } from 'react';

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

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionJob } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageSeoDistribution = () => {
  const overviewQuery = useQuery(orpc.seoDistribution.overview.queryOptions());
  const ui = getUiState((set) => {
    if (overviewQuery.status === 'pending') {
      return set('pending');
    }

    if (overviewQuery.status === 'error') {
      return set('error');
    }

    return set('default', overviewQuery.data);
  });

  return (
    <GuardPermissions permissions={[permissionJob.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>SEO Distribution</PageLayoutTopBarTitle>
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
                <DataListErrorState retry={() => overviewQuery.refetch()} />
              </DataList>
            ))
            .match('default', (data) => (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                  <SummaryCard
                    label="Agent"
                    subLabel={formatDateTime(data.status.generatedAt)}
                    value={
                      data.status.stale
                        ? 'Stale'
                        : humanizeStage(data.status.stage)
                    }
                    variant={data.status.stale ? 'negative' : 'default'}
                  />
                  <SummaryCard
                    label="Interval"
                    subLabel="Wake delay"
                    value={`${data.status.intervalSeconds}s`}
                  />
                  <SummaryCard
                    label="Accounts"
                    subLabel={`${data.accounts.length} tracked platforms`}
                    value={`${data.stats.configuredAccountCount}/${data.accounts.length}`}
                  />
                  <SummaryCard
                    label="Setup"
                    subLabel={`${data.stats.accountSetupNeedsOwnerCount} need owner/API`}
                    value={data.stats.accountSetupCount.toString()}
                  />
                  <SummaryCard
                    label="Authority"
                    subLabel={`${data.stats.highAuthorityOpportunityCount} high priority`}
                    value={data.stats.authorityOpportunityCount.toString()}
                  />
                  <SummaryCard
                    label="Link assets"
                    subLabel="Reusable backlink angles"
                    value={data.stats.linkAssetCount.toString()}
                  />
                  <SummaryCard
                    label="Reports"
                    subLabel={`${data.stats.pushedReportCount} pushed branches`}
                    value={data.stats.reportCount.toString()}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                  <div className="space-y-4">
                    <SectionCard
                      title="Official Account Setup"
                      description="Nayovi-owned profiles to create or connect before external distribution."
                    >
                      <RowsTable
                        empty="No account setup tasks found yet."
                        rows={data.accountSetup}
                        primaryKey="Platform"
                        secondaryKey="Purpose"
                        metaKeys={['Priority', 'Status']}
                        trailingKey="Next action"
                      />
                    </SectionCard>

                    <SectionCard
                      title="Authority Opportunities"
                      description="Continuous discovery queue for high-authority sites, communities, resource pages, directories, partners, and launch surfaces."
                    >
                      <RowsTable
                        empty="No authority opportunities found yet."
                        rows={data.authorityOpportunities}
                        primaryKey="Target"
                        secondaryKey="Fit"
                        metaKeys={['Authority tier', 'Category']}
                        trailingKey="Next action"
                      />
                    </SectionCard>

                    <SectionCard
                      title="Platform Drafts"
                      description="Specific posts, comments, listings, pitches, and messages prepared by the agent."
                    >
                      <RowsTable
                        empty="No platform drafts found yet."
                        rows={data.platformDrafts}
                        primaryKey="Draft topic"
                        secondaryKey="Community/location"
                        metaKeys={['Platform', 'Status']}
                        trailingKey="Review notes"
                      />
                    </SectionCard>

                    <SectionCard
                      title="Content Calendar"
                      description="Owned SEO pages and articles that support social/backlink trust."
                    >
                      <RowsTable
                        empty="No content calendar entries found yet."
                        rows={data.contentCalendar}
                        primaryKey="Target keyword"
                        secondaryKey="Search intent"
                        metaKeys={['Status', 'Target URL']}
                        trailingKey="Next action"
                      />
                    </SectionCard>

                    <SectionCard
                      title="Linkable Assets"
                      description="Reusable trust assets for reviewers, communities, partners, and investors."
                    >
                      <RowsTable
                        empty="No link assets found yet."
                        rows={data.linkAssets}
                        primaryKey="Asset"
                        secondaryKey="Audience"
                        metaKeys={['Status', 'Link target']}
                        trailingKey="Next action"
                      />
                    </SectionCard>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Cycle</CardTitle>
                        <CardDescription>
                          {data.status.cycleId ?? 'No cycle recorded yet'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <KeyValue
                          label="Stage"
                          value={humanizeStage(data.status.stage)}
                        />
                        <KeyValue
                          label="Branch"
                          value={data.status.branch ?? '-'}
                        />
                        <KeyValue
                          label="Commit"
                          value={data.status.commit ?? '-'}
                        />
                        <KeyValue
                          label="Mode"
                          value={`${data.status.externalPostingMode}, accounts ${
                            data.status.accountCreationEnabled
                              ? 'enabled'
                              : 'disabled'
                          }`}
                        />
                        <KeyValue
                          label="Git"
                          value={`push ${data.status.gitPushEnabled ? 'on' : 'off'}, master ${
                            data.status.autoMergeToMaster ? 'on' : 'off'
                          }`}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Connected Accounts</CardTitle>
                        <CardDescription>
                          Non-secret capability registry for social posting.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {data.accounts.length ? (
                          data.accounts.map((account) => (
                            <div
                              key={account.platform}
                              className="rounded-md border p-3 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                  {account.displayName}
                                </span>
                                <Badge
                                  variant={
                                    account.configured
                                      ? 'positive'
                                      : 'secondary'
                                  }
                                >
                                  {account.configured
                                    ? 'Configured'
                                    : 'Draft only'}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {account.actionMode}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {account.notes}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No account registry found yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Latest Report</CardTitle>
                        <CardDescription>
                          {data.latestReport
                            ? formatDateTime(data.latestReport.updatedAt)
                            : 'No report yet'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {data.latestReport ? (
                          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                            {data.latestReport.excerpt}
                          </pre>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            The agent has not written a cycle report yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ))
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

type DistributionRow = {
  columns: Record<string, string>;
  id: string;
};

function RowsTable(props: {
  empty: string;
  metaKeys: string[];
  primaryKey: string;
  rows: DistributionRow[];
  secondaryKey: string;
  trailingKey: string;
}) {
  if (!props.rows.length) {
    return (
      <DataList>
        <DataListEmptyState>{props.empty}</DataListEmptyState>
      </DataList>
    );
  }

  return (
    <DataList>
      <DataListRowResults>{props.rows.length} entries</DataListRowResults>
      {props.rows.map((row) => (
        <DataListRow key={row.id}>
          <DataListCell className="flex-[1.8]">
            <DataListText className="font-medium">
              {row.columns[props.primaryKey] ?? '-'}
            </DataListText>
            <DataListText className="text-xs text-muted-foreground">
              {row.columns[props.secondaryKey] ?? '-'}
            </DataListText>
            <DataListText className="line-clamp-2 text-xs whitespace-normal text-muted-foreground">
              {row.columns[props.trailingKey] ?? '-'}
            </DataListText>
          </DataListCell>
          <DataListCell className="flex-[0.8]">
            <DataListTextHeader>
              {props.metaKeys[0] ?? 'Meta'}
            </DataListTextHeader>
            <Badge variant="secondary">
              {props.metaKeys[0]
                ? (row.columns[props.metaKeys[0]] ?? '-')
                : '-'}
            </Badge>
            <DataListText className="mt-1 line-clamp-2 text-xs whitespace-normal text-muted-foreground">
              {formatMaybeLink(
                props.metaKeys[1] ? row.columns[props.metaKeys[1]] : undefined
              )}
            </DataListText>
          </DataListCell>
        </DataListRow>
      ))}
    </DataList>
  );
}

function SummaryCard(props: {
  label: string;
  subLabel: string;
  value: string;
  variant?: 'default' | 'negative';
}) {
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-2xl">
          <Badge
            variant={props.variant === 'negative' ? 'negative' : 'default'}
          >
            {props.value}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {props.subLabel}
      </CardContent>
    </Card>
  );
}

function SectionCard(props: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent>{props.children}</CardContent>
    </Card>
  );
}

function KeyValue(props: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="min-w-0 truncate font-medium">{props.value}</span>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not available';
  }

  return dayjs(value).format('DD MMM YYYY HH:mm');
}

function humanizeStage(stage: string) {
  return stage
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatMaybeLink(value: string | undefined) {
  if (!value) {
    return '-';
  }

  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <ExternalLinkIcon className="size-3 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
}
