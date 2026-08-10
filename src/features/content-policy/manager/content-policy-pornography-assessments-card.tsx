import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BanIcon,
  BotIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  EyeIcon,
  EyeOffIcon,
  ImageOffIcon,
  InfoIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';
import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
} from '@/components/ui/datalist';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { permissionProvider } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import type { Outputs } from '@/server/router';

const statusFilters = [
  'all',
  'pending',
  'blocked',
  'review',
  'errors',
  'allowed',
] as const;

type StatusFilter = (typeof statusFilters)[number];
type AssessmentResponse = Outputs['contentPolicy']['pornographyAssessments'];
type Assessment = AssessmentResponse['items'][number];
type EffectiveStatus = Assessment['effectiveStatus'];
type ManualDecision = Assessment['manualDecision'];

const assessmentLimit = 100;

export const ContentPolicyPornographyAssessmentsCard = () => {
  const { t } = useTranslation(['contentPolicy']);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const automationSettingsQuery = useQuery(
    orpc.contentPolicy.pornographyAutomationSettings.queryOptions({
      input: undefined,
    })
  );
  const queryInput = {
    limit: assessmentLimit,
    search: search.trim() || undefined,
    status,
  };
  const assessmentsQuery = useQuery(
    orpc.contentPolicy.pornographyAssessments.queryOptions({
      input: queryInput,
    })
  );

  const invalidateAssessments = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.contentPolicy.pornographyAssessments.key(),
    });
  };

  const decisionMutation = useMutation({
    mutationFn: async (input: {
      assessmentId: string;
      decision: 'allow' | 'block' | null;
    }) => await orpc.contentPolicy.setPornographyManualDecision.call(input),
    onSuccess: async (_data, input) => {
      toast.success(
        t(
          input.decision === 'allow'
            ? 'contentPolicy:manager.automatic.actions.allowedSuccess'
            : input.decision === 'block'
              ? 'contentPolicy:manager.automatic.actions.blockedSuccess'
              : 'contentPolicy:manager.automatic.actions.restoredSuccess'
        )
      );
      await invalidateAssessments();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          t('contentPolicy:manager.automatic.actions.updateFailed')
        )
      );
    },
  });
  const retryMutation = useMutation({
    mutationFn: async (assessmentId: string) =>
      await orpc.contentPolicy.retryPornographyAssessment.call({
        assessmentId,
      }),
    onSuccess: async () => {
      toast.success(t('contentPolicy:manager.automatic.actions.retrySuccess'));
      await invalidateAssessments();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          t('contentPolicy:manager.automatic.actions.retryFailed')
        )
      );
    },
  });
  const backfillMutation = useMutation({
    mutationFn: async () =>
      await orpc.contentPolicy.backfillPornographyAssessments.call({
        limit: 50,
      }),
    onSuccess: async (result) => {
      toast.success(
        t('contentPolicy:manager.automatic.actions.backfillSuccess', {
          count: result.queued,
        })
      );
      await invalidateAssessments();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          t('contentPolicy:manager.automatic.actions.backfillFailed')
        )
      );
    },
  });
  const setDecision = async (
    assessmentId: string,
    decision: 'allow' | 'block' | null
  ) => {
    try {
      await decisionMutation.mutateAsync({ assessmentId, decision });
    } catch {
      // The mutation displays the actionable error and keeps the drawer stable.
    }
  };
  const counts = assessmentsQuery.data?.counts;
  const items = assessmentsQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>
                {t('contentPolicy:manager.automatic.title')}
              </CardTitle>
              {automationSettingsQuery.data ? (
                <Badge
                  size="sm"
                  variant={
                    automationSettingsQuery.data.enabled
                      ? 'positive'
                      : 'warning'
                  }
                >
                  {t(
                    automationSettingsQuery.data.enabled
                      ? 'contentPolicy:manager.automatic.automationEnabled'
                      : 'contentPolicy:manager.automatic.automationDisabled'
                  )}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="max-w-2xl">
              {t('contentPolicy:manager.automatic.description')}
            </CardDescription>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BotIcon className="size-3.5" />
              {t('contentPolicy:manager.automatic.cacheNotice')}
            </div>
            {automationSettingsQuery.data?.enabled === false ? (
              <div className="mt-2 flex max-w-2xl items-start gap-2 rounded-md border border-warning-500/30 bg-warning-500/5 px-3 py-2 text-xs text-muted-foreground">
                <ShieldOffIcon className="mt-0.5 size-3.5 shrink-0 text-warning-600" />
                <span>
                  {t('contentPolicy:manager.automatic.disabledNotice')}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <WithPermissions permissions={[permissionProvider.update]}>
              <ConfirmResponsiveDrawer
                confirmText={t(
                  'contentPolicy:manager.automatic.confirm.backfill.confirm'
                )}
                description={t(
                  'contentPolicy:manager.automatic.confirm.backfill.description'
                )}
                title={t(
                  'contentPolicy:manager.automatic.confirm.backfill.title'
                )}
                onConfirm={async () => {
                  try {
                    await backfillMutation.mutateAsync();
                  } catch {
                    // The mutation already displays the actionable error.
                  }
                }}
              >
                <Button
                  disabled={
                    backfillMutation.isPending ||
                    automationSettingsQuery.data?.enabled === false
                  }
                  loading={backfillMutation.isPending}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <BotIcon />
                  {t('contentPolicy:manager.automatic.actions.backfill')}
                </Button>
              </ConfirmResponsiveDrawer>
            </WithPermissions>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={t(
                      'contentPolicy:manager.automatic.actions.refresh'
                    )}
                    disabled={assessmentsQuery.isFetching}
                    size="icon-sm"
                    type="button"
                    variant="secondary"
                    onClick={() => assessmentsQuery.refetch()}
                  />
                }
              >
                <RefreshCcwIcon
                  className={cn(assessmentsQuery.isFetching && 'animate-spin')}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t('contentPolicy:manager.automatic.actions.refresh')}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            count={counts?.pending ?? null}
            icon={<Clock3Icon />}
            label={t('contentPolicy:manager.automatic.summary.pending')}
            tone="neutral"
          />
          <SummaryCard
            count={counts?.blocked ?? null}
            icon={<BanIcon />}
            label={t(
              automationSettingsQuery.data?.enabled === false
                ? 'contentPolicy:manager.automatic.summary.blockedCached'
                : 'contentPolicy:manager.automatic.summary.blocked'
            )}
            tone="negative"
          />
          <SummaryCard
            count={counts?.review ?? null}
            icon={<TriangleAlertIcon />}
            label={t('contentPolicy:manager.automatic.summary.review')}
            tone="warning"
          />
          <SummaryCard
            count={counts?.errors ?? null}
            icon={<CircleAlertIcon />}
            label={t('contentPolicy:manager.automatic.summary.errors')}
            tone="negative"
          />
          <SummaryCard
            className="max-sm:col-span-2"
            count={counts?.allowed ?? null}
            icon={<CheckCircle2Icon />}
            label={t('contentPolicy:manager.automatic.summary.allowed')}
            tone="positive"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            className="sm:max-w-md"
            delay={200}
            placeholder={t('contentPolicy:manager.automatic.search')}
            value={search}
            onChange={(value) => setSearch(value ?? '')}
          />
          <Select
            items={statusFilters.map((value) => ({
              label: t(`contentPolicy:manager.automatic.filters.${value}`),
              value,
            }))}
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusFilters.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`contentPolicy:manager.automatic.filters.${value}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {assessmentsQuery.status === 'pending' ? (
          <DataList>
            <DataListLoadingState />
          </DataList>
        ) : null}
        {assessmentsQuery.status === 'error' ? (
          <DataList>
            <DataListErrorState retry={() => assessmentsQuery.refetch()} />
          </DataList>
        ) : null}
        {assessmentsQuery.status === 'success' && !items.length ? (
          <DataList>
            <DataListEmptyState>
              {t('contentPolicy:manager.automatic.empty')}
            </DataListEmptyState>
          </DataList>
        ) : null}
        {assessmentsQuery.status === 'success' && items.length ? (
          <>
            <div className="hidden overflow-x-auto rounded-md border md:block">
              <table className="w-full min-w-[74rem] text-left text-xs">
                <thead className="border-b bg-muted/30 text-muted-foreground">
                  <tr>
                    <TableHeading className="min-w-64">
                      {t('contentPolicy:manager.automatic.columns.title')}
                    </TableHeading>
                    <TableHeading className="min-w-40">
                      {t('contentPolicy:manager.automatic.columns.source')}
                    </TableHeading>
                    <TableHeading>
                      {t('contentPolicy:manager.automatic.columns.status')}
                    </TableHeading>
                    <TableHeading>
                      <span className="inline-flex items-center gap-1">
                        {t('contentPolicy:manager.automatic.columns.score')}
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <InfoIcon className="size-3.5 cursor-help" />
                            }
                          />
                          <TooltipContent className="max-w-64">
                            {t(
                              'contentPolicy:manager.automatic.scoreDescription'
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </TableHeading>
                    <TableHeading>
                      {t('contentPolicy:manager.automatic.columns.model')}
                    </TableHeading>
                    <TableHeading className="min-w-36">
                      {t('contentPolicy:manager.automatic.columns.checkedAt')}
                    </TableHeading>
                    <TableHeading className="text-right">
                      {t('contentPolicy:manager.automatic.columns.actions')}
                    </TableHeading>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <AssessmentTableRow
                      key={item.id}
                      automationEnabled={
                        automationSettingsQuery.data?.enabled !== false
                      }
                      decisionMutation={decisionMutation}
                      item={item}
                      retryMutation={retryMutation}
                      onDecision={setDecision}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {items.map((item) => (
                <AssessmentMobileCard
                  key={item.id}
                  automationEnabled={
                    automationSettingsQuery.data?.enabled !== false
                  }
                  decisionMutation={decisionMutation}
                  item={item}
                  retryMutation={retryMutation}
                  onDecision={setDecision}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {t('contentPolicy:manager.automatic.results', {
                count: items.length,
                total: counts?.total ?? items.length,
              })}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

const SummaryCard = (props: {
  className?: string;
  count: number | null;
  icon: ReactNode;
  label: string;
  tone: 'negative' | 'neutral' | 'positive' | 'warning';
}) => (
  <div
    className={cn(
      'flex min-w-0 items-center gap-3 rounded-md border px-3 py-2.5',
      props.className
    )}
  >
    <span
      className={cn(
        'shrink-0 [&>svg]:size-4',
        props.tone === 'negative' && 'text-negative-500',
        props.tone === 'warning' && 'text-warning-500',
        props.tone === 'positive' && 'text-positive-500',
        props.tone === 'neutral' && 'text-muted-foreground'
      )}
    >
      {props.icon}
    </span>
    <span className="min-w-0">
      <span className="block truncate text-xs font-medium">{props.label}</span>
      <span className="block text-lg leading-tight font-semibold tabular-nums">
        {props.count === null ? '—' : props.count.toLocaleString()}
      </span>
    </span>
  </div>
);

const TableHeading = (props: ComponentProps<'th'>) => (
  <th {...props} className={cn('px-3 py-2 font-medium', props.className)} />
);

interface AssessmentRowProps {
  automationEnabled: boolean;
  decisionMutation: {
    isPending: boolean;
    variables?: {
      assessmentId: string;
      decision: 'allow' | 'block' | null;
    };
  };
  item: Assessment;
  retryMutation: {
    isPending: boolean;
    mutate: (assessmentId: string) => void;
    variables?: string;
  };
  onDecision: (
    assessmentId: string,
    decision: 'allow' | 'block' | null
  ) => Promise<void>;
}

const AssessmentTableRow = (props: AssessmentRowProps) => {
  const { i18n, t } = useTranslation(['contentPolicy']);
  const item = props.item;

  return (
    <tr className="align-middle hover:bg-muted/20">
      <td className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <SafePoster title={item.title} url={item.thumbnailUrl} />
          <div className="min-w-0">
            <p className="max-w-56 truncate text-sm font-medium">
              {item.title}
            </p>
            <p className="truncate text-muted-foreground">
              {t('contentPolicy:manager.automatic.assessmentId', {
                id: shortId(item.id),
              })}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <SourceDetails item={item} />
      </td>
      <td className="px-3 py-2">
        <StatusBadge
          automationEnabled={props.automationEnabled}
          manualDecision={item.manualDecision}
          status={item.effectiveStatus}
        />
      </td>
      <td className="px-3 py-2 font-medium tabular-nums">
        {formatScore(item.sexualScore)}
      </td>
      <td className="max-w-40 px-3 py-2">
        <span className="block truncate font-mono text-2xs" title={item.model}>
          {item.model}
        </span>
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {formatDate(item.classifiedAt ?? item.updatedAt, i18n.language)}
      </td>
      <td className="px-3 py-2">
        <AssessmentActions {...props} />
      </td>
    </tr>
  );
};

const AssessmentMobileCard = (props: AssessmentRowProps) => {
  const { i18n, t } = useTranslation(['contentPolicy']);
  const item = props.item;

  return (
    <article className="space-y-3 rounded-md border p-3">
      <div className="flex min-w-0 gap-3">
        <SafePoster title={item.title} url={item.thumbnailUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">{item.title}</h3>
              <SourceDetails item={item} />
            </div>
            <StatusBadge
              automationEnabled={props.automationEnabled}
              manualDecision={item.manualDecision}
              status={item.effectiveStatus}
            />
          </div>
          <p className="mt-1 text-2xs text-muted-foreground">
            {t('contentPolicy:manager.automatic.assessmentId', {
              id: shortId(item.id),
            })}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-sm bg-muted/30 p-2 text-xs">
        <MobileDetail
          label={t('contentPolicy:manager.automatic.columns.score')}
          value={formatScore(item.sexualScore)}
        />
        <MobileDetail
          label={t('contentPolicy:manager.automatic.columns.model')}
          value={item.model}
        />
        <MobileDetail
          label={t('contentPolicy:manager.automatic.columns.checkedAt')}
          value={formatDate(item.classifiedAt ?? item.updatedAt, i18n.language)}
        />
      </dl>
      <AssessmentActions {...props} />
    </article>
  );
};

const MobileDetail = (props: { label: string; value: string }) => (
  <div className="min-w-0">
    <dt className="truncate text-2xs text-muted-foreground">{props.label}</dt>
    <dd className="mt-0.5 truncate font-medium" title={props.value}>
      {props.value}
    </dd>
  </div>
);

const SafePoster = (props: { title: string; url: string | null }) => {
  const { t } = useTranslation(['contentPolicy']);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!props.url || hasError) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-sm border bg-muted text-muted-foreground">
        <ImageOffIcon className="size-4" />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={t(
          isRevealed
            ? 'contentPolicy:manager.automatic.poster.hide'
            : 'contentPolicy:manager.automatic.poster.reveal',
          { title: props.title }
        )}
        aria-pressed={isRevealed}
        className="group relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-sm border bg-muted"
        render={<button type="button" />}
        onClick={() => setIsRevealed((value) => !value)}
      >
        <img
          alt=""
          className={cn(
            'size-full scale-110 object-cover transition duration-200',
            !isRevealed && 'blur-md'
          )}
          loading="lazy"
          referrerPolicy="no-referrer"
          src={props.url}
          onError={() => setHasError(true)}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white transition group-hover:bg-black/40">
          {isRevealed ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t(
          isRevealed
            ? 'contentPolicy:manager.automatic.poster.hideShort'
            : 'contentPolicy:manager.automatic.poster.revealShort'
        )}
      </TooltipContent>
    </Tooltip>
  );
};

const SourceDetails = ({ item }: { item: Assessment }) => {
  const { t } = useTranslation(['contentPolicy']);
  const primary =
    item.sourceName ??
    item.extensionName ??
    item.sourceId ??
    t('contentPolicy:manager.automatic.unknownSource');
  const secondary = [
    item.extensionName !== primary ? item.extensionName : null,
    item.extensionPackageName,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{primary}</p>
      {secondary ? (
        <p className="max-w-48 truncate text-2xs text-muted-foreground">
          {secondary}
        </p>
      ) : null}
    </div>
  );
};

const StatusBadge = (props: {
  automationEnabled: boolean;
  manualDecision: ManualDecision;
  status: EffectiveStatus;
}) => {
  const { t } = useTranslation(['contentPolicy']);
  const variant = getStatusBadgeVariant(props.status);

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge size="sm" variant={variant}>
        {t(`contentPolicy:manager.automatic.status.${props.status}`)}
      </Badge>
      {props.manualDecision ? (
        <span className="text-3xs text-muted-foreground">
          {t('contentPolicy:manager.automatic.manualOverride')}
        </span>
      ) : !props.automationEnabled ? (
        <span className="text-3xs text-muted-foreground">
          {t('contentPolicy:manager.automatic.notApplied')}
        </span>
      ) : null}
    </div>
  );
};

const AssessmentActions = (props: AssessmentRowProps) => {
  const { t } = useTranslation(['contentPolicy']);
  const item = props.item;
  const pendingDecisionId = props.decisionMutation.isPending
    ? (props.decisionMutation.variables?.assessmentId ?? null)
    : null;
  const pendingRetryId = props.retryMutation.isPending
    ? (props.retryMutation.variables ?? null)
    : null;

  return (
    <WithPermissions
      fallback={
        <span className="block text-right text-2xs text-muted-foreground">
          {t('contentPolicy:manager.automatic.actions.readOnly')}
        </span>
      }
      permissions={[permissionProvider.update]}
    >
      <div className="flex flex-wrap justify-end gap-1.5">
        <Button
          aria-label={t('contentPolicy:manager.automatic.actions.retryTitle', {
            title: item.title,
          })}
          disabled={
            !props.automationEnabled ||
            item.effectiveStatus !== 'errors' ||
            pendingRetryId === item.id
          }
          loading={pendingRetryId === item.id}
          size="xs"
          type="button"
          variant="secondary"
          onClick={() => props.retryMutation.mutate(item.id)}
        >
          <RotateCcwIcon />
          {t('contentPolicy:manager.automatic.actions.retry')}
        </Button>

        {item.manualDecision ? (
          <ConfirmDecision
            decision={null}
            item={item}
            pendingDecisionId={pendingDecisionId}
            onDecision={props.onDecision}
          />
        ) : null}
        <ConfirmDecision
          decision="allow"
          item={item}
          pendingDecisionId={pendingDecisionId}
          onDecision={props.onDecision}
        />
        <ConfirmDecision
          decision="block"
          item={item}
          pendingDecisionId={pendingDecisionId}
          onDecision={props.onDecision}
        />
      </div>
    </WithPermissions>
  );
};

const ConfirmDecision = (props: {
  decision: ManualDecision;
  item: Assessment;
  pendingDecisionId: string | null;
  onDecision: (
    assessmentId: string,
    decision: 'allow' | 'block' | null
  ) => Promise<void>;
}) => {
  const { t } = useTranslation(['contentPolicy']);
  const action = props.decision ?? 'restore';
  const isCurrent = props.item.manualDecision === props.decision;
  const buttonVariant: ComponentProps<typeof Button>['variant'] =
    props.decision === 'block'
      ? 'destructive-secondary'
      : props.decision === 'allow'
        ? 'secondary'
        : 'ghost';
  const icon =
    props.decision === 'block' ? (
      <BanIcon />
    ) : props.decision === 'allow' ? (
      <ShieldCheckIcon />
    ) : (
      <BotIcon />
    );

  return (
    <ConfirmResponsiveDrawer
      confirmText={t(
        `contentPolicy:manager.automatic.confirm.${action}.confirm`
      )}
      confirmVariant={props.decision === 'block' ? 'destructive' : 'default'}
      description={t(
        `contentPolicy:manager.automatic.confirm.${action}.description`,
        { title: props.item.title }
      )}
      enabled={!isCurrent}
      title={t(`contentPolicy:manager.automatic.confirm.${action}.title`)}
      onConfirm={() => props.onDecision(props.item.id, props.decision)}
    >
      <Button
        aria-label={t(
          `contentPolicy:manager.automatic.actions.${action}Title`,
          { title: props.item.title }
        )}
        disabled={isCurrent || props.pendingDecisionId === props.item.id}
        size="xs"
        type="button"
        variant={buttonVariant}
      >
        {icon}
        {t(`contentPolicy:manager.automatic.actions.${action}`)}
      </Button>
    </ConfirmResponsiveDrawer>
  );
};

function getStatusBadgeVariant(status: EffectiveStatus) {
  switch (status) {
    case 'blocked':
    case 'errors':
      return 'negative' as const;
    case 'review':
      return 'warning' as const;
    case 'allowed':
      return 'positive' as const;
    case 'pending':
    default:
      return 'secondary' as const;
  }
}

function formatScore(value: number | null) {
  return value === null ? '—' : value.toFixed(2);
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shortId(value: string) {
  return value.length > 8 ? value.slice(-8) : value;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ORPCError ? error.message : fallback;
}
