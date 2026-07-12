import { InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';

import { permissionProvider } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';
import { buildMetadataValueKey } from '@/features/content-policy/manager/use-content-policy-selection-store';
import type { Outputs } from '@/server/router';

type MetadataValue =
  Outputs['contentPolicy']['chapterOverview']['discoveredValues'][number];
type ManualMangaBlock = NonNullable<
  Outputs['contentPolicy']['chapterOverview']['manualMangaBlock']
>;

const metadataFields = [
  'genres',
  'tags',
  'categories',
  'rating',
  'contentRating',
] as const;

export interface ContentPolicyMetadataCardProps {
  description: string;
  manualMangaBlock?: ManualMangaBlock | null;
  pendingMetadataKey: string | null;
  status: 'error' | 'pending' | 'success';
  title: string;
  values: MetadataValue[];
  isManualBlockPending?: boolean;
  onManualMangaBlockChange?: (
    identity: ManualMangaBlock['identity'],
    blocked: boolean
  ) => void;
  onMetadataValueChange: (value: MetadataValue, blocked: boolean) => void;
  onRetry?: () => void;
}

export const ContentPolicyMetadataCard = (
  props: ContentPolicyMetadataCardProps
) => {
  const { t } = useTranslation(['contentPolicy']);
  const groupedValues = metadataFields
    .map((field) => ({
      field,
      values: props.values.filter((value) => value.field === field),
    }))
    .filter((group) => group.values.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>{props.title}</CardTitle>
            <CardDescription>{props.description}</CardDescription>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <InfoIcon className="size-3.5" />
              {t('contentPolicy:context.checkedBlockedGlobally')}
            </div>
          </div>
          {props.manualMangaBlock ? (
            <div className="flex items-center gap-3 rounded-sm border px-3 py-2">
              <div className="text-right">
                <div className="text-sm font-medium">
                  {t('contentPolicy:context.manualBlock.label')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('contentPolicy:context.manualBlock.description')}
                </div>
              </div>
              <WithPermissions
                fallback={
                  <Switch checked={props.manualMangaBlock.blocked} disabled />
                }
                loadingFallback={
                  <Switch checked={props.manualMangaBlock.blocked} disabled />
                }
                permissions={[permissionProvider.update]}
              >
                <Switch
                  aria-label={t('contentPolicy:context.manualBlock.label')}
                  checked={props.manualMangaBlock.blocked}
                  disabled={props.isManualBlockPending}
                  onCheckedChange={(blocked) =>
                    props.onManualMangaBlockChange?.(
                      props.manualMangaBlock!.identity,
                      blocked
                    )
                  }
                />
              </WithPermissions>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {props.status === 'pending' ? (
          <DataList>
            <DataListLoadingState />
          </DataList>
        ) : null}
        {props.status === 'error' ? (
          <DataList>
            <DataListErrorState retry={props.onRetry} />
          </DataList>
        ) : null}
        {props.status === 'success' && !groupedValues.length ? (
          <DataList>
            <DataListEmptyState>
              {t('contentPolicy:context.empty')}
            </DataListEmptyState>
          </DataList>
        ) : null}
        {props.status === 'success' && groupedValues.length ? (
          <div className="grid overflow-hidden rounded-sm border md:grid-cols-2 xl:grid-cols-5">
            {groupedValues.map((group) => (
              <MetadataGroup
                key={group.field}
                fieldLabel={t(`contentPolicy:manager.fields.${group.field}`)}
                pendingMetadataKey={props.pendingMetadataKey}
                values={group.values}
                onMetadataValueChange={props.onMetadataValueChange}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

interface MetadataGroupProps {
  fieldLabel: string;
  pendingMetadataKey: string | null;
  values: MetadataValue[];
  onMetadataValueChange: (value: MetadataValue, blocked: boolean) => void;
}

const MetadataGroup = (props: MetadataGroupProps) => (
  <div className="min-w-0 border-b last:border-b-0 md:border-r md:nth-[2n]:border-r-0 xl:border-b-0 xl:last:border-r-0 xl:nth-[2n]:border-r">
    <div className="flex h-9 items-center justify-between border-b px-3">
      <h3 className="truncate text-xs font-medium">{props.fieldLabel}</h3>
      <Badge size="xs" variant="secondary">
        {props.values.length}
      </Badge>
    </div>
    <div className="max-h-52 divide-y overflow-y-auto">
      {props.values.map((value) => {
        const key = buildMetadataValueKey(value);
        const disabled = props.pendingMetadataKey !== null;
        const checkbox = (
          <Checkbox
            checked={value.isBlocked}
            disabled={disabled}
            labelProps={{
              className:
                'flex min-w-0 cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/50',
            }}
            size="sm"
            onCheckedChange={(checked) =>
              props.onMetadataValueChange(value, checked === true)
            }
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {value.value}
            </span>
            <Badge size="xs" variant="secondary">
              {value.count}
            </Badge>
          </Checkbox>
        );

        return (
          <WithPermissions
            key={key}
            fallback={
              <Checkbox
                checked={value.isBlocked}
                disabled
                labelProps={{ className: 'px-3 py-2' }}
                size="sm"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {value.value}
                </span>
                <Badge size="xs" variant="secondary">
                  {value.count}
                </Badge>
              </Checkbox>
            }
            loadingFallback={null}
            permissions={[permissionProvider.update]}
          >
            {checkbox}
          </WithPermissions>
        );
      })}
    </div>
  </div>
);
