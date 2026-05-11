import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import {
  BanIcon,
  BookOpenIcon,
  Clock3Icon,
  LanguagesIcon,
  ListOrderedIcon,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { ConfirmResponsiveDrawer } from '@/components/ui/confirm-responsive-drawer';
import {
  DataList,
  DataListCell,
  DataListEmptyState,
  DataListRow,
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';
import { ResponsiveIconButton } from '@/components/ui/responsive-icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionDevice } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const languageDisplayNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, { type: 'language' })
    : null;

type ReadingActivityItem = {
  activityAt: Date;
  chapterCount?: number | null;
  chapterName?: string | null;
  chapterNumber?: string | null;
  chapterUrl?: string | null;
  chapters: Array<{
    name: string;
    number?: string | null;
    url?: string | null;
  }>;
  completedAt?: Date | null;
  createdAt: Date;
  id: string;
  jobId?: string | null;
  ledgerEntryId?: string | null;
  mangaTitle?: string | null;
  mangaUrl?: string | null;
  pageCount?: number | null;
  sourceLanguage?: string | null;
  sourceName?: string | null;
  sourceType: 'chapter_translation' | 'manga_page_translation';
  spentTokens?: number | null;
  status: string;
  targetLanguage?: string | null;
};

export const PageDevice = (props: { params: { id: string } }) => {
  const queryClient = useQueryClient();
  const deviceQuery = useQuery(
    orpc.device.getById.queryOptions({
      input: {
        deviceId: props.params.id,
      },
    })
  );

  const revokeDeviceMutation = useMutation({
    mutationFn: async () =>
      await orpc.device.revokeById.call({
        deviceId: props.params.id,
      }),
    onSuccess: async () => {
      toast.success('Device revoked.');
      await queryClient.invalidateQueries({
        queryKey: orpc.device.getById.key({
          input: {
            deviceId: props.params.id,
          },
        }),
      });
    },
    onError: () => {
      toast.error('Failed to revoke the device.');
    },
  });

  const ui = getUiState((set) => {
    if (deviceQuery.status === 'pending') {
      return set('pending');
    }

    if (
      deviceQuery.status === 'error' &&
      deviceQuery.error instanceof ORPCError &&
      deviceQuery.error.code === 'NOT_FOUND'
    ) {
      return set('not-found');
    }

    if (deviceQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      device: deviceQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionDevice.read]}>
      <PageLayout>
        <PageLayoutTopBar
          startActions={<BackButton />}
          endActions={ui
            .match('pending', () => null)
            .match('not-found', () => null)
            .match('error', () => null)
            .match('default', ({ device }) =>
              device.status === 'active' ? (
                <WithPermissions permissions={[permissionDevice.revoke]}>
                  <ConfirmResponsiveDrawer
                    confirmText="Revoke device"
                    confirmVariant="destructive"
                    description="This will revoke the installation and invalidate active mobile sessions."
                    onConfirm={() => revokeDeviceMutation.mutateAsync()}
                    title={`Revoke ${device.installationId}?`}
                  >
                    <ResponsiveIconButton
                      label="Revoke device"
                      loading={revokeDeviceMutation.isPending}
                      size="sm"
                      variant="ghost"
                    >
                      <BanIcon />
                    </ResponsiveIconButton>
                  </ConfirmResponsiveDrawer>
                </WithPermissions>
              ) : null
            )
            .exhaustive()}
        >
          <PageLayoutTopBarTitle>
            {ui
              .match('pending', () => <Skeleton className="h-4 w-64" />)
              .match('not-found', () => 'Device not found')
              .match('error', () => 'Device lookup failed')
              .match('default', ({ device }) => device.installationId)
              .exhaustive()}
          </PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-5xl">
          {ui
            .match('pending', () => <Spinner full />)
            .match('not-found', () => <PageError type="404" />)
            .match('error', () => <PageError type="unknown-server-error" />)
            .match('default', ({ device }) => (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Status"
                    subLabel={`Created ${dayjs(device.createdAt).format('DD/MM/YYYY HH:mm')}`}
                    value={device.status}
                  />
                  <SummaryCard
                    label="Platform"
                    subLabel={device.locale ?? 'No locale'}
                    value={device.platform}
                  />
                  <SummaryCard
                    label="App Version"
                    subLabel={`Build ${device.appBuild ?? 'unknown'}`}
                    value={device.appVersion ?? 'Unknown'}
                  />
                  <SummaryCard
                    label="Last Seen"
                    subLabel={device.lastIpAddress ?? 'No IP captured'}
                    value={
                      device.lastSeenAt
                        ? dayjs(device.lastSeenAt).fromNow()
                        : 'No heartbeat yet'
                    }
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Active License</CardTitle>
                    <CardDescription>
                      The currently active license bound to this installation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {device.activeLicense ? (
                      <div className="space-y-2 text-sm">
                        <div className="font-medium">
                          <Link
                            params={{ key: device.activeLicense.key }}
                            to="/manager/licenses/$key"
                          >
                            {device.activeLicense.key}
                          </Link>
                        </div>
                        <div className="text-muted-foreground">
                          {device.activeLicense.ownerEmail ?? 'No owner email'}
                        </div>
                        <Badge
                          variant={getStatusBadgeVariant(
                            device.activeLicense.status
                          )}
                        >
                          {device.activeLicense.status}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No active license binding exists for this installation.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ReadingActivityCard activity={device.readingActivity} />

                <Card>
                  <CardHeader>
                    <CardTitle>License Bindings</CardTitle>
                    <CardDescription>
                      Historical bindings attached to this device installation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataList>
                      {!device.bindings.length ? (
                        <DataListEmptyState>
                          No license bindings were found for this device.
                        </DataListEmptyState>
                      ) : (
                        device.bindings.map((binding) => (
                          <DataListRow key={binding.licenseBindingId} withHover>
                            <DataListCell>
                              <DataListText className="font-medium">
                                <Link
                                  params={{ key: binding.key }}
                                  to="/manager/licenses/$key"
                                >
                                  {binding.key}
                                  <span className="absolute inset-0" />
                                </Link>
                              </DataListText>
                              <DataListText className="text-xs text-muted-foreground">
                                {binding.ownerEmail ?? 'No owner email'}
                              </DataListText>
                            </DataListCell>
                            <DataListCell className="flex-[0.55]">
                              <DataListTextHeader>Status</DataListTextHeader>
                              <Badge
                                variant={getStatusBadgeVariant(binding.status)}
                              >
                                {binding.status}
                              </Badge>
                            </DataListCell>
                            <DataListCell className="max-md:hidden">
                              <DataListTextHeader>Bound</DataListTextHeader>
                              <DataListText className="text-xs">
                                {dayjs(binding.boundAt).format(
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
                    <CardTitle>Device Metadata</CardTitle>
                    <CardDescription>
                      Last recorded app/device metadata from activation and
                      heartbeat requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                      {JSON.stringify(device.metadata ?? {}, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            ))
            .exhaustive()}
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

function ReadingActivityCard(props: { activity: ReadingActivityItem[] }) {
  const totalChapters = props.activity.reduce(
    (total, item) =>
      total + (item.chapterCount ?? Math.max(item.chapters.length, 0)),
    0
  );
  const uniqueTitles = new Set(
    props.activity
      .map((item) => item.mangaTitle)
      .filter((title): title is string => Boolean(title))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Reading Activity</CardTitle>
            <CardDescription>
              Recent manhwa/manga chapter translation activity from this
              installation.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-sm bg-muted px-2 py-1">
              {props.activity.length} events
            </span>
            <span className="rounded-sm bg-muted px-2 py-1">
              {uniqueTitles.size} titles
            </span>
            <span className="rounded-sm bg-muted px-2 py-1">
              {totalChapters} chapters
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!props.activity.length ? (
          <DataList>
            <DataListEmptyState>
              No reading or translation activity has been recorded for this
              device yet.
            </DataListEmptyState>
          </DataList>
        ) : (
          <div className="space-y-3">
            {props.activity.map((item) => (
              <ReadingActivityRow item={item} key={item.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadingActivityRow(props: { item: ReadingActivityItem }) {
  const { item } = props;
  const title = item.mangaTitle ?? 'Unknown title';
  const chapterLabel = getChapterLabel(item);
  const visibleChapters = item.chapters.slice(0, 6);
  const hiddenChapterCount = item.chapters.length - visibleChapters.length;

  return (
    <div className="rounded-md border bg-card/40 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {humanizeToken(item.status)}
            </Badge>
            <Badge variant="secondary">{getActivitySourceLabel(item)}</Badge>
          </div>
          <div className="min-w-0">
            <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
              Title
            </div>
            <div className="text-base leading-6 font-semibold break-words">
              {item.mangaUrl ? (
                <a
                  className="hover:underline"
                  href={item.mangaUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {title}
                </a>
              ) : (
                title
              )}
            </div>
            {item.sourceName ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {item.sourceName}
              </div>
            ) : null}
          </div>
        </div>

        <div className="text-xs text-muted-foreground lg:text-right">
          <div>{dayjs(item.activityAt).fromNow()}</div>
          <div>{dayjs(item.activityAt).format('DD/MM/YYYY HH:mm')}</div>
          {item.jobId ? (
            <Link
              className="font-medium text-foreground hover:underline"
              params={{ id: item.jobId }}
              to="/manager/jobs/$id"
            >
              Open job
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ActivityFact
          icon={ListOrderedIcon}
          label="Chapter"
          value={chapterLabel}
        />
        <ActivityFact
          icon={LanguagesIcon}
          label="Language"
          value={`${formatLanguage(item.sourceLanguage)} -> ${formatLanguage(item.targetLanguage)}`}
        />
        <ActivityFact
          icon={BookOpenIcon}
          label="Pages / chapters"
          value={
            item.pageCount != null
              ? `${item.pageCount} pages`
              : `${item.chapterCount ?? item.chapters.length} chapters`
          }
        />
        <ActivityFact
          icon={Clock3Icon}
          label="Tokens"
          value={
            item.spentTokens != null ? item.spentTokens.toString() : 'Unknown'
          }
        />
      </div>

      {visibleChapters.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleChapters.map((chapter) => (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground"
              key={`${chapter.name}-${chapter.url ?? ''}`}
            >
              <span className="font-medium text-foreground">
                {chapter.number ? `#${chapter.number}` : 'Chapter'}
              </span>
              <span className="truncate">{chapter.name}</span>
            </span>
          ))}
          {hiddenChapterCount > 0 ? (
            <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
              +{hiddenChapterCount} more
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActivityFact(props: {
  icon: typeof BookOpenIcon;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-2 gap-y-1">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
          {props.label}
        </div>
        <div className="text-sm font-medium break-words">{props.value}</div>
      </div>
    </div>
  );
}

function getChapterLabel(item: ReadingActivityItem) {
  if (item.chapterNumber) {
    return `Chapter ${item.chapterNumber}`;
  }

  if (item.chapterName) {
    return item.chapterName;
  }

  if (item.chapterCount != null) {
    return `${item.chapterCount} chapters`;
  }

  return 'Unknown chapter';
}

function getActivitySourceLabel(item: ReadingActivityItem) {
  return item.sourceType === 'manga_page_translation'
    ? 'Manga page'
    : 'Chapter job';
}

function formatLanguage(language: string | null | undefined) {
  if (!language) {
    return 'Unknown';
  }

  if (language === 'auto') {
    return 'Auto';
  }

  const normalized = language.replace(/_/g, '-');
  const languageCode = normalized.split('-').at(0);
  let languageName = languageCode?.toUpperCase() ?? normalized.toUpperCase();

  try {
    languageName = languageCode
      ? (languageDisplayNames?.of(languageCode) ?? languageName)
      : languageName;
  } catch {
    languageName = normalized.toUpperCase();
  }

  return `${languageName} (${normalized})`;
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

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
    case 'paid':
    case 'posted':
    case 'redeemed':
      return 'positive' as const;
    case 'pending':
    case 'available':
    case 'partially_refunded':
    case 'suspended':
      return 'warning' as const;
    case 'revoked':
    case 'blocked':
    case 'released':
    case 'failed':
    case 'canceled':
    case 'expired':
    case 'refunded':
      return 'negative' as const;
    default:
      return 'secondary' as const;
  }
}

function humanizeToken(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}
