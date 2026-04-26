import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { orpc } from '@/lib/orpc/client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionProvider } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
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
  const queryClient = useQueryClient();
  const windowHours = props.search.windowHours ?? 24;

  const summaryQuery = useQuery(
    orpc.provider.opsSummary.queryOptions({
      input: {
        windowHours,
      },
    })
  );
  const routingConfigQuery = useQuery(
    orpc.provider.routingConfig.queryOptions({
      input: undefined,
    })
  );
  const [translationProviderPrimary, setTranslationProviderPrimary] = useState<
    'gemini' | 'openai'
  >('gemini');
  const [geminiTranslationModel, setGeminiTranslationModel] = useState('');
  const [openaiTranslationModel, setOpenaiTranslationModel] = useState('');

  useEffect(() => {
    if (!routingConfigQuery.data) {
      return;
    }

    setTranslationProviderPrimary(
      routingConfigQuery.data.current.translationProviderPrimary
    );
    setGeminiTranslationModel(
      routingConfigQuery.data.current.geminiTranslationModel
    );
    setOpenaiTranslationModel(
      routingConfigQuery.data.current.openaiTranslationModel
    );
  }, [routingConfigQuery.data]);

  const updateRoutingConfigMutation = useMutation({
    mutationFn: async () =>
      await orpc.provider.updateRoutingConfig.call({
        geminiTranslationModel: geminiTranslationModel.trim(),
        openaiTranslationModel: openaiTranslationModel.trim(),
        translationProviderPrimary,
      }),
    onSuccess: async () => {
      toast.success('Provider routing updated.');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.provider.routingConfig.key({
            input: undefined,
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.provider.opsSummary.key({
            input: {
              windowHours,
            },
          }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.provider.manifest.key({
            input: undefined,
          }),
        }),
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof ORPCError
          ? error.message
          : 'Failed to update provider routing.';

      toast.error(message);
    },
  });

  const activeProvider = routingConfigQuery.data?.translationProviders.find(
    (provider) => provider.provider === translationProviderPrimary
  );
  const translationProviderOptions =
    routingConfigQuery.data?.translationProviders.map((provider) => ({
      label: `${provider.provider}${provider.enabled ? '' : ' (missing API key)'}`,
      value: provider.provider,
    })) ?? [];
  const currentActiveModel =
    translationProviderPrimary === 'gemini'
      ? geminiTranslationModel
      : openaiTranslationModel;
  const activeModelOptions = useMemo(() => {
    const options = activeProvider?.modelOptions ?? [];

    if (!currentActiveModel.trim()) {
      return options;
    }

    return options.includes(currentActiveModel)
      ? options
      : [currentActiveModel, ...options];
  }, [activeProvider?.modelOptions, currentActiveModel]);
  const activeModelSelectOptions = activeModelOptions.map((value) => ({
    label: value,
    value,
  }));

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

            <Card>
              <CardHeader>
                <CardTitle>Translation Routing</CardTitle>
                <CardDescription>
                  Choose which hosted translation API and model are used for
                  mobile jobs. API keys stay on the server.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {routingConfigQuery.status === 'pending' ? (
                  <DataList>
                    <DataListLoadingState />
                  </DataList>
                ) : routingConfigQuery.status === 'error' ? (
                  <Alert variant="destructive">
                    <TriangleAlertIcon />
                    <AlertTitle>Provider config failed to load</AlertTitle>
                    <AlertDescription>
                      <p>
                        The current provider routing could not be loaded from
                        the server.
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => routingConfigQuery.refetch()}
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {!routingConfigQuery.data.ocr.enabled ? (
                      <Alert variant="destructive">
                        <TriangleAlertIcon />
                        <AlertTitle>OCR is not configured</AlertTitle>
                        <AlertDescription>
                          <p>
                            {routingConfigQuery.data.ocr.reason ??
                              'Google Cloud Vision is required to process hosted translation jobs.'}
                          </p>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <CheckCircle2Icon />
                        <AlertTitle>OCR ready</AlertTitle>
                        <AlertDescription>
                          <p>
                            {routingConfigQuery.data.ocr.provider} ·{' '}
                            {routingConfigQuery.data.ocr.modelName}
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Translation provider
                        </p>
                        <Select
                          items={translationProviderOptions}
                          value={translationProviderPrimary}
                          onValueChange={(value) => {
                            if (value !== 'gemini' && value !== 'openai') {
                              return;
                            }

                            setTranslationProviderPrimary(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {routingConfigQuery.data.translationProviders.map(
                                (provider) => (
                                  <SelectItem
                                    key={provider.provider}
                                    value={provider.provider}
                                  >
                                    {provider.provider}
                                    {provider.enabled
                                      ? ''
                                      : ' (missing API key)'}
                                  </SelectItem>
                                )
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Only server-configured providers are usable by mobile
                          users.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {translationProviderPrimary === 'gemini'
                            ? 'Gemini model'
                            : 'OpenAI model'}
                        </p>
                        <Select
                          items={activeModelSelectOptions}
                          value={currentActiveModel}
                          onValueChange={(value) => {
                            if (!value) {
                              return;
                            }

                            if (translationProviderPrimary === 'gemini') {
                              setGeminiTranslationModel(value);
                              return;
                            }

                            setOpenaiTranslationModel(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {activeModelOptions.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Input
                          value={currentActiveModel}
                          onChange={(event) => {
                            if (translationProviderPrimary === 'gemini') {
                              setGeminiTranslationModel(
                                event.currentTarget.value
                              );
                              return;
                            }

                            setOpenaiTranslationModel(
                              event.currentTarget.value
                            );
                          }}
                          placeholder="Override with a custom model name"
                        />
                        <p className="text-xs text-muted-foreground">
                          {translationProviderPrimary === 'openai'
                            ? 'OpenAI options are loaded from the account model list. You can still type any compatible model manually.'
                            : 'Pick a recommended model above or type a custom model name manually.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {routingConfigQuery.data.translationProviders.map(
                        (provider) => (
                          <div
                            key={provider.provider}
                            className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-foreground">
                                {provider.provider}
                              </div>
                              <Badge
                                variant={
                                  provider.enabled ? 'default' : 'secondary'
                                }
                              >
                                {provider.enabled
                                  ? 'Configured'
                                  : 'Missing key'}
                              </Badge>
                            </div>
                            <div className="mt-2 text-muted-foreground">
                              Current model: {provider.modelName}
                            </div>
                            {!provider.enabled && provider.reason ? (
                              <div className="mt-1 text-destructive">
                                {provider.reason}
                              </div>
                            ) : null}
                          </div>
                        )
                      )}
                    </div>

                    <WithPermissions permissions={[permissionProvider.update]}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => routingConfigQuery.refetch()}
                        >
                          Refresh
                        </Button>
                        <Button
                          loading={updateRoutingConfigMutation.isPending}
                          onClick={() => updateRoutingConfigMutation.mutate()}
                        >
                          Save routing
                        </Button>
                      </div>
                    </WithPermissions>
                  </>
                )}
              </CardContent>
            </Card>

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
