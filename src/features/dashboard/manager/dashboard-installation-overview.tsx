import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { ArrowRightIcon, SmartphoneIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { orpc } from '@/lib/orpc/client';
import type { Outputs } from '@/lib/orpc/types';

import { ButtonLink } from '@/components/ui/button-link';
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
} from '@/components/ui/datalist';

type InstallationOverview = Outputs['productAnalytics']['installationOverview'];

const truncateInstallationId = (installationId: string) => {
  if (installationId.length <= 20) {
    return installationId;
  }

  return `${installationId.slice(0, 10)}…${installationId.slice(-7)}`;
};

const InstallationPeriodMetric = (props: {
  label: string;
  value: number;
  numberFormatter: Intl.NumberFormat;
}) => {
  return (
    <div className="rounded-sm border bg-background/70 px-3 py-3">
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {props.numberFormatter.format(props.value)}
      </div>
    </div>
  );
};

const RecentFirstInstallations = (props: {
  data: InstallationOverview;
  dateTimeFormatter: Intl.DateTimeFormat;
}) => {
  const { t } = useTranslation(['dashboard']);

  if (!props.data.recentFirstInstallations.length) {
    return (
      <DataList>
        <DataListEmptyState className="min-h-32">
          {t('dashboard:installations.empty')}
        </DataListEmptyState>
      </DataList>
    );
  }

  return (
    <DataList>
      {props.data.recentFirstInstallations.map((installation) => (
        <DataListRow key={installation.id} withHover>
          <Link
            className="flex min-w-0 flex-1 items-center gap-3 px-1"
            params={{ id: installation.id }}
            to="/manager/devices/$id"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <SmartphoneIcon className="size-4" />
            </div>
            <DataListCell className="min-w-0 px-0 py-2.5">
              <DataListText
                className="font-medium"
                title={installation.installationId}
              >
                {truncateInstallationId(installation.installationId)}
              </DataListText>
              <DataListText className="text-xs text-muted-foreground">
                {installation.appVersion
                  ? t('dashboard:installations.version', {
                      version: installation.appVersion,
                    })
                  : t('dashboard:installations.unknownVersion')}
                {' · '}
                {installation.locale ??
                  t('dashboard:installations.unknownLocale')}
              </DataListText>
            </DataListCell>
            <time
              className="shrink-0 text-xs text-muted-foreground"
              dateTime={installation.firstInstalledAt.toISOString()}
              title={t('dashboard:installations.firstInstalledAt', {
                date: props.dateTimeFormatter.format(
                  installation.firstInstalledAt
                ),
              })}
            >
              {dayjs(installation.firstInstalledAt).fromNow()}
            </time>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </DataListRow>
      ))}
    </DataList>
  );
};

const InstallationOverviewContent = (props: { data: InstallationOverview }) => {
  const { i18n, t } = useTranslation(['dashboard']);
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [i18n.language]
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(24rem,1.2fr)]">
      <div className="rounded-sm border bg-muted/30 p-4">
        <div className="text-sm font-medium text-muted-foreground">
          {t('dashboard:installations.allTime')}
        </div>
        <div className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
          {numberFormatter.format(props.data.counts.total)}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <InstallationPeriodMetric
            label={t('dashboard:installations.last24Hours')}
            numberFormatter={numberFormatter}
            value={props.data.counts.last24Hours}
          />
          <InstallationPeriodMetric
            label={t('dashboard:installations.last7Days')}
            numberFormatter={numberFormatter}
            value={props.data.counts.last7Days}
          />
          <InstallationPeriodMetric
            label={t('dashboard:installations.last30Days')}
            numberFormatter={numberFormatter}
            value={props.data.counts.last30Days}
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              {t('dashboard:installations.latestTitle')}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {t('dashboard:installations.latestDescription')}
            </div>
          </div>
          <ButtonLink
            className="shrink-0"
            size="sm"
            to="/manager/devices"
            variant="secondary"
          >
            {t('dashboard:installations.viewAll')}
          </ButtonLink>
        </div>
        <RecentFirstInstallations
          data={props.data}
          dateTimeFormatter={dateTimeFormatter}
        />
      </div>
    </div>
  );
};

export const DashboardInstallationOverview = () => {
  const { t } = useTranslation(['dashboard']);
  const installationOverviewQuery = useQuery(
    orpc.productAnalytics.installationOverview.queryOptions({
      refetchInterval: 60_000,
    })
  );
  const ui = getUiState((set) => {
    if (installationOverviewQuery.status === 'pending') {
      return set('pending');
    }

    if (installationOverviewQuery.status === 'error') {
      return set('error');
    }

    return set('default', installationOverviewQuery.data);
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle>{t('dashboard:installations.title')}</CardTitle>
        <CardDescription>
          {t('dashboard:installations.definition')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {ui
          .match('pending', () => (
            <DataList>
              <DataListLoadingState />
            </DataList>
          ))
          .match('error', () => (
            <DataList>
              <DataListErrorState
                retry={() => installationOverviewQuery.refetch()}
              />
            </DataList>
          ))
          .match('default', (data) => (
            <InstallationOverviewContent data={data} />
          ))
          .exhaustive()}
      </CardContent>
    </Card>
  );
};
