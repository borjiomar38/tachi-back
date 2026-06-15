import { getUiState } from '@bearstudio/ui-state';
import { ORPCError } from '@orpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcwIcon, SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DataList,
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
} from '@/components/ui/datalist';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionProvider } from '@/features/auth/permissions';
import {
  buildMetadataValueKey,
  useContentPolicySelectionStore,
} from '@/features/content-policy/manager/use-content-policy-selection-store';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';
import type { Outputs } from '@/server/router';

type MetadataValue =
  Outputs['contentPolicy']['metadataTranslationGate']['discoveredValues'][number];

const metadataFields = [
  'genres',
  'tags',
  'categories',
  'rating',
  'contentRating',
] as const;

export const PageContentPolicy = () => {
  const { t } = useTranslation(['contentPolicy']);
  const queryClient = useQueryClient();
  const policyQuery = useQuery(
    orpc.contentPolicy.metadataTranslationGate.queryOptions({
      input: undefined,
    })
  );
  const [searchTerm, setSearchTerm] = useState('');
  const selectedKeys = useContentPolicySelectionStore(
    (state) => state.selectedKeys
  );
  const setSelectedValues = useContentPolicySelectionStore(
    (state) => state.setSelectedValues
  );
  const toggleValue = useContentPolicySelectionStore(
    (state) => state.toggleValue
  );
  const selectValues = useContentPolicySelectionStore(
    (state) => state.selectValues
  );
  const clearValues = useContentPolicySelectionStore(
    (state) => state.clearValues
  );

  useEffect(() => {
    if (!policyQuery.data) {
      return;
    }

    setSelectedValues(
      policyQuery.data.discoveredValues.filter((value) => value.isBlocked)
    );
  }, [policyQuery.data, setSelectedValues]);

  const filteredValues = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const values = policyQuery.data?.discoveredValues ?? [];

    if (!normalizedSearchTerm) {
      return values;
    }

    return values.filter((value) =>
      [value.field, value.value, value.normalizedValue, ...value.examples].some(
        (item) => item.toLowerCase().includes(normalizedSearchTerm)
      )
    );
  }, [policyQuery.data?.discoveredValues, searchTerm]);

  const groupedValues = useMemo(
    () =>
      metadataFields.map((field) => ({
        field,
        values: filteredValues.filter((value) => value.field === field),
      })),
    [filteredValues]
  );

  const selectedValues = useMemo(() => {
    const values = policyQuery.data?.discoveredValues ?? [];

    return values.filter((value) =>
      selectedKeys.has(buildMetadataValueKey(value))
    );
  }, [policyQuery.data?.discoveredValues, selectedKeys]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      await orpc.contentPolicy.updateMetadataTranslationGate.call({
        blockedValues: selectedValues.map((value) => ({
          field: value.field,
          normalizedValue: value.normalizedValue,
          value: value.value,
        })),
      }),
    onSuccess: async () => {
      toast.success(t('contentPolicy:manager.saved'));
      await queryClient.invalidateQueries({
        queryKey: orpc.contentPolicy.metadataTranslationGate.key({
          input: undefined,
        }),
      });
    },
    onError: (error) => {
      const message =
        error instanceof ORPCError
          ? error.message
          : t('contentPolicy:manager.saveFailed');

      toast.error(message);
    },
  });

  const ui = getUiState((set) => {
    if (policyQuery.status === 'pending') {
      return set('pending');
    }

    if (policyQuery.status === 'error') {
      return set('error');
    }

    return set('default', {
      policy: policyQuery.data,
    });
  });

  return (
    <GuardPermissions permissions={[permissionProvider.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>
            {t('contentPolicy:manager.title')}
          </PageLayoutTopBarTitle>
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
                <DataListErrorState retry={() => policyQuery.refetch()} />
              </DataList>
            ))
            .match('default', ({ policy }) => (
              <div className="space-y-4">
                <Alert>
                  <ShieldCheckIcon />
                  <AlertTitle>
                    {t('contentPolicy:manager.notice.title')}
                  </AlertTitle>
                  <AlertDescription>
                    {t('contentPolicy:manager.notice.description')}
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle>
                          {t('contentPolicy:manager.checklist.title')}
                        </CardTitle>
                        <CardDescription>
                          {t('contentPolicy:manager.checklist.description')}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {t(`contentPolicy:manager.mode.${policy.mode}`)}
                        </Badge>
                        <Badge variant="secondary">
                          {t('contentPolicy:manager.selectedCount', {
                            count: selectedKeys.size,
                          })}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <SearchInput
                        className="md:max-w-sm"
                        delay={150}
                        onChange={(value) => setSearchTerm(value ?? '')}
                        placeholder={t('contentPolicy:manager.search')}
                        value={searchTerm}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            selectValues(policy.discoveredValues.slice(0))
                          }
                        >
                          {t('contentPolicy:manager.actions.selectAll')}
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setSelectedValues(policy.defaultValues)
                          }
                        >
                          <RotateCcwIcon />
                          {t('contentPolicy:manager.actions.resetDefaults')}
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={clearValues}
                        >
                          {t('contentPolicy:manager.actions.clear')}
                        </Button>
                        <GuardPermissions
                          permissions={[permissionProvider.update]}
                        >
                          <Button
                            disabled={saveMutation.isPending}
                            size="sm"
                            type="button"
                            onClick={() => saveMutation.mutate()}
                          >
                            <SaveIcon />
                            {t('contentPolicy:manager.actions.save')}
                          </Button>
                        </GuardPermissions>
                      </div>
                    </div>

                    {filteredValues.length ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {groupedValues.map((group) =>
                          group.values.length ? (
                            <MetadataFieldGroup
                              key={group.field}
                              fieldLabel={t(
                                `contentPolicy:manager.fields.${group.field}`
                              )}
                              selectedKeys={selectedKeys}
                              values={group.values}
                              onToggle={toggleValue}
                            />
                          ) : null
                        )}
                      </div>
                    ) : (
                      <DataList>
                        <DataListEmptyState>
                          {t('contentPolicy:manager.empty')}
                        </DataListEmptyState>
                      </DataList>
                    )}
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

interface MetadataFieldGroupProps {
  fieldLabel: string;
  selectedKeys: Set<string>;
  values: MetadataValue[];
  onToggle: (value: MetadataValue) => void;
}

const MetadataFieldGroup = (props: MetadataFieldGroupProps) => (
  <div className="rounded-md border border-border">
    <div className="flex items-center justify-between border-b border-border px-3 py-2">
      <h2 className="text-sm font-medium">{props.fieldLabel}</h2>
      <Badge variant="secondary" size="xs">
        {props.values.length}
      </Badge>
    </div>
    <div className="max-h-96 divide-y divide-border overflow-y-auto">
      {props.values.map((value) => {
        const key = buildMetadataValueKey(value);
        const checked = props.selectedKeys.has(key);

        return (
          <Checkbox
            key={key}
            checked={checked}
            labelProps={{
              className:
                'flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-muted/50',
            }}
            onCheckedChange={() => props.onToggle(value)}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {value.value}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {value.examples.join(', ')}
              </span>
            </span>
            <Badge variant={checked ? 'negative' : 'secondary'} size="xs">
              {value.count}
            </Badge>
          </Checkbox>
        );
      })}
    </div>
  </div>
);
