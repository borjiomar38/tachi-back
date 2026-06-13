import { Link } from '@tanstack/react-router';
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  LockIcon,
  SparklesIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { ManhwaManagerSeriesList } from '@/features/manhwa/manager/server';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

interface PageManhwaSeriesListProps {
  data: ManhwaManagerSeriesList;
}

export const PageManhwaSeriesList = ({ data }: PageManhwaSeriesListProps) => {
  if (!data.canView) {
    return (
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Manhwa studio</PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockIcon className="size-4" />
                Admin only
              </CardTitle>
              <CardDescription>
                Original manhwa production data is restricted to admin accounts.
              </CardDescription>
            </CardHeader>
          </Card>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>Manhwa studio</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="max-w-7xl">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Original manhwa</CardTitle>
              <CardDescription>
                Select a series to inspect scenario gates, character dossiers,
                reference images, and chapter rendering progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Context root: {data.contextRoot ?? 'default'}
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {data.series.map((series) => (
              <Card key={series.slug}>
                <CardHeader>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{series.title}</CardTitle>
                        <Badge variant="secondary" size="sm">
                          {series.slug}
                        </Badge>
                      </div>
                      <CardDescription className="max-w-3xl">
                        {series.coreHook ?? 'No story hook yet.'}
                      </CardDescription>
                    </div>
                    <Link
                      to="/manager/manhwa/$slug"
                      params={{ slug: series.slug }}
                      className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
                    >
                      Open details
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 text-sm md:grid-cols-4">
                    <Metric
                      icon={<SparklesIcon className="size-4" />}
                      label="Next task"
                      value={humanizeTask(series.nextTask?.taskType)}
                    />
                    <Metric
                      icon={<SparklesIcon className="size-4" />}
                      label="References"
                      value={`${series.referenceGeneratedCount}/${series.referenceTotalCount}`}
                      subValue={`${series.referenceMissingCount} missing`}
                    />
                    <Metric
                      icon={<BookOpenTextIcon className="size-4" />}
                      label={`Chapter ${series.chapterNumber}`}
                      value={`${series.chapterImageCount}/${series.chapterPanelCount}`}
                      subValue={chapterStatusLabel(series)}
                    />
                    <Metric
                      label="Updated"
                      value={formatDateTime(series.generatedAt)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

function Metric(props: {
  icon?: ReactNode;
  label: string;
  subValue?: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {props.icon}
        {props.label}
      </p>
      <p className="mt-1 font-semibold">{props.value}</p>
      {props.subValue ? (
        <p className="mt-1 text-xs text-muted-foreground">{props.subValue}</p>
      ) : null}
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return 'missing';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC');
}

function chapterStatusLabel(series: ManhwaManagerSeriesList['series'][number]) {
  if (series.chapterRenderingActive) {
    return `panel ${
      series.chapterRenderingActivePanelNumber ??
      series.chapterImageNextPanelNumber ??
      'unknown'
    } rendering`;
  }

  if (series.chapterFailedCount > 0) {
    return `${series.chapterFailedCount} failed`;
  }

  if (series.chapterImageMissingCount === 0 && series.chapterPanelCount > 0) {
    return 'all panels ready';
  }

  return `${series.chapterImageMissingCount} missing`;
}

function humanizeTask(value?: string) {
  if (!value) {
    return 'unknown';
  }

  return value
    .split('-')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}
